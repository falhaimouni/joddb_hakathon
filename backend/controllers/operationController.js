const { Operation, Department, Task } = require('../models');

exports.getAllOperations = async (req, res, next) => {
  try {
    const operations = await Operation.findAll({
      include: [
        {
          model: Department,
          as: 'department'
        },
        {
          model: Task,
          as: 'tasks'
        }
      ]
    });
    res.status(200).json(operations);
  } catch (error) {
    next(error);
  }
};

exports.getOperationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const operation = await Operation.findByPk(id, {
      include: [
        {
          model: Department,
          as: 'department'
        },
        {
          model: Task,
          as: 'tasks'
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
    const operation = await Operation.create(req.body);
    const operationWithDetails = await Operation.findByPk(operation.operation_id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    res.status(201).json(operationWithDetails);
  } catch (error) {
    next(error);
  }
};

exports.updateOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [updated] = await Operation.update(req.body, {
      where: { operation_id: id }
    });
    
    if (!updated) {
      return res.status(404).json({ message: 'Operation not found' });
    }
    
    const updatedOperation = await Operation.findByPk(id, {
      include: [{
        model: Department,
        as: 'department'
      }]
    });
    res.status(200).json(updatedOperation);
  } catch (error) {
    next(error);
  }
};

exports.deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Operation.destroy({
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

