const { Department, Employee, Operation } = require('../models');

exports.getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: { exclude: ['password'] }
        },
        {
          model: Operation,
          as: 'operations'
        }
      ]
    });
    res.status(200).json(departments);
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employees',
          attributes: { exclude: ['password'] }
        },
        {
          model: Operation,
          as: 'operations'
        }
      ]
    });
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.status(200).json(department);
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { department_name } = req.body;
    
    // Validate department_name
    const allowedDepartments = ['management', 'production', 'testing', 'qa'];
    if (!allowedDepartments.includes(department_name)) {
      return res.status(400).json({ 
        message: `Department name must be one of: ${allowedDepartments.join(', ')}` 
      });
    }
    
    const department = await Department.create(req.body);
    res.status(201).json(department);
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { department_name } = req.body;
    
    // Validate department_name if provided
    if (department_name) {
      const allowedDepartments = ['management', 'production', 'testing', 'qa'];
      if (!allowedDepartments.includes(department_name)) {
        return res.status(400).json({ 
          message: `Department name must be one of: ${allowedDepartments.join(', ')}` 
        });
      }
    }
    
    const [updated] = await Department.update(req.body, {
      where: { department_id: id }
    });
    
    if (!updated) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    const updatedDepartment = await Department.findByPk(id);
    res.status(200).json(updatedDepartment);
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Department.destroy({
      where: { department_id: id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    next(error);
  }
};

