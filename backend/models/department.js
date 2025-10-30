'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      // Department has many Employees
      Department.hasMany(models.Employee, {
        foreignKey: 'department_id',
        as: 'employees'
      });

      // Department has many Operations
      Department.hasMany(models.Operation, {
        foreignKey: 'department_id',
        as: 'operations'
      });
    }
  }

  Department.init({
    department_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    department_name: {
      type: DataTypes.ENUM("management", 'production', 'testing', 'qa'),
      allowNull: false,
      unique: true
    }
  }, {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['department_name']
      }
    ]
  });

  return Department;
};

