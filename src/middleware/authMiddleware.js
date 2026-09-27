// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Authentication Middleware & In-Memory Session Store
// Single-Admin Security Controller
// ============================================================================

const crypto = require('crypto');

// In-memory store for active session tokens
// Key: token (hex string), Value: { username, createdAt, expiresAt }
const activeSessions = new Map();

// Session validity: 12 hours
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

/**
 * Creates a cryptographically secure session token
 * @param {string} username 
 * @returns {string} token
 */
function createSession(username) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  activeSessions.set(token, {
    username,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS
  });
  return token;
}

/**
 * Invalidates / destroys an active session token
 * @param {string} token 
 * @returns {boolean} true if session was found and removed
 */
function destroySession(token) {
  if (!token) return false;
  return activeSessions.delete(token);
}

/**
 * Validates a session token
 * @param {string} token 
 * @returns {object|null} session object or null if invalid/expired
 */
function verifySession(token) {
  if (!token || typeof token !== 'string') return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  // Check expiration
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Express Middleware: Enforces authentication on protected routes
 * Extracts token from `Authorization: Bearer <token>`
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Access denied. Authentication token is required.'
    });
  }

  const token = authHeader.substring(7).trim();
  const session = verifySession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Session is invalid or has expired. Please log in again.'
    });
  }

  // Attach authenticated user information to request
  req.user = session;
  req.token = token;
  next();
}

module.exports = {
  createSession,
  destroySession,
  verifySession,
  requireAuth
};
