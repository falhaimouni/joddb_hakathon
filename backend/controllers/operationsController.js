const { Operations, Process, Product, Employee, ProductionLevel } = require('../models');

exports.getAllOperations = async (req, res, next) => {
  try {
    // Check if user is a Technician and filter by their department
    const isTechnician = req.employee && req.employee.role === 'Technician';
    const technicianDepartment = isTechnician && req.employee.department ? req.employee.department : null;
    
    const operations = await Operations.findAll({
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order', 'status'],
          where: technicianDepartment ? { stage: technicianDepartment } : {},  // Filter for technicians
          required: !!technicianDepartment,  // INNER JOIN only if filtering, otherwise LEFT JOIN
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

exports.getOperationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operation = await Operations.findByPk(id, {
      include: [
        {
          model: Process,
          as: 'process',
          include: [{
            model: Product,
            as: 'product',
            include: [{
              model: Employee,
              as: 'employee',
              attributes: ['id', 'employee_code']
            }]
          }]
        },
        {
          model: ProductionLevel,
          as: 'level',
          attributes: ['level_id', 'level_name', 'level_order', 'description']
        }
      ]
    });
    
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    
    res.status(200).json(operation);
  } catch (error) {
    next(error);
  }
};

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

exports.updateOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [updated] = await Operations.update(req.body, {
      where: { operation_id: id }
    });
    
    if (!updated) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    
    const updatedOperation = await Operations.findByPk(id, {
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order']
        },
        {
          model: ProductionLevel,
          as: 'level',
          attributes: ['level_id', 'level_name', 'level_order']
        }
      ]
    });
    
    res.status(200).json({
      message: 'Operation updated successfully',
      operation: updatedOperation
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Operations.destroy({
      where: { operation_id: id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    
    res.status(200).json({ message: 'Operation deleted successfully' });
  } catch (error) {
    next(error);
  }
};