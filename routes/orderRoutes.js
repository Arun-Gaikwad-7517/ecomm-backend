const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Public checkout route
router.post('/', orderController.createOrder);
router.post('/calculate-discounts', orderController.calculateOrderDiscounts);


// Admin-only order monitoring routes
router.get('/', authenticateToken, isAdmin, orderController.getOrders);
router.get('/:id', authenticateToken, isAdmin, orderController.getOrderById);

module.exports = router;
