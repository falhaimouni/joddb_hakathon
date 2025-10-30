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
    
    // Get department IDs
    const [departments] = await queryInterface.sequelize.query(
      "SELECT department_id, department_name FROM departments"
    );
    
    const deptMap = {};
    departments.forEach(dept => {
      deptMap[dept.department_name] = dept.department_id;
    });

    await queryInterface.bulkInsert('operations', [
      // Management Operations
      {
        name: 'Project Planning',
        department_id: deptMap['management'],
        minimum_per_min: 0.1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Resource Allocation',
        department_id: deptMap['management'],
        minimum_per_min: 0.15,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Quality Review',
        department_id: deptMap['management'],
        minimum_per_min: 0.12,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Production Operations
      {
        name: 'Assembly',
        department_id: deptMap['production'],
        minimum_per_min: 2.5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Welding',
        department_id: deptMap['production'],
        minimum_per_min: 1.8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Packaging',
        department_id: deptMap['production'],
        minimum_per_min: 3.0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Labeling',
        department_id: deptMap['production'],
        minimum_per_min: 4.0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Material Preparation',
        department_id: deptMap['production'],
        minimum_per_min: 2.0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // Testing Operations
      {
        name: 'Functional Testing',
        department_id: deptMap['testing'],
        minimum_per_min: 1.5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Stress Testing',
        department_id: deptMap['testing'],
        minimum_per_min: 1.2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Performance Testing',
        department_id: deptMap['testing'],
        minimum_per_min: 1.0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Unit Testing',
        department_id: deptMap['testing'],
        minimum_per_min: 2.0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      
      // QA Operations
      {
        name: 'Final Inspection',
        department_id: deptMap['qa'],
        minimum_per_min: 1.8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Documentation Review',
        department_id: deptMap['qa'],
        minimum_per_min: 1.5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Compliance Check',
        department_id: deptMap['qa'],
        minimum_per_min: 1.2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Safety Verification',
        department_id: deptMap['qa'],
        minimum_per_min: 1.0,
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
    await queryInterface.bulkDelete('operations', null, {});
  }
};

