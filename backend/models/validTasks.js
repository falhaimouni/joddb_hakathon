'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ValidTasks extends Model {
    static associate(models) {
      // ValidTasks belongs to Employee
      ValidTasks.belongsTo(models.Employee, {
        foreignKey: 'employee_id',
        as: 'employee'
      });
    }
  }
  
  ValidTasks.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employee_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'employees',
        key: 'employee_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    validTasksNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'ValidTasks',
    tableName: 'valid_tasks',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['employee_id']
      }
    ]
  });
  
  return ValidTasks;
};

