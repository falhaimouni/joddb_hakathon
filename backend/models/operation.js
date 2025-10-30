'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Operation extends Model {
    static associate(models) {
      // Operation belongs to Department
      Operation.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
      });
      
      // Operation has many Tasks
      Operation.hasMany(models.Task, {
        foreignKey: 'operation_id',
        as: 'tasks'
      });
    }
  }
  
  Operation.init({
    operation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'department_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    minimum_per_min: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Minimum number of operations that should be done per minute (set by planner)',
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'Operation',
    tableName: 'operations',
    timestamps: true,
    indexes: [
      {
        fields: ['department_id']
      },
      {
        fields: ['name']
      }
    ]
  });
  
  return Operation;
};

