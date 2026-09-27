// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Database Configuration & Connection Pool
// Driver: mysql2/promise
// ============================================================================

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Support standard DB_*, Railway's native MYSQL* variables, or a full connection URL
let poolConfig;

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
  poolConfig = {
    uri: process.env.MYSQL_URL || process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'inventory_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    ssl: (process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true') ? { rejectUnauthorized: false } : undefined
  };
}

const pool = mysql.createPool(poolConfig);

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const activeDb = process.env.DB_NAME || process.env.MYSQLDATABASE || 'inventory_management';
    const activePort = process.env.DB_PORT || process.env.MYSQLPORT || 3306;
    console.log(`[Database] Connected successfully to MySQL database "${activeDb}" on port ${activePort}`);
    connection.release();
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
  }
}

testConnection();

module.exports = pool;
