const express = require('express');
const router = express.Router();
const processController = require('../controllers/processController');
const { authenticate, plannerOrAdmin } = require('../middleware/auth');

// Protect legacy process routes; require Planner or Admin
router.use(authenticate);
router.use(plannerOrAdmin);

router.get('/', processController.getAllProcesses);
router.get('/:id', processController.getProcessById);
router.get('/product/:productId', processController.getProcessesByProductId);
router.post('/', processController.createProcess);
router.put('/:id', processController.updateProcess);
router.delete('/:id', processController.deleteProcess);

module.exports = router;