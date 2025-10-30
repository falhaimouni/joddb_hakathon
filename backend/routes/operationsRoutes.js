const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { authenticate, plannerOrAdmin } = require('../middleware/auth');

// Protect legacy operations routes; require Planner or Admin
router.use(authenticate);
router.use(plannerOrAdmin);

router.get('/', operationsController.getAllOperations);
router.get('/:id', operationsController.getOperationById);
router.post('/', operationsController.createOperation);
router.put('/:id', operationsController.updateOperation);
router.delete('/:id', operationsController.deleteOperation);

module.exports = router;