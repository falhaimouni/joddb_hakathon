'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    await queryInterface.bulkInsert('products', [
      {
        serialnumber: 'PRD-001',
        productname: 'Product Alpha',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        serialnumber: 'PRD-002',
        productname: 'Product Beta',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        serialnumber: 'PRD-003',
        productname: 'Product Gamma',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        serialnumber: 'PRD-004',
        productname: 'Product Delta',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        serialnumber: 'PRD-005',
        productname: 'Product Epsilon',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('products', null, {});
  }
};

