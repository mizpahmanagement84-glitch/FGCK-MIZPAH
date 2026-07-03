const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET || 'secret-key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    // Normalize a recordedByName for secretaries so records they create
    // are clearly labelled as coming from "Secretary" when viewed by pastors
    if (req.user && req.user.role === 'secretary') {
      req.user.recordedByName = 'Secretary';
    }
    next();
  });
}

module.exports = authMiddleware;
