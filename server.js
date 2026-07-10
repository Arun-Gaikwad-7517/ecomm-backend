const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists and serve statically
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Root path diagnostic
app.get('/', (req, res) => {
  res.json({ message: 'E-Commerce Backend API is running.', status: 'OK' });
});

// Database connection & self-seeding
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ecom_db';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully.');
    await runDbSeeding();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    console.log('Please ensure local MongoDB is running: "net start MongoDB" or "mongod"');
    process.exit(1);
  });

// Automated database seeding function
async function runDbSeeding() {
  try {
    const Product = require('./models/Product');
    const User = require('./models/User');
    
    // 1. Seed Products if empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('No products found in DB. Seeding default inventory...');
      const defaultProducts = [
        {
          name: 'Classic White Tee',
          category: 'T-Shirts',
          description: 'A premium 100% cotton classic crewneck white T-shirt. Soft, durable, and comfortable.',
          price: 599,
          stock: 45,
          images: []
        },
        {
          name: 'Developer Navy Tee',
          category: 'T-Shirts',
          description: 'Perfect for coders. Features a subtle, high-quality embroidered logo. Breathable knit.',
          price: 699,
          stock: 30,
          images: []
        },
        {
          name: 'Vintage Oversized Black Tee',
          category: 'T-Shirts',
          description: 'Heavyweight organic cotton tee in a relaxed, retro fit. Pre-shrunk finish.',
          price: 899,
          stock: 25,
          images: []
        },
        {
          name: 'RGB Mechanical Keyboard',
          category: 'Tech Gadgets',
          description: 'Tactile blue switch mechanical keyboard with full customizable RGB backlighting and premium aluminum build.',
          price: 3499,
          stock: 15,
          images: []
        },
        {
          name: 'Wireless Ergonomic Mouse',
          category: 'Tech Gadgets',
          description: 'High-precision wireless optical mouse designed to reduce hand strain. Long battery life with USB-C charging.',
          price: 1999,
          stock: 20,
          images: []
        },
        {
          name: 'Noise-Cancelling Headphones',
          category: 'Tech Gadgets',
          description: 'Over-ear active noise-cancelling bluetooth headphones. High-fidelity audio with 40-hour playtime.',
          price: 4999,
          stock: 10,
          images: []
        },
        {
          name: '4K Ultra-Wide Webcam',
          category: 'Tech Gadgets',
          description: 'High-definition 4K webcam with dual noise-reduction microphones and physical privacy cover.',
          price: 2499,
          stock: 12,
          images: []
        }
      ];
      await Product.insertMany(defaultProducts);
      console.log('Default products seeded successfully!');
    }
    
    // 2. Seed Default Accounts if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No user accounts found in DB. Seeding default accounts...');
      
      const salt = await bcrypt.genSalt(10);
      const adminPasswordHash = await bcrypt.hash('admin123', salt);
      const userPasswordHash = await bcrypt.hash('user123', salt);
      
      const defaultUsers = [
        {
          name: 'Default Admin',
          email: 'admin@ecom.com',
          password: adminPasswordHash,
          role: 'Admin'
        },
        {
          name: 'Default User',
          email: 'user@ecom.com',
          password: userPasswordHash,
          role: 'User'
        }
      ];
      
      await User.insertMany(defaultUsers);
      console.log('Default accounts seeded successfully:');
      console.log('  Admin: admin@ecom.com / admin123');
      console.log('  User: user@ecom.com / user123');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
