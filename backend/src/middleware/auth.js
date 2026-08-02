const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No authorization token provided' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
}

module.exports = auth;
