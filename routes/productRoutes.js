const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// Admin-only protected routes
router.post('/', authenticateToken, isAdmin, upload.array('images', 5), productController.createProduct);
router.put('/:id', authenticateToken, isAdmin, upload.array('images', 5), productController.updateProduct);
router.delete('/:id', authenticateToken, isAdmin, productController.deleteProduct);

module.exports = router;
