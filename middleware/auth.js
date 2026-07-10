const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ecom_default_secret_key';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }
  
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied: Admin role required.' });
  }
  
  next();
}

module.exports = {
  authenticateToken,
  isAdmin,
  JWT_SECRET
};
