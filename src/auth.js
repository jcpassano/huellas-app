const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('AVISO: JWT_SECRET no está configurado. Definilo en las variables de entorno antes de usar esto en producción.');
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: '90d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o vencida.' });
  }
}

// Igual que requireAuth pero no falla si no hay token: deja req.userId en null.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) { req.userId = null; return next(); }
  try {
    const payload = jwt.verify(token, SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
  } catch (e) {
    req.userId = null;
  }
  next();
}

module.exports = { signToken, requireAuth, optionalAuth };
