// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Single-Admin Authentication Routes
// Endpoints: Login, Logout, Session Verification
// Includes Brute-Force Rate Limiting & Timing-Safe Password Comparison
// ============================================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createSession, destroySession, requireAuth, verifySession } = require('../middleware/authMiddleware');

// In-memory rate limiting for login attempts
// Key: client IP, Value: { count: number, lockUntil: number }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Timing-safe string comparison to protect against side-channel timing attacks
 */
function secureCompare(input, expected) {
  if (typeof input !== 'string' || typeof expected !== 'string') return false;
  const hashA = crypto.createHash('sha256').update(input).digest();
  const hashB = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  // 1. Check Rate Limiting / Lockout
  const attemptInfo = loginAttempts.get(clientIp);
  if (attemptInfo && attemptInfo.lockUntil && now < attemptInfo.lockUntil) {
    const remainingSecs = Math.ceil((attemptInfo.lockUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. Access temporarily locked. Please try again in ${remainingSecs} seconds.`
    });
  }

  const { username, password } = req.body;

  // 2. Validate input fields
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Both username and password are required.'
    });
  }

  // 3. Compare with server-side environment variables
  const configuredUser = process.env.ADMIN_USERNAME || 'admin';
  const configuredPass = process.env.ADMIN_PASSWORD || '';

  const isUserValid = secureCompare(username.trim(), configuredUser);
  const isPassValid = secureCompare(password, configuredPass);

  if (!isUserValid || !isPassValid) {
    // Increment failed attempts
    const current = loginAttempts.get(clientIp) || { count: 0, lockUntil: null };
    current.count += 1;
    if (current.count >= MAX_ATTEMPTS) {
      current.lockUntil = now + LOCKOUT_DURATION_MS;
      loginAttempts.set(clientIp, current);
      return res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Access temporarily locked for 5 minutes.'
      });
    }
    loginAttempts.set(clientIp, current);

    return res.status(401).json({
      success: false,
      message: 'Invalid username or password.'
    });
  }

  // 4. Successful login: reset failed attempts for this IP
  loginAttempts.delete(clientIp);

  // 5. Generate secure session token
  const token = createSession(configuredUser);

  res.json({
    success: true,
    message: 'Authentication successful.',
    token,
    username: configuredUser
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    destroySession(token);
  }

  res.json({
    success: true,
    message: 'Logged out successfully. Session invalidated.'
  });
});

// GET /api/auth/verify (Session check)
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'No active session token provided.'
    });
  }

  const token = authHeader.substring(7).trim();
  const session = verifySession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Session has expired or is invalid.'
    });
  }

  res.json({
    success: true,
    authenticated: true,
    username: session.username
  });
});

module.exports = router;
