const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, plannerOrAdmin, technicianOrAbove } = require('../middleware/auth');

// All product routes require authentication
router.use(authenticate);

// Read-only access for technicians and above
router.get('/', technicianOrAbove, productController.getAllProducts);
router.get('/:id', technicianOrAbove, productController.getProductById);

// Write access restricted to planners/admins
router.post('/', plannerOrAdmin, productController.createProduct);
router.put('/:id', plannerOrAdmin, productController.updateProduct);
router.delete('/:id', plannerOrAdmin, productController.deleteProduct);

module.exports = router;
