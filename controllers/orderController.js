const Order = require('../models/Order');
const Product = require('../models/Product');
const { calculateDiscounts } = require('../utils/discountEngine');
const { sendOrderInvoiceEmail } = require('../utils/emailService');
const { appendOrderToSheet } = require('../utils/sheetsService');

exports.createOrder = async (req, res) => {
  try {
    const { customerName, email, items } = req.body;
    
    if (!customerName || !email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Missing order details (customerName, email, or items).' });
    }
    
    const enrichedItems = [];
    
    // Validate stock and enrich item pricing/categories from the database
    for (const cartItem of items) {
      const product = await Product.findById(cartItem.product);
      
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${cartItem.product}` });
      }
      
      if (product.stock < cartItem.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for product "${product.name}". Available: ${product.stock}, Requested: ${cartItem.quantity}` 
        });
      }
      
      enrichedItems.push({
        product: product._id,
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: parseInt(cartItem.quantity)
      });
    }
    
    // Calculate discounts via backend engine
    const discountDetails = calculateDiscounts(enrichedItems);
    
    // Decrement stock in database
    for (const item of enrichedItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }
    
    // Create and save the order
    const order = new Order({
      customerName,
      email,
      items: discountDetails.items,
      subtotal: discountDetails.subtotal,
      appliedDiscounts: discountDetails.appliedDiscounts,
      totalAmount: discountDetails.finalPayable
    });
    
    await order.save();
    
    // Run integrations in background so API responds immediately
    const emailOrderDetails = {
      orderId: order._id.toString(),
      items: order.items,
      subtotal: order.subtotal,
      appliedDiscounts: order.appliedDiscounts,
      totalAmount: order.totalAmount
    };
    
    // Send invoice email asynchronously
    sendOrderInvoiceEmail(customerName, email, emailOrderDetails).catch(err => {
      console.error('Asynchronous invoice email trigger failed:', err);
    });
    
    // Append row to Google Sheets asynchronously
    appendOrderToSheet(order).catch(err => {
      console.error('Asynchronous Google Sheets append failed:', err);
    });
    
    res.status(201).json({
      message: 'Order placed successfully!',
      orderId: order._id,
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error placing order.' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    res.json(order);
  } catch (error) {
    console.error('Fetch order by ID error:', error);
    res.status(500).json({ message: 'Server error fetching order.' });
  }
};

exports.calculateOrderDiscounts = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({
        subtotal: 0,
        appliedDiscounts: [],
        totalDiscount: 0,
        isCapped: false,
        finalPayable: 0
      });
    }
    
    const enrichedItems = [];
    for (const cartItem of items) {
      if (!cartItem.product) continue;
      const product = await Product.findById(cartItem.product);
      if (product) {
        enrichedItems.push({
          product: product._id,
          name: product.name,
          category: product.category,
          price: product.price,
          quantity: parseInt(cartItem.quantity || 1)
        });
      }
    }
    
    const discountDetails = calculateDiscounts(enrichedItems);
    res.json(discountDetails);
  } catch (error) {
    console.error('Calculate discounts error:', error);
    res.status(500).json({ message: 'Server error calculating discounts.' });
  }
};

