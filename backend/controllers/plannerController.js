const { Product, Operations, Process, JobOrder, Employee, ProductionLevel } = require('../models');
const { getDashboardStats, getJobOrderProgress } = require('../utils/statistics');

/**
 * Create new product with code and name (3 processes auto-created)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { product_code, product_name, description, status } = req.body;
    
    if (!product_code || !product_name) {
      return res.status(400).json({ 
        message: 'Product code and product name are required' 
      });
    }
    
    // Check if product_code already exists (BEFORE attempting insert)
    const existingProduct = await Product.findOne({ where: { product_code } });
    if (existingProduct) {
      return res.status(400).json({
        message: `Product code '${product_code}' already exists`
      });
    }
    
    const product = await Product.create({
      product_code,
      product_name,
      description,
      status: status || 'active',
      employee_id: req.employee.id
    });
    
    // Fetch product with auto-created processes and production levels
    const productWithProcesses = await Product.findByPk(product.product_id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employee_code', 'role']
        },
        {
          model: Process,
          as: 'processes',
          attributes: ['process_id', 'stage', 'stage_order', 'status'],
          include: [
            {
              model: ProductionLevel,
              as: 'levels',
              attributes: ['level_id', 'level_name', 'level_order', 'description', 'status'],
              order: [['level_order', 'ASC']]
            }
          ],
          order: [['stage_order', 'ASC']]
        }
      ]
    });
    
    res.status(201).json({
      message: 'Product created successfully with 3 processes (Production with 3 levels, Testing, QA)',
      product: productWithProcesses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all products
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employee_code', 'role']
        },
        {
          model: Process,
          as: 'processes',
          attributes: ['process_id', 'stage', 'stage_order', 'status'],
          include: [
            {
              model: ProductionLevel,
              as: 'levels',
              attributes: ['level_id', 'level_name', 'level_order', 'status'],
              include: [{
                model: Operations,
                as: 'operations',
                attributes: ['operation_id', 'operation_name', 'operation_order', 'status']
              }]
            },
            {
              model: Operations,
              as: 'operations',
              attributes: ['operation_id', 'operation_name', 'operation_order', 'status', 'level_id']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 */
exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id, {
      include: [
        {
          model: Process,
          as: 'processes',
          include: [
            {
              model: ProductionLevel,
              as: 'levels',
              attributes: ['level_id', 'level_name', 'level_order', 'description', 'status'],
              include: [{
                model: Operations,
                as: 'operations',
                order: [['operation_order', 'ASC']]
              }]
            },
            {
              model: Operations,
              as: 'operations',
              include: [{
                model: ProductionLevel,
                as: 'level',
                attributes: ['level_id', 'level_name', 'level_order']
              }],
              order: [['operation_order', 'ASC']]
            }
          ],
          order: [['stage_order', 'ASC']]
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'employee_code', 'role']
        }
      ]
    });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * Create operation for a process (optionally for a production level)
 */
exports.createOperation = async (req, res, next) => {
  try {
    const { process_id, level_id, operation_name, description, minimum_time_minutes, minimum_output_count } = req.body;
    
    if (!process_id || !operation_name) {
      return res.status(400).json({ 
        message: 'Process ID and operation name are required' 
      });
    }
    
    // Verify process exists
    const process = await Process.findByPk(process_id);
    if (!process) {
      return res.status(404).json({ message: 'Process not found' });
    }
    
    // If level_id is provided, verify it exists and belongs to this process
    if (level_id) {
      const level = await ProductionLevel.findByPk(level_id);
      if (!level) {
        return res.status(404).json({ message: 'Production level not found' });
      }
      if (level.process_id !== process_id) {
        return res.status(400).json({ 
          message: 'Production level does not belong to this process' 
        });
      }
      
      // For Production process, level_id is recommended but not required
      if (process.stage === 'Production') {
        console.log(`Operation assigned to level ${level_id} in Production process`);
      }
    }
    
    // If this is a Production process but no level_id, warn
    if (process.stage === 'Production' && !level_id) {
      console.warn('Creating operation in Production process without a level_id');
    }
    
    // Check if operation_name already exists for this process (BEFORE attempting insert)
    const existingOperation = await Operations.findOne({
      where: {
        process_id: process_id,
        operation_name: operation_name
      }
    });
    if (existingOperation) {
      return res.status(400).json({
        message: `Operation '${operation_name}' already exists for this process`
      });
    }
    
    // Auto-calculate next operation_order for this process (or level if specified)
    const whereClause = { process_id: process_id };
    if (level_id) {
      whereClause.level_id = level_id;
    }
    
    const maxOrder = await Operations.max('operation_order', {
      where: whereClause
    });
    const nextOrder = (maxOrder || 0) + 1;
    
    const operation = await Operations.create({
      process_id,
      level_id: level_id || null,
      operation_name,
      operation_order: nextOrder,
      description,
      minimum_time_minutes: minimum_time_minutes || 0,
      minimum_output_count: minimum_output_count || 0,
      status: 'pending'
    });
    
    // Fetch operation with full details
    const operationWithDetails = await Operations.findByPk(operation.operation_id, {
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order'],
          include: [{
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name']
          }]
        },
        {
          model: ProductionLevel,
          as: 'level',
          attributes: ['level_id', 'level_name', 'level_order']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Operation created successfully',
      operation: operationWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create job order
 */
exports.createJobOrder = async (req, res, next) => {
  try {
    const {
      order_number,
      order_type,
      product_id,
      target_quantity,
      start_date,
      due_date,
      priority,
      notes
    } = req.body;
    
    // Validate required fields
    if (!order_number || !product_id || !target_quantity || !start_date || !due_date) {
      return res.status(400).json({ 
        message: 'Order number, product ID, target quantity, start date, and due date are required' 
      });
    }
    
    // Validate order_type if provided
    if (order_type && !['production', 'maintenance', 'inspection'].includes(order_type)) {
      return res.status(400).json({
        message: 'Order type must be one of: production, maintenance, inspection'
      });
    }
    
    // Validate priority if provided
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        message: 'Priority must be one of: low, medium, high, urgent'
      });
    }
    
    // Validate target_quantity is positive
    if (target_quantity <= 0) {
      return res.status(400).json({
        message: 'Target quantity must be greater than 0'
      });
    }
    
    // Check if order_number already exists (BEFORE attempting insert)
    const existingOrder = await JobOrder.findOne({ where: { order_number } });
    if (existingOrder) {
      return res.status(400).json({
        message: `Order number '${order_number}' already exists`
      });
    }
    
    // Check if product exists (BEFORE attempting insert)
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        message: `Product with ID ${product_id} not found`
      });
    }
    
    // All validations passed - now create the job order
    const jobOrder = await JobOrder.create({
      order_number,
      order_type: order_type || 'production',
      product_id,
      planner_id: req.employee.id,
      target_quantity,
      completed_quantity: 0,
      start_date,
      due_date,
      status: 'planned',
      priority: priority || 'medium',
      notes
    });
    
    res.status(201).json({
      message: 'Job order created successfully',
      jobOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all job orders
 */
exports.getAllJobOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    
    const jobOrders = await JobOrder.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name']
        },
        {
          model: Employee,
          as: 'planner',
          attributes: ['id', 'employee_code', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json(jobOrders);
  } catch (error) {
    next(error);
  }
};

/**
 * Update job order
 */
exports.updateJobOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const jobOrder = await JobOrder.findByPk(id);
    
    if (!jobOrder) {
      return res.status(404).json({ message: 'Job order not found' });
    }
    
    await jobOrder.update(updateData);
    
    res.status(200).json({
      message: 'Job order updated successfully',
      jobOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get job order progress
 */
exports.getJobOrderProgressById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const progress = await getJobOrderProgress(id);
    
    res.status(200).json(progress);
  } catch (error) {
    next(error);
  }
};

/**
 * Get planner dashboard with statistics
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, product_id } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (product_id) filters.product_id = product_id;
    
    const stats = await getDashboardStats(filters);
    
    // Get job orders summary
    const jobOrdersSummary = await JobOrder.findAll({
      attributes: [
        'status',
        [JobOrder.sequelize.fn('COUNT', JobOrder.sequelize.col('job_order_id')), 'count'],
        [JobOrder.sequelize.fn('SUM', JobOrder.sequelize.col('target_quantity')), 'total_target'],
        [JobOrder.sequelize.fn('SUM', JobOrder.sequelize.col('completed_quantity')), 'total_completed']
      ],
      group: ['status'],
      raw: true
    });
    
    res.status(200).json({
      statistics: stats,
      jobOrdersSummary,
      generatedAt: new Date()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all operations
 */
exports.getAllOperations = async (req, res, next) => {
  try {
    const operations = await Operations.findAll({
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order'],
          include: [{
            model: Product,
            as: 'product',
            attributes: ['product_id', 'product_code', 'product_name']
          }]
        },
        {
          model: ProductionLevel,
          as: 'level',
          attributes: ['level_id', 'level_name', 'level_order']
        }
      ],
      order: [['operation_order', 'ASC']]
    });
    
    res.status(200).json(operations);
  } catch (error) {
    next(error);
  }
};

