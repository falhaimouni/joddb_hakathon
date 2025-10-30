const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, adminOnly } = require('../middleware/auth');

// All department routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartmentById);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;

