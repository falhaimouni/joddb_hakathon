const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, supervisorOrAdmin, technicianOrAbove, plannerOrAdmin } = require('../middleware/auth');

// All task routes require authentication
router.use(authenticate);

// Technician endpoints - get and create their own tasks
router.get('/my-tasks', taskController.getMyTasks);
router.post('/', taskController.createTask);

// Supervisor endpoints - manage all tasks
router.get('/pending', supervisorOrAdmin, taskController.getPendingTasks);
router.post('/:id/validate', supervisorOrAdmin, taskController.validateTask);
router.post('/:id/reject', supervisorOrAdmin, taskController.rejectTask);
router.get('/department', supervisorOrAdmin, taskController.getDepartmentTasks);

// Admin/Planner endpoints - view all tasks
router.get('/', plannerOrAdmin, taskController.getAllTasks);
router.get('/:id', plannerOrAdmin, taskController.getTaskById);
router.put('/:id', technicianOrAbove, taskController.updateTask);
router.delete('/:id', technicianOrAbove, taskController.deleteTask);

module.exports = router;

