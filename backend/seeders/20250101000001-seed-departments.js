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
    await queryInterface.bulkInsert('departments', [
      {
        department_id: 1,
        department_name: 'management',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        department_id: 2,
        department_name: 'production',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        department_id: 3,
        department_name: 'testing',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        department_id: 4,
        department_name: 'qa',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});

    // Reset auto-increment sequence for PostgreSQL
    await queryInterface.sequelize.query("SELECT setval('departments_department_id_seq', (SELECT MAX(department_id) FROM departments));");
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('departments', null, {});
  }
};

