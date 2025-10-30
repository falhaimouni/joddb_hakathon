const express = require('express');
const router = express.Router();
const supervisorController = require('../controllers/supervisorController');
const { authenticate, supervisorOrAdmin } = require('../middleware/auth');

// All supervisor routes require authentication and supervisor/admin role
router.use(authenticate);
router.use(supervisorOrAdmin);

// Work entry review
router.get('/entries/pending', supervisorController.getPendingEntries);
router.get('/entries', supervisorController.getAllWorkEntries);
router.get('/entries/:id', supervisorController.getWorkEntryById);

// Approval actions
router.post('/entries/:id/approve', supervisorController.approveEntry);
router.post('/entries/:id/reject', supervisorController.rejectEntry);
router.post('/entries/:id/cancel-approval', supervisorController.cancelApproval);

// Dashboard
router.get('/dashboard', supervisorController.getDashboard);

// Technician performance
router.get('/technicians/:id/performance', supervisorController.getTechnicianPerformance);

module.exports = router;

