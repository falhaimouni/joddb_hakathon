const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, adminOnly } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminOnly);

// Password generation
router.get('/generate-password', adminController.generatePassword);

// User management
router.post('/users', adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Password reset
router.post('/users/:id/reset-password', adminController.resetPassword);

// System statistics
router.get('/stats', adminController.getSystemStats);
router.get('/stats/employees', adminController.getEmployeesStats);

module.exports = router;

