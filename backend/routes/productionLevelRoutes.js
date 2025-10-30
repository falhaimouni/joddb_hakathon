const express = require('express');
const router = express.Router();
const productionLevelController = require('../controllers/productionLevelController');
const { authenticate, plannerOrAdmin } = require('../middleware/auth');

// All production level routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/production-levels
 * @desc    Create a new production level
 * @access  Planner and Admin only
 */
router.post(
  '/',
  plannerOrAdmin,
  productionLevelController.createProductionLevel
);

/**
 * @route   GET /api/production-levels
 * @desc    Get all production levels
 * @access  All authenticated users
 */
router.get(
  '/',
  productionLevelController.getAllProductionLevels
);

/**
 * @route   GET /api/production-levels/:id
 * @desc    Get production level by ID
 * @access  All authenticated users
 */
router.get(
  '/:id',
  productionLevelController.getProductionLevelById
);

/**
 * @route   GET /api/production-levels/process/:processId
 * @desc    Get all production levels for a specific process
 * @access  All authenticated users
 */
router.get(
  '/process/:processId',
  productionLevelController.getLevelsByProcessId
);

/**
 * @route   PUT /api/production-levels/:id
 * @desc    Update a production level
 * @access  Planner and Admin only
 */
router.put(
  '/:id',
  plannerOrAdmin,
  productionLevelController.updateProductionLevel
);

/**
 * @route   DELETE /api/production-levels/:id
 * @desc    Delete a production level
 * @access  Planner and Admin only
 */
router.delete(
  '/:id',
  plannerOrAdmin,
  productionLevelController.deleteProductionLevel
);

module.exports = router;

