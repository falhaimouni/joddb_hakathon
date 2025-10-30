const { ProductionLevel, Process, Product, Operations } = require('../models');

/**
 * Create a new production level for a process
 */
exports.createProductionLevel = async (req, res, next) => {
  try {
    const { process_id, level_name, description } = req.body;

    if (!process_id || !level_name) {
      return res.status(400).json({
        message: 'Process ID and level name are required'
      });
    }

    // Verify process exists and is a Production process
    const process = await Process.findByPk(process_id);
    if (!process) {
      return res.status(404).json({ message: 'Process not found' });
    }

    if (process.stage !== 'Production') {
      return res.status(400).json({
        message: 'Production levels can only be created for Production processes'
      });
    }

    // Check if level_name already exists for this process (BEFORE attempting insert)
    const existingLevel = await ProductionLevel.findOne({
      where: {
        process_id: process_id,
        level_name: level_name
      }
    });
    if (existingLevel) {
      return res.status(400).json({
        message: `Production level '${level_name}' already exists for this process`
      });
    }

    // Auto-increment level_order
    const maxOrder = await ProductionLevel.max('level_order', {
      where: { process_id: process_id }
    });
    const nextOrder = (maxOrder || 0) + 1;

    const level = await ProductionLevel.create({
      process_id,
      level_name,
      level_order: nextOrder,
      description,
      status: 'pending'
    });

    const levelWithDetails = await ProductionLevel.findByPk(level.level_id, {
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['product_id', 'product_code', 'product_name']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      message: 'Production level created successfully',
      level: levelWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all production levels
 */
exports.getAllProductionLevels = async (req, res, next) => {
  try {
    const levels = await ProductionLevel.findAll({
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['product_id', 'product_code', 'product_name']
            }
          ]
        },
        {
          model: Operations,
          as: 'operations',
          attributes: ['operation_id', 'operation_name', 'operation_order', 'status']
        }
      ],
      order: [['level_order', 'ASC']]
    });

    res.status(200).json({
      message: 'Production levels retrieved successfully',
      count: levels.length,
      levels
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get production level by ID
 */
exports.getProductionLevelById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const level = await ProductionLevel.findByPk(id, {
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['product_id', 'product_code', 'product_name']
            }
          ]
        },
        {
          model: Operations,
          as: 'operations',
          attributes: ['operation_id', 'operation_name', 'operation_order', 'description', 'minimum_time_minutes', 'minimum_output_count', 'status'],
          order: [['operation_order', 'ASC']]
        }
      ]
    });

    if (!level) {
      return res.status(404).json({ message: 'Production level not found' });
    }

    res.status(200).json({
      message: 'Production level retrieved successfully',
      level
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all production levels for a specific process
 */
exports.getLevelsByProcessId = async (req, res, next) => {
  try {
    const { processId } = req.params;

    const process = await Process.findByPk(processId);
    if (!process) {
      return res.status(404).json({ message: 'Process not found' });
    }

    const levels = await ProductionLevel.findAll({
      where: { process_id: processId },
      include: [
        {
          model: Operations,
          as: 'operations',
          attributes: ['operation_id', 'operation_name', 'operation_order', 'status']
        }
      ],
      order: [['level_order', 'ASC']]
    });

    res.status(200).json({
      message: 'Production levels retrieved successfully',
      process: {
        process_id: process.process_id,
        stage: process.stage,
        stage_order: process.stage_order
      },
      count: levels.length,
      levels
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a production level
 */
exports.updateProductionLevel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { level_name, description, status } = req.body;

    const level = await ProductionLevel.findByPk(id);
    if (!level) {
      return res.status(404).json({ message: 'Production level not found' });
    }

    await level.update({
      level_name: level_name || level.level_name,
      description: description !== undefined ? description : level.description,
      status: status || level.status
    });

    const updatedLevel = await ProductionLevel.findByPk(id, {
      include: [
        {
          model: Process,
          as: 'process',
          attributes: ['process_id', 'stage', 'stage_order'],
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['product_id', 'product_code', 'product_name']
            }
          ]
        },
        {
          model: Operations,
          as: 'operations',
          attributes: ['operation_id', 'operation_name', 'operation_order', 'status']
        }
      ]
    });

    res.status(200).json({
      message: 'Production level updated successfully',
      level: updatedLevel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a production level
 */
exports.deleteProductionLevel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const level = await ProductionLevel.findByPk(id, {
      include: [
        {
          model: Operations,
          as: 'operations'
        }
      ]
    });

    if (!level) {
      return res.status(404).json({ message: 'Production level not found' });
    }

    // Check if level has operations
    if (level.operations && level.operations.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete level with existing operations. Delete operations first or they will be set to NULL.',
        operationsCount: level.operations.length
      });
    }

    await level.destroy();

    res.status(200).json({
      message: 'Production level deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

