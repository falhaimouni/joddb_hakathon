const express = require('express');
const router = express.Router();
const operationController = require('../controllers/operationController');
const { authenticate, plannerOrAdmin, technicianOrAbove } = require('../middleware/auth');

// All operation routes require authentication
router.use(authenticate);

// Read-only access for technicians and above
router.get('/', technicianOrAbove, operationController.getAllOperations);
router.get('/:id', technicianOrAbove, operationController.getOperationById);

// Write access restricted to planners/admins
router.post('/', plannerOrAdmin, operationController.createOperation);
router.put('/:id', plannerOrAdmin, operationController.updateOperation);
router.delete('/:id', plannerOrAdmin, operationController.deleteOperation);

module.exports = router;

