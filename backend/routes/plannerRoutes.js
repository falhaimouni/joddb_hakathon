const express = require('express');
const router = express.Router();
const plannerController = require('../controllers/plannerController');
const productionLevelController = require('../controllers/productionLevelController');
const notificationController = require('../controllers/notificationController');
const { authenticate, plannerOrAdmin, adminOnly } = require('../middleware/auth');

// All planner routes require authentication and planner/admin role
router.use(authenticate);
router.use(plannerOrAdmin);

// Product management
// Only Admin can create products
router.post('/products', adminOnly, plannerController.createProduct);
router.get('/products', plannerController.getAllProducts);
router.get('/products/:id', plannerController.getProductById);

// Production Levels management (for Production process)
router.post('/production-levels', productionLevelController.createProductionLevel);
router.get('/production-levels', productionLevelController.getAllProductionLevels);
router.get('/production-levels/:id', productionLevelController.getProductionLevelById);
router.get('/production-levels/process/:processId', productionLevelController.getLevelsByProcessId);
router.put('/production-levels/:id', productionLevelController.updateProductionLevel);
router.delete('/production-levels/:id', productionLevelController.deleteProductionLevel);

// Operations management
router.post('/operations', plannerController.createOperation);
router.get('/operations', plannerController.getAllOperations);

// Job orders
router.post('/job-orders', plannerController.createJobOrder);
router.get('/job-orders', plannerController.getAllJobOrders);
router.put('/job-orders/:id', plannerController.updateJobOrder);
router.get('/job-orders/:id/progress', plannerController.getJobOrderProgressById);

// Dashboard
router.get('/dashboard', plannerController.getDashboard);

// Notifications
router.get('/notifications', notificationController.getMyNotifications);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.post('/notifications/:id/read', notificationController.markAsRead);
router.post('/notifications/read-all', notificationController.markAllAsRead);

module.exports = router;

