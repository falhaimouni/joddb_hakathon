'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tasks', {
      task_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tasktype: {
        type: Sequelize.ENUM('break', 'working', 'blocked'),
        allowNull: false,
        defaultValue: 'working'
      },
      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Duration in minutes (calculated as endTime - startTime)'
      },
      finished_operations: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of finished operations (for same operation)'
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Can be null for break/blocked tasks
        references: {
          model: 'products',
          key: 'product_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      operation_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Can be null for break/blocked tasks
        references: {
          model: 'operations',
          key: 'operation_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      validationStatus: {
        type: Sequelize.ENUM('validated', 'pending', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees',
          key: 'employee_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('tasks', ['employee_id']);
    await queryInterface.addIndex('tasks', ['product_id']);
    await queryInterface.addIndex('tasks', ['operation_id']);
    await queryInterface.addIndex('tasks', ['tasktype']);
    await queryInterface.addIndex('tasks', ['validationStatus']);
    await queryInterface.addIndex('tasks', ['startTime']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tasks');
  }
};

