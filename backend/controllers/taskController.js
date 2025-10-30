const { Task, Employee, Product, Operation, RejectedTasks, ValidTasks } = require('../models');

exports.getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: { exclude: ['password'] }
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ],
      order: [['startTime', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: { exclude: ['password'] }
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ]
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const employeeId = req.employee.employee_id;
    const tasks = await Task.findAll({
      where: { employee_id: employeeId },
      include: [
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ],
      order: [['startTime', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      employee_id: req.employee.employee_id
    };
    
    const task = await Task.create(taskData);
    const taskWithDetails = await Task.findByPk(task.task_id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: { exclude: ['password'] }
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ]
    });
    res.status(201).json(taskWithDetails);
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [updated] = await Task.update(req.body, {
      where: { task_id: id }
    });
    
    if (!updated) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: { exclude: ['password'] }
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ]
    });
    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Task.destroy({
      where: { task_id: id }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Supervisor actions
exports.getPendingTasks = async (req, res, next) => {
  try {
    const isSupervisor = req.employee?.role === 'supervisor';
    const baseInclude = [
      {
        model: Employee,
        as: 'employee',
        attributes: { exclude: ['password'] }
      },
      {
        model: Product,
        as: 'product'
      },
      {
        model: Operation,
        as: 'operation'
      }
    ];

    let tasks;
    if (isSupervisor) {
      // Limit to same department as supervisor
      tasks = await Task.findAll({
        where: { validationStatus: 'pending' },
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: { exclude: ['password'] },
            where: { department_id: req.employee.department_id },
            required: true
          },
          ...baseInclude.slice(1)
        ],
        order: [['startTime', 'DESC']]
      });
    } else {
      tasks = await Task.findAll({
        where: { validationStatus: 'pending' },
        include: baseInclude,
        order: [['startTime', 'DESC']]
      });
    }

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

exports.validateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (task.validationStatus !== 'pending') {
      return res.status(400).json({ message: 'Task is not pending validation' });
    }
    
    await task.update({ validationStatus: 'validated' });
    
    // Update valid tasks count
    const [validTasks] = await ValidTasks.findOrCreate({
      where: { employee_id: task.employee_id },
      defaults: { validTasksNumber: 0 }
    });
    await validTasks.increment('validTasksNumber');
    
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: { exclude: ['password'] }
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ]
    });
    
    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

exports.rejectTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (task.validationStatus !== 'pending') {
      return res.status(400).json({ message: 'Task is not pending validation' });
    }
    
    await task.update({ validationStatus: 'rejected' });
    
    // Update rejected tasks count
    const [rejectedTasks] = await RejectedTasks.findOrCreate({
      where: { employee_id: task.employee_id },
      defaults: { rejectedTasksNumber: 0 }
    });
    await rejectedTasks.increment('rejectedTasksNumber');
    
    const updatedTask = await Task.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: { exclude: ['password'] }
        },
        {
          model: Product,
          as: 'product'
        },
        {
          model: Operation,
          as: 'operation'
        }
      ]
    });
    
    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

// Supervisor: list tasks in own department with optional filters
exports.getDepartmentTasks = async (req, res, next) => {
  try {
    const { startDate, endDate, username, status } = req.query;
    const where = {};
    if (status) {
      where.validationStatus = status;
    }
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime['$gte'] = new Date(startDate + 'T00:00:00Z');
      if (endDate) where.startTime['$lte'] = new Date(endDate + 'T23:59:59Z');
    }

    const employeeInclude = {
      model: Employee,
      as: 'employee',
      attributes: { exclude: ['password'] },
      where: { department_id: req.employee.department_id },
      required: true
    };
    if (username) {
      employeeInclude.where.username = username;
    }

    const tasks = await Task.findAll({
      where,
      include: [
        employeeInclude,
        { model: Product, as: 'product' },
        { model: Operation, as: 'operation' }
      ],
      order: [['startTime', 'DESC']]
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

