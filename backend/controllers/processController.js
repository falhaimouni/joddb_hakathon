const { Process, Product, Operations, Employee } = require('../models');

exports.getAllProcesses = async (req, res, next) => {
  try {
    const processes = await Process.findAll({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name', 'status'],
          include: [{
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employee_code']
          }]
        },
        {
          model: Operations,
          as: 'operations',
          attributes: ['operation_id', 'operation_name', 'operation_order', 'status']
        }
      ],
      order: [
        ['stage_order', 'ASC'],
        [Operations, 'operation_order', 'ASC']
      ]
    });
    res.status(200).json(processes);
  } catch (error) {
    next(error);
  }
};

exports.getProcessById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const process = await Process.findByPk(id, {
      include: [
        {
          model: Product,
          as: 'product',
          include: [{
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employee_code', 'role']
          }]
        },
        {
          model: Operations,
          as: 'operations',
          order: [['operation_order', 'ASC']]
        }
      ]
    });
    
    if (!process) {
      return res.status(404).json({ message: 'Process not found' });
    }
    
    res.status(200).json(process);
  } catch (error) {
    next(error);
  }
};

exports.getProcessesByProductId = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const processes = await Process.findAll({
      where: { product_id: productId },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name']
        },
        {
          model: Operations,
          as: 'operations',
          order: [['operation_order', 'ASC']]
        }
      ],
      order: [['stage_order', 'ASC']]
    });
    
    res.status(200).json(processes);
  } catch (error) {
    next(error);
  }
};

exports.createProcess = async (req, res, next) => {
  try {
    // Note: Processes should be auto-created when Product is created
    // This endpoint is mainly for manual process creation if needed
    const { product_id, stage } = req.body;
    
    if (!product_id || !stage) {
      return res.status(400).json({
        message: 'Product ID and stage are required'
      });
    }
    
    // Check if product exists (BEFORE attempting insert)
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({
        message: `Product with ID ${product_id} not found`
      });
    }
    
    // Check if process already exists for this product + stage (BEFORE attempting insert)
    const existingProcess = await Process.findOne({
      where: {
        product_id: product_id,
        stage: stage
      }
    });
    if (existingProcess) {
      return res.status(400).json({
        message: `Process with stage '${stage}' already exists for this product`
      });
    }
    
    const process = await Process.create(req.body);
    
    const processWithDetails = await Process.findByPk(process.process_id, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['product_id', 'product_code', 'product_name']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Process created successfully',
      process: processWithDetails
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProcess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [updated] = await Process.update(req.body, {
      where: { process_id: id }
    });
    
    if (!updated) {
      return res.status(404).json({ message: 'Process not found' });
    }
    
    const updatedProcess = await Process.findByPk(id);
    res.status(200).json(updatedProcess);
  } catch (error) {
    next(error);
  }
};

exports.deleteProcess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Process.destroy({
      where: { process_id: id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Process not found' });
    }
    
    res.status(200).json({ message: 'Process deleted successfully' });
  } catch (error) {
    next(error);
  }
};