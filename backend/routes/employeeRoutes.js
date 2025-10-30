const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');

// Public endpoint - no auth required
router.post('/login', employeeController.loginEmployee);

// Protected endpoints - require authentication
router.get('/profile', authenticate, employeeController.getEmployeeProfile);

// NOTE: User management (create, update, delete) is handled by Admin routes
// See /api/admin/users for user management operations

module.exports = router;