// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Main Express Application Server with Single-Admin Authentication Guard
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/authRoutes');
const { requireAuth } = require('./middleware/authMiddleware');

const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const saleRoutes = require('./routes/saleRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { ensureDatabaseInitialized } = require('../database/init_database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust reverse proxy for client IP rate-limiting (e.g. Railway, Nginx)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Authentication Routes (Login, Logout, Verify)
app.use('/api/auth', authRoutes);

// Health check endpoint (Public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    project: 'Inventory Management DBMS Project',
    database: 'MySQL Community Server 26.7',
    timestamp: new Date().toISOString()
  });
});

// Security Enforcement:
// Protect ALL database-modifying API operations (POST, PUT, DELETE, PATCH)
// Enforces HTTP 401 Unauthorized for unauthenticated modification attempts
app.use('/api', (req, res, next) => {
  // Allow public auth login and health endpoint
  if (req.path === '/auth/login' || req.path === '/health') {
    return next();
  }

  // Modifying methods strictly require an active, valid authentication token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return requireAuth(req, res, next);
  }

  next();
});

// Entity API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint "${req.originalUrl}" not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// Start Server (only if not imported by test runner)
if (require.main === module) {
  (async () => {
    try {
      await ensureDatabaseInitialized();
    } catch (dbErr) {
      console.error('[Database Warning] Initialization check encountered an error:', dbErr.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`================================================================`);
      console.log(` Inventory Management Backend Server running on port ${PORT}`);
      console.log(` Local URL: http://localhost:${PORT}`);
      console.log(` API Base:  http://localhost:${PORT}/api`);
      console.log(` Authentication: Single-Admin Guard Active`);
      console.log(`================================================================`);
    });
  })();
}

module.exports = app;
