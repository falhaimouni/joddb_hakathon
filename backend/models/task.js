'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Task extends Model {
    static associate(models) {
      // Task belongs to Employee
      Task.belongsTo(models.Employee, {
        foreignKey: 'employee_id',
        as: 'employee'
      });
      
      // Task belongs to Product
      Task.belongsTo(models.Product, {
        foreignKey: 'product_id',
        as: 'product'
      });
      
      // Task belongs to Operation
      Task.belongsTo(models.Operation, {
        foreignKey: 'operation_id',
        as: 'operation'
      });
    }
  }
  
  Task.init({
    task_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tasktype: {
      type: DataTypes.ENUM('break', 'working', 'blocked'),
      allowNull: false,
      defaultValue: 'working'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Duration in minutes (calculated as endTime - startTime)',
      validate: {
        min: 0
      }
    },
    finished_operations: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of finished operations (for same operation)',
      validate: {
        min: 0
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null for break/blocked tasks
      references: {
        model: 'products',
        key: 'product_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    operation_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Can be null for break/blocked tasks
      references: {
        model: 'operations',
        key: 'operation_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    validationStatus: {
      type: DataTypes.ENUM('validated', 'pending', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'employees',
        key: 'employee_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    timestamps: true,
    indexes: [
      {
        fields: ['employee_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['operation_id']
      },
      {
        fields: ['tasktype']
      },
      {
        fields: ['validationStatus']
      },
      {
        fields: ['startTime']
      }
    ],
    hooks: {
      // Calculate duration before creating/updating
      beforeCreate: async (task) => {
        if (task.startTime && task.endTime) {
          const start = new Date(task.startTime);
          const end = new Date(task.endTime);
          task.duration = Math.round((end - start) / (1000 * 60)); // Convert to minutes
        }
      },
      beforeUpdate: async (task) => {
        if (task.changed('startTime') || task.changed('endTime')) {
          const start = new Date(task.startTime);
          const end = new Date(task.endTime);
          task.duration = Math.round((end - start) / (1000 * 60));
        }
      }
    }
  });
  
  return Task;
};

