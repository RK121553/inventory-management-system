// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Database Configuration & Connection Pool
// Driver: mysql2/promise
// ============================================================================

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Support standard DB_*, Railway's native MYSQL* variables, or a full connection URL
// Default target database is inventory_management (created by SQL setup scripts)
const targetDatabase = process.env.DB_NAME || (process.env.MYSQLDATABASE && process.env.MYSQLDATABASE !== 'railway' ? process.env.MYSQLDATABASE : 'inventory_management');
const isSsl = process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true';

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  poolConfig = {
    uri: process.env.MYSQL_URL || process.env.DATABASE_URL,
    database: targetDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : process.env.MYSQLPASSWORD,
    database: targetDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined
  };
}

const pool = mysql.createPool(poolConfig);

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const activePort = process.env.DB_PORT || process.env.MYSQLPORT || 3306;
    console.log(`[Database] Connected successfully to MySQL database "${targetDatabase}" on port ${activePort}`);
    connection.release();
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
  }
}

testConnection();

module.exports = pool;
