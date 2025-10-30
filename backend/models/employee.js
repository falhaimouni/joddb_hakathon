'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Employee extends Model {
    static associate(models) {
      // Employee belongs to Department
      Employee.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
      });

      // Employee has many Tasks
      Employee.hasMany(models.Task, {
        foreignKey: 'employee_id',
        as: 'tasks'
      });

      // Employee has one RejectedTasks
      Employee.hasOne(models.RejectedTasks, {
        foreignKey: 'employee_id',
        as: 'rejectedTasks'
      });

      // Employee has one ValidTasks
      Employee.hasOne(models.ValidTasks, {
        foreignKey: 'employee_id',
        as: 'validTasks'
      });
    }

    // Method to compare password
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }

  Employee.init({
    employee_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 100]
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'planner', 'supervisor', 'technicien'),
      allowNull: false,
      defaultValue: 'technicien'
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'department_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }
  }, {
    sequelize,
    modelName: 'Employee',
    tableName: 'employees',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['username']
      },
      {
        fields: ['role']
      },
      {
        fields: ['department_id']
      }
    ],
    hooks: {
      // Hash password before creating employee
      beforeCreate: async (employee) => {
        if (employee.password) {
          const salt = await bcrypt.genSalt(10);
          employee.password = await bcrypt.hash(employee.password, salt);
        }
      },
      // Hash password before updating if password changed
      beforeUpdate: async (employee) => {
        if (employee.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          employee.password = await bcrypt.hash(employee.password, salt);
        }
      }
    }
  });

  return Employee;
};
