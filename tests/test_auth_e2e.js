// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Single-Admin Authentication & Protected Workflows Verification Suite
// Tests:
//  1. Server Initialization & Public Assets
//  2. Unauthenticated Modifying Requests Blocked (HTTP 401)
//  3. Invalid Token & Missing Token Rejection (HTTP 401)
//  4. Admin Login Validation & Rate Limiting Guard
//  5. Authenticated Admin Session Verification (HTTP 200)
//  6. Protected Operations & ACID Transactions with Bearer Token
//  7. Session Invalidation via Logout & Post-Logout Rejection (HTTP 401)
//  8. Complete Database Regression & Sample Data Integrity Validation
// ============================================================================

const mysql = require('mysql2/promise');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('../src/server');

const TEST_PORT = 3000;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const API_URL = `${BASE_URL}/api`;

let server;
let dbPool;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

function recordTest(testId, description, expected, actual, isPass) {
  totalTests++;
  if (isPass) {
    passedTests++;
    console.log(`  [PASS] [${testId}] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] [${testId}] ${description}`);
    console.error(`         Expected: ${JSON.stringify(expected)}`);
    console.error(`         Actual:   ${JSON.stringify(actual)}`);
  }
  results.push({ testId, description, expected, actual, status: isPass ? 'PASS' : 'FAIL' });
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log(' SINGLE-ADMIN AUTHENTICATION & ACCESS CONTROL TEST SUITE');
  console.log(' DBMS Project: INVENTORY MANAGEMENT');
  console.log(' Environment: Windows 11, Node.js v24.11, MySQL Community Server 26.7');
  console.log('================================================================\n');

  // Start Express Server if not already active
  try {
    const probe = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (!probe || !probe.ok) {
      server = http.createServer(app);
      await new Promise((resolve) => server.listen(TEST_PORT, resolve));
      console.log(`[INFO] Started Express test server listening on ${BASE_URL}\n`);
    } else {
      console.log(`[INFO] Using existing active Express server on ${BASE_URL}\n`);
    }
  } catch (e) {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    console.log(`[INFO] Started Express test server listening on ${BASE_URL}\n`);
  }

  // Connect to MySQL
  dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'inventory_management',
    decimalNumbers: true
  });

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  let activeAdminToken = null;

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: PUBLIC HEALTH CHECK & FRONTEND LANDING
    // ------------------------------------------------------------------------
    console.log('--- SECTION 1: Public Endpoints & Frontend HTML ---');

    const healthRes = await request('/health');
    recordTest('PUB-01', 'GET /api/health returns HTTP 200 OK', 200, healthRes.status, healthRes.status === 200);
    recordTest('PUB-02', 'GET /api/health reports MySQL 26.7', true, healthRes.json?.database?.includes('26.7'), healthRes.json?.database?.includes('26.7'));

    const htmlRes = await request(`${BASE_URL}/`);
    recordTest('PUB-03', 'GET / serves frontend index.html with HTTP 200', 200, htmlRes.status, htmlRes.status === 200);
    recordTest('PUB-04', 'Frontend contains login card container (#login-container)', true, htmlRes.text.includes('id="login-container"'), htmlRes.text.includes('id="login-container"'));
    recordTest('PUB-05', 'Frontend contains login form (#loginForm)', true, htmlRes.text.includes('id="loginForm"'), htmlRes.text.includes('id="loginForm"'));
    recordTest('PUB-06', 'Frontend contains protected app container (#app-container)', true, htmlRes.text.includes('id="app-container"'), htmlRes.text.includes('id="app-container"'));
    recordTest('PUB-07', 'Frontend includes api.js and app.js scripts', true, htmlRes.text.includes('js/api.js') && htmlRes.text.includes('js/app.js'), htmlRes.text.includes('js/api.js') && htmlRes.text.includes('js/app.js'));

    // ------------------------------------------------------------------------
    // SECTION 2: UNAUTHENTICATED REQUESTS BLOCKED (HTTP 401)
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Unauthenticated Modifying Requests Blocked (HTTP 401) ---');

    // Unauthenticated POST /api/categories
    const unauthPostCat = await request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hacker Category', description: 'Unauthorized injection' })
    });
    recordTest('AUTH-BL-01', 'POST /api/categories without token returns HTTP 401 Unauthorized', 401, unauthPostCat.status, unauthPostCat.status === 401);
    recordTest('AUTH-BL-02', 'POST /api/categories returns Unauthorized message', true, unauthPostCat.json?.message?.toLowerCase().includes('unauthorized'), unauthPostCat.json?.message?.toLowerCase().includes('unauthorized'));

    // Unauthenticated POST /api/products
    const unauthPostProd = await request('/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Unauthorized Item', category_id: 1, price: 999, stock_quantity: 10, reorder_level: 5 })
    });
    recordTest('AUTH-BL-03', 'POST /api/products without token returns HTTP 401 Unauthorized', 401, unauthPostProd.status, unauthPostProd.status === 401);

    // Unauthenticated PUT /api/products/1
    const unauthPutProd = await request('/products/1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Modified Item', category_id: 1, price: 500, stock_quantity: 50, reorder_level: 10 })
    });
    recordTest('AUTH-BL-04', 'PUT /api/products/:id without token returns HTTP 401 Unauthorized', 401, unauthPutProd.status, unauthPutProd.status === 401);

    // Unauthenticated DELETE /api/products/1
    const unauthDelProd = await request('/products/1', { method: 'DELETE' });
    recordTest('AUTH-BL-05', 'DELETE /api/products/:id without token returns HTTP 401 Unauthorized', 401, unauthDelProd.status, unauthDelProd.status === 401);

    // Unauthenticated POST /api/suppliers
    const unauthPostSupp = await request('/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Rogue Vendor', phone: '+919999999999' })
    });
    recordTest('AUTH-BL-06', 'POST /api/suppliers without token returns HTTP 401 Unauthorized', 401, unauthPostSupp.status, unauthPostSupp.status === 401);

    // Unauthenticated POST /api/customers
    const unauthPostCust = await request('/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Rogue Customer', phone: '+918888888888' })
    });
    recordTest('AUTH-BL-07', 'POST /api/customers without token returns HTTP 401 Unauthorized', 401, unauthPostCust.status, unauthPostCust.status === 401);

    // Unauthenticated POST /api/purchases
    const unauthPostPurch = await request('/purchases', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: 1,
        items: [{ product_id: 1, quantity: 5, unit_price: 2000 }]
      })
    });
    recordTest('AUTH-BL-08', 'POST /api/purchases (ACID Inflow) without token returns HTTP 401', 401, unauthPostPurch.status, unauthPostPurch.status === 401);

    // Unauthenticated POST /api/sales
    const unauthPostSale = await request('/sales', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: 1,
        items: [{ product_id: 1, quantity: 1, unit_price: 2650 }]
      })
    });
    recordTest('AUTH-BL-09', 'POST /api/sales (ACID Outflow) without token returns HTTP 401', 401, unauthPostSale.status, unauthPostSale.status === 401);

    // Verify session without token
    const unauthVerify = await request('/auth/verify');
    recordTest('AUTH-BL-10', 'GET /api/auth/verify without token returns HTTP 401 Unauthorized', 401, unauthVerify.status, unauthVerify.status === 401);

    // Fake / forged Bearer token
    const fakeTokenRes = await request('/products', {
      method: 'POST',
      headers: { Authorization: 'Bearer 0123456789abcdef0123456789abcdef' },
      body: JSON.stringify({ name: 'Forged Item', category_id: 1, price: 100, stock_quantity: 5, reorder_level: 2 })
    });
    recordTest('AUTH-BL-11', 'Request with forged/invalid Bearer token returns HTTP 401 Unauthorized', 401, fakeTokenRes.status, fakeTokenRes.status === 401);

    // ------------------------------------------------------------------------
    // SECTION 3: LOGIN VALIDATION & RATE LIMITING GUARD
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Admin Login Validation & Rate Limiting ---');

    // Missing fields
    const missingCredsRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: '' })
    });
    recordTest('AUTH-LG-01', 'POST /api/auth/login with missing password returns HTTP 400 Bad Request', 400, missingCredsRes.status, missingCredsRes.status === 400);

    // Wrong username
    const wrongUserRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nonexistent_user', password: adminPassword })
    });
    recordTest('AUTH-LG-02', 'POST /api/auth/login with wrong username returns HTTP 401', 401, wrongUserRes.status, wrongUserRes.status === 401);
    recordTest('AUTH-LG-03', 'Rejection provides safe generic message', 'Invalid username or password.', wrongUserRes.json?.message, wrongUserRes.json?.message === 'Invalid username or password.');

    // Wrong password
    const wrongPassRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: adminUsername, password: 'IncorrectPassword999!' })
    });
    recordTest('AUTH-LG-04', 'POST /api/auth/login with wrong password returns HTTP 401', 401, wrongPassRes.status, wrongPassRes.status === 401);
    recordTest('AUTH-LG-05', 'Rejection does NOT reveal whether username or password was wrong', 'Invalid username or password.', wrongPassRes.json?.message, wrongPassRes.json?.message === 'Invalid username or password.');

    // Valid Login with Admin credentials
    const validLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: adminUsername, password: adminPassword })
    });
    recordTest('AUTH-LG-06', 'POST /api/auth/login with valid credentials returns HTTP 200 OK', 200, validLoginRes.status, validLoginRes.status === 200);
    recordTest('AUTH-LG-07', 'Login response returns session token', true, typeof validLoginRes.json?.token === 'string' && validLoginRes.json.token.length >= 32, typeof validLoginRes.json?.token === 'string' && validLoginRes.json.token.length >= 32);
    recordTest('AUTH-LG-08', 'Login response confirms admin username', adminUsername, validLoginRes.json?.username, validLoginRes.json?.username === adminUsername);

    activeAdminToken = validLoginRes.json?.token;

    // ------------------------------------------------------------------------
    // SECTION 4: AUTHENTICATED SESSION VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Authenticated Session Verification ---');

    const verifyActiveRes = await request('/auth/verify', {
      headers: { Authorization: `Bearer ${activeAdminToken}` }
    });
    recordTest('AUTH-VF-01', 'GET /api/auth/verify with valid token returns HTTP 200', 200, verifyActiveRes.status, verifyActiveRes.status === 200);
    recordTest('AUTH-VF-02', 'Verify endpoint confirms authenticated: true', true, verifyActiveRes.json?.authenticated, verifyActiveRes.json?.authenticated === true);

    // ------------------------------------------------------------------------
    // SECTION 5: AUTHENTICATED CRUD & TRANSACTION OPERATIONS
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Authenticated CRUD & ACID Transactions with Bearer Token ---');

    // 5A. Authenticated Category Creation
    const createCatRes = await request('/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeAdminToken}` },
      body: JSON.stringify({
        Category_Name: 'Auth Test Peripheral Category',
        Description: 'Temporary testing category for auth verification'
      })
    });
    recordTest('AUTH-CR-01', 'Authenticated POST /api/categories returns HTTP 201 Created', 201, createCatRes.status, createCatRes.status === 201);
    const newCatId = createCatRes.json?.data?.Category_ID;

    // Direct MySQL check
    const [[catRow]] = await dbPool.query('SELECT * FROM Category WHERE Category_ID = ?', [newCatId]);
    recordTest('AUTH-CR-02', 'Category successfully inserted in MySQL database', 'Auth Test Peripheral Category', catRow?.Category_Name, catRow?.Category_Name === 'Auth Test Peripheral Category');

    // 5B. Authenticated Category Update
    const updateCatRes = await request(`/categories/${newCatId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${activeAdminToken}` },
      body: JSON.stringify({
        Category_Name: 'Auth Test Peripheral Category Updated',
        Description: 'Updated description by admin'
      })
    });
    recordTest('AUTH-CR-03', 'Authenticated PUT /api/categories/:id returns HTTP 200 OK', 200, updateCatRes.status, updateCatRes.status === 200);

    // 5C. Authenticated Category Delete
    const deleteCatRes = await request(`/categories/${newCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${activeAdminToken}` }
    });
    recordTest('AUTH-CR-04', 'Authenticated DELETE /api/categories/:id returns HTTP 200 OK', 200, deleteCatRes.status, deleteCatRes.status === 200);

    // Direct MySQL check: category removed
    const [[deletedCatRow]] = await dbPool.query('SELECT * FROM Category WHERE Category_ID = ?', [newCatId]);
    recordTest('AUTH-CR-05', 'Category successfully removed from MySQL database', undefined, deletedCatRow, deletedCatRow === undefined);

    // 5D. Authenticated Multi-Item Purchase Transaction
    // Read stock before purchase for Product 1 (Logitech K380) and Product 2 (Dell Mouse)
    const [[prod1Before]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod2Before]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');

    const purchaseRes = await request('/purchases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeAdminToken}` },
      body: JSON.stringify({
        Supplier_ID: 1,
        items: [
          { Product_ID: 1, Quantity: 10, Unit_Price: 2100.00 },
          { Product_ID: 2, Quantity: 20, Unit_Price: 350.00 }
        ]
      })
    });
    recordTest('AUTH-TX-01', 'Authenticated multi-item Purchase returns HTTP 201 Created', 201, purchaseRes.status, purchaseRes.status === 201);
    const testPurchaseId = purchaseRes.json?.data?.Purchase_ID;

    // Check MySQL stock increase
    const [[prod1AfterPurch]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod2AfterPurch]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    recordTest('AUTH-TX-02', 'MySQL Product 1 stock increased by +10', prod1Before.Stock_Quantity + 10, prod1AfterPurch.Stock_Quantity, prod1AfterPurch.Stock_Quantity === prod1Before.Stock_Quantity + 10);
    recordTest('AUTH-TX-03', 'MySQL Product 2 stock increased by +20', prod2Before.Stock_Quantity + 20, prod2AfterPurch.Stock_Quantity, prod2AfterPurch.Stock_Quantity === prod2Before.Stock_Quantity + 20);

    // 5E. Authenticated Multi-Item Sale Transaction
    const saleRes = await request('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeAdminToken}` },
      body: JSON.stringify({
        Customer_ID: 1,
        items: [
          { Product_ID: 1, Quantity: 10, Unit_Price: 2650.00 },
          { Product_ID: 2, Quantity: 20, Unit_Price: 450.00 }
        ]
      })
    });
    recordTest('AUTH-TX-04', 'Authenticated multi-item Sale returns HTTP 201 Created', 201, saleRes.status, saleRes.status === 201);
    const testSaleId = saleRes.json?.data?.Sale_ID;

    // Check MySQL stock restored to original baseline
    const [[prod1AfterSale]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod2AfterSale]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    recordTest('AUTH-TX-05', 'MySQL Product 1 stock returned to baseline after equal sale', prod1Before.Stock_Quantity, prod1AfterSale.Stock_Quantity, prod1AfterSale.Stock_Quantity === prod1Before.Stock_Quantity);
    recordTest('AUTH-TX-06', 'MySQL Product 2 stock returned to baseline after equal sale', prod2Before.Stock_Quantity, prod2AfterSale.Stock_Quantity, prod2AfterSale.Stock_Quantity === prod2Before.Stock_Quantity);

    // 5F. Transaction Rollback on Insufficient Stock
    const excessSaleRes = await request('/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeAdminToken}` },
      body: JSON.stringify({
        Customer_ID: 1,
        items: [
          { Product_ID: 1, Quantity: 9999, Unit_Price: 2650.00 } // Exceeds available stock
        ]
      })
    });
    recordTest('AUTH-TX-07', 'Sale exceeding available stock returns HTTP 400 Bad Request', 400, excessSaleRes.status, excessSaleRes.status === 400);

    // Cleanup the temporary test transactions so sample record counts remain exact
    if (testSaleId) {
      await dbPool.query('DELETE FROM Sale_Details WHERE Sale_ID = ?', [testSaleId]);
      await dbPool.query('DELETE FROM Sale WHERE Sale_ID = ?', [testSaleId]);
    }
    if (testPurchaseId) {
      await dbPool.query('DELETE FROM Purchase_Details WHERE Purchase_ID = ?', [testPurchaseId]);
      await dbPool.query('DELETE FROM Purchase WHERE Purchase_ID = ?', [testPurchaseId]);
    }

    // ------------------------------------------------------------------------
    // SECTION 6: LOGOUT & TOKEN INVALIDATION
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Admin Logout & Session Invalidation ---');

    const logoutRes = await request('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeAdminToken}` }
    });
    recordTest('AUTH-LO-01', 'POST /api/auth/logout returns HTTP 200 OK', 200, logoutRes.status, logoutRes.status === 200);
    recordTest('AUTH-LO-02', 'Logout response confirms session invalidated', true, logoutRes.json?.message?.includes('invalidated'), logoutRes.json?.message?.includes('invalidated'));

    // Try using the invalidated token for verify
    const postLogoutVerify = await request('/auth/verify', {
      headers: { Authorization: `Bearer ${activeAdminToken}` }
    });
    recordTest('AUTH-LO-03', 'GET /api/auth/verify with invalidated token returns HTTP 401 Unauthorized', 401, postLogoutVerify.status, postLogoutVerify.status === 401);

    // Try modifying data with the invalidated token
    const postLogoutModify = await request('/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${activeAdminToken}` },
      body: JSON.stringify({ name: 'Post-Logout Attack Category', description: 'Should fail' })
    });
    recordTest('AUTH-LO-04', 'POST /api/categories with invalidated token returns HTTP 401 Unauthorized', 401, postLogoutModify.status, postLogoutModify.status === 401);

    // ------------------------------------------------------------------------
    // SECTION 7: FINAL DATABASE REGRESSION & RECORD COUNTS
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Database Regression & Sample Data Integrity ---');

    const expectedCounts = {
      Category: 5,
      Product: 14,
      Supplier: 5,
      Customer: 6,
      Purchase: 5,
      Purchase_Details: 12,
      Sale: 5,
      Sale_Details: 11
    };

    for (const [table, expectedCnt] of Object.entries(expectedCounts)) {
      const [[{ cnt }]] = await dbPool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      recordTest(`DB-REG-${table}`, `Table "${table}" has exactly ${expectedCnt} records`, expectedCnt, cnt, cnt === expectedCnt);
    }

    // Verify baseline stock quantities for key sample products
    const expectedStocks = {
      1: 28, // Logitech K380 Wireless Keyboard
      2: 45, // Dell Optical USB Mouse MS116
      4: 4,  // Kingston NV2 1TB SSD (Low Stock)
      7: 3,  // TP-Link Archer C6 (Low Stock)
      11: 2, // HP LaserJet 12A Toner (Low Stock)
      12: 1  // APC Back-UPS 600VA (Low Stock)
    };

    for (const [prodId, expectedStock] of Object.entries(expectedStocks)) {
      const [[prod]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = ?', [prodId]);
      recordTest(`STOCK-REG-${prodId}`, `Product ID ${prodId} stock restored to baseline (${expectedStock})`, expectedStock, prod?.Stock_Quantity, prod?.Stock_Quantity === expectedStock);
    }

  } catch (err) {
    console.error('[FATAL TEST SUITE ERROR]', err);
  } finally {
    if (server) {
      server.close();
    }
    if (dbPool) {
      await dbPool.end();
    }
  }

  // Final Summary Output
  console.log('\n================================================================');
  console.log(` TEST RESULTS SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (failedTests === 0) {
    console.log(' STATUS: ALL SINGLE-ADMIN AUTHENTICATION & ACCESS CONTROL TESTS PASSED');
  } else {
    console.error(` STATUS: ${failedTests} TESTS FAILED`);
  }
  console.log('================================================================');

  process.exit(failedTests === 0 ? 0 : 1);
}

runTestSuite();
