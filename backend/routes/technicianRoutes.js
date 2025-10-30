const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const notificationController = require('../controllers/notificationController');
const { authenticate, technicianOrAbove } = require('../middleware/auth');

// All technician routes require authentication
router.use(authenticate);
router.use(technicianOrAbove);

// Unified time entries (work, break, leave)
router.post('/time-entries', technicianController.createTimeEntry);
router.post('/time-entries/bulk', technicianController.createTimeEntriesBulk);
router.get('/time-entries', technicianController.getMyWorkEntries);

// Work entries (backward compatibility - uses same unified endpoints)
router.post('/work-entries', technicianController.createWorkEntry);
router.get('/work-entries', technicianController.getMyWorkEntries);
router.get('/work-entries/:id', technicianController.getWorkEntryById);
router.put('/work-entries/:id', technicianController.updateWorkEntry);
router.delete('/work-entries/:id', technicianController.deleteWorkEntry);

// Work summary
router.get('/summary', technicianController.getWorkSummary);

// Notifications
router.get('/notifications', notificationController.getMyNotifications);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.post('/notifications/:id/read', notificationController.markAsRead);
router.post('/notifications/read-all', notificationController.markAllAsRead);

module.exports = router;

