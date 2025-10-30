'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RejectedTasks extends Model {
    static associate(models) {
      // RejectedTasks belongs to Employee
      RejectedTasks.belongsTo(models.Employee, {
        foreignKey: 'employee_id',
        as: 'employee'
      });
    }
  }
  
  RejectedTasks.init({
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
    rejectedTasksNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'RejectedTasks',
    tableName: 'rejected_tasks',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['employee_id']
      }
    ]
  });
  
  return RejectedTasks;
};

