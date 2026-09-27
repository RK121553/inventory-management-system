// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Database Initialization & Verification Script
// Executes in exact dependency order:
//   1. database/01_create_database.sql
//   2. database/02_create_tables.sql
//   3. database/03_constraints.sql
//   4. database/04_insert_sample_data.sql
//   5. database/09_views.sql
// Supports local MySQL, Railway MySQL (internal & proxy), and cloud URLs.
// ============================================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SQL_FILES = [
  '01_create_database.sql',
  '02_create_tables.sql',
  '03_constraints.sql',
  '04_insert_sample_data.sql',
  '09_views.sql'
];

const EXPECTED_COUNTS = {
  Category: 5,
  Product: 14,
  Supplier: 5,
  Customer: 6,
  Purchase: 5,
  Purchase_Details: 12,
  Sale: 5,
  Sale_Details: 11
};

async function getInitConnection() {
  const isSsl = process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true';

  if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    const uri = process.env.MYSQL_URL || process.env.DATABASE_URL;
    return await mysql.createConnection({
      uri,
      multipleStatements: true,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306;
  const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : process.env.MYSQLPASSWORD;

  return await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined
  });
}

async function initializeDatabase(options = {}) {
  const silent = options.silent || false;
  const log = (...args) => { if (!silent) console.log(...args); };

  log('================================================================');
  log(' DATABASE INITIALIZATION & VERIFICATION');
  log(' DBMS Project: INVENTORY MANAGEMENT');
  log('================================================================\n');

  let connection;
  try {
    connection = await getInitConnection();
    log('[INFO] Connected to MySQL Server successfully.');

    // Execute SQL files in dependency order
    for (const file of SQL_FILES) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required SQL file not found: ${filePath}`);
      }

      const sqlContent = fs.readFileSync(filePath, 'utf8');
      await connection.query(sqlContent);
      log(`  [PASS] Executed: database/${file}`);
    }

    // Switch connection context to inventory_management if not already set
    await connection.query('USE inventory_management;');

    // Verify record counts
    log('\n--- Verifying Database Table Record Counts ---');
    let allValid = true;
    for (const [table, expected] of Object.entries(EXPECTED_COUNTS)) {
      const [[{ cnt }]] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
      const isMatch = cnt === expected;
      if (!isMatch) allValid = false;
      log(`  [${isMatch ? 'PASS' : 'FAIL'}] Table "${table}": expected ${expected}, found ${cnt}`);
    }

    // Verify views exist
    const [[{ viewCnt }]] = await connection.query(`
      SELECT COUNT(*) as viewCnt 
      FROM information_schema.views 
      WHERE table_schema = 'inventory_management' 
        AND table_name IN ('vw_low_stock_products', 'vw_product_inventory_status', 'vw_sales_summary', 'vw_purchase_summary', 'vw_category_stock_valuation');
    `);
    log(`  [PASS] Analytical Views verified: ${viewCnt}/5 views active in inventory_management`);

    log('\n================================================================');
    if (allValid) {
      log(' STATUS: DATABASE INITIALIZED & ALL RECORD COUNTS VERIFIED');
    } else {
      log(' STATUS: WARNING - Record counts did not match expected values.');
    }
    log('================================================================\n');

    return { success: allValid };
  } catch (error) {
    console.error('[ERROR] Database initialization failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Idempotent check for server startup:
 * If the target database or tables are missing, run full initialization.
 * If tables exist, safely skip initialization to preserve persistent data.
 * Includes retries for cloud environments where DB service may take a few seconds to warm up.
 */
async function ensureDatabaseInitialized(options = {}) {
  const maxRetries = options.retries || 5;
  const retryDelayMs = options.retryDelayMs || 2500;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    let connection;
    try {
      connection = await getInitConnection();

      const targetDb = process.env.DB_NAME || (process.env.MYSQLDATABASE && process.env.MYSQLDATABASE !== 'railway' ? process.env.MYSQLDATABASE : 'inventory_management');
      const [dbs] = await connection.query(`SHOW DATABASES LIKE ?`, [targetDb]);

      if (dbs && dbs.length > 0) {
        const [tables] = await connection.query(
          `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? AND LOWER(TABLE_NAME) = 'product'`,
          [targetDb]
        );
        if (tables && tables.length > 0) {
          console.log(`[Database] Database "${targetDb}" already initialized with schema and tables. Ready.`);
          await connection.end();
          return { initialized: false, alreadyExisted: true };
        }
      }

      console.log(`[Database] Database "${targetDb}" or tables not detected. Initializing database schema and sample data...`);
      await connection.end();
      connection = null;

      await initializeDatabase(options);
      console.log(`[Database] Database "${targetDb}" initialized successfully.`);
      return { initialized: true, alreadyExisted: false };
    } catch (err) {
      if (connection) {
        try { await connection.end(); } catch (_) {}
      }
      console.warn(`[Database] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log(`[Database] Retrying in ${retryDelayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, retryDelayMs));
      } else {
        console.error(`[Database] Could not connect to MySQL server after ${maxRetries} attempts.`);
        throw err;
      }
    }
  }
}

// Execute directly if run as CLI script
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase, ensureDatabaseInitialized };
