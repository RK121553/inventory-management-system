// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Phase 4 Automated Backend & Transaction Test Suite
// ============================================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('../src/server');
const db = require('../src/config/db');

const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;
let passedCount = 0;
let failedCount = 0;
let authToken = null;

const nativeFetch = globalThis.fetch;
globalThis.fetch = async function(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return nativeFetch(url, { ...options, headers });
};

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(' STARTING PHASE 4 BACKEND API & TRANSACTION VERIFICATION SUITE');
  console.log('================================================================\n');

  server = app.listen(TEST_PORT);
  // Wait 300ms for server to bind
  await new Promise(r => setTimeout(r, 300));

  // Authenticate Admin
  try {
    const loginRes = await nativeFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD
      })
    });
    const loginData = await loginRes.json();
    if (loginData && loginData.token) {
      authToken = loginData.token;
    }
  } catch (e) {
    console.warn('Could not authenticate admin:', e.message);
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Health Check
    // ------------------------------------------------------------------------
    console.log('1. Testing Health Endpoint:');
    const resHealth = await fetch(`${BASE_URL}/health`);
    const dataHealth = await resHealth.json();
    assert(resHealth.status === 200 && dataHealth.status === 'OK', 'GET /api/health returned 200 OK');

    // ------------------------------------------------------------------------
    // TEST 2: Dashboard Statistics
    // ------------------------------------------------------------------------
    console.log('\n2. Testing Dashboard Statistics:');
    const resDash = await fetch(`${BASE_URL}/dashboard/stats`);
    const dataDash = await resDash.json();
    assert(resDash.status === 200 && dataDash.success, 'GET /api/dashboard/stats returned 200 OK');
    assert(dataDash.data.summary.totalProducts === 14, 'Dashboard confirms 14 initial products');
    assert(dataDash.data.summary.totalCategories === 5, 'Dashboard confirms 5 categories');
    assert(dataDash.data.summary.lowStockCount === 5, 'Dashboard confirms 5 low stock products');

    // ------------------------------------------------------------------------
    // TEST 3: Category Endpoints & Referential Integrity Check
    // ------------------------------------------------------------------------
    console.log('\n3. Testing Category Operations:');
    const resCat = await fetch(`${BASE_URL}/categories`);
    const dataCat = await resCat.json();
    assert(resCat.status === 200 && dataCat.data.length >= 5, 'GET /api/categories returns category list');

    // Attempt deleting referenced Category 1 (Must fail with 400)
    const resDelCat = await fetch(`${BASE_URL}/categories/1`, { method: 'DELETE' });
    const dataDelCat = await resDelCat.json();
    assert(resDelCat.status === 400 && dataDelCat.message.includes('products currently belong to it'),
      'DELETE /api/categories/1 blocked by referential integrity');

    // Create a temporary category
    const resNewCat = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Category_Name: 'Test Temporary Category', Description: 'For testing only' })
    });
    const dataNewCat = await resNewCat.json();
    assert(resNewCat.status === 201 && dataNewCat.data.Category_ID, 'POST /api/categories creates new category');
    const tempCatId = dataNewCat.data.Category_ID;

    // Duplicate category name check
    const resDupCat = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Category_Name: 'Test Temporary Category' })
    });
    assert(resDupCat.status === 400, 'POST /api/categories rejects duplicate category name');

    // Delete temporary category (Should succeed since no products belong to it)
    const resCleanCat = await fetch(`${BASE_URL}/categories/${tempCatId}`, { method: 'DELETE' });
    assert(resCleanCat.status === 200, 'DELETE /api/categories removes unreferenced category');

    // ------------------------------------------------------------------------
    // TEST 4: Product Endpoints & Validations
    // ------------------------------------------------------------------------
    console.log('\n4. Testing Product Operations:');
    const resProd = await fetch(`${BASE_URL}/products`);
    const dataProd = await resProd.json();
    assert(resProd.status === 200 && dataProd.data.length === 14, 'GET /api/products returns catalog');

    // Low stock filter
    const resLowStock = await fetch(`${BASE_URL}/products/low-stock`);
    const dataLowStock = await resLowStock.json();
    assert(resLowStock.status === 200 && dataLowStock.data.length === 5, 'GET /api/products/low-stock returns 5 low stock products');

    // Validation: Negative price rejection
    const resNegPrice = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Product_Name: 'Bad Item', Category_ID: 1, Price: -50, Stock_Quantity: 10, Reorder_Level: 5 })
    });
    assert(resNegPrice.status === 400, 'POST /api/products rejects negative price');

    // Validation: Negative stock rejection
    const resNegStock = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Product_Name: 'Bad Item', Category_ID: 1, Price: 50, Stock_Quantity: -10, Reorder_Level: 5 })
    });
    assert(resNegStock.status === 400, 'POST /api/products rejects negative stock');

    // ------------------------------------------------------------------------
    // TEST 5: MULTI-PRODUCT PURCHASE TRANSACTION (Stock Increment)
    // ------------------------------------------------------------------------
    console.log('\n5. Testing Multi-Product Purchase Transaction:');
    // Read initial stocks of Product 1 and Product 2
    const [[prod1Before]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod2Before]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');

    const purchasePayload = {
      Supplier_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 5, Unit_Price: 2000.00 }, // 10,000.00
        { Product_ID: 2, Quantity: 10, Unit_Price: 300.00 }  //  3,000.00
      ] // Total: 13,000.00
    };

    const resPurchase = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchasePayload)
    });
    const dataPurchase = await resPurchase.json();

    assert(resPurchase.status === 201 && dataPurchase.success, 'POST /api/purchases succeeded with status 201');
    assert(dataPurchase.data.Total_Amount === 13000.00, 'Purchase Total_Amount = 13,000.00 matches SUM(Quantity * Unit_Price)');

    const testPurchaseId = dataPurchase.data.Purchase_ID;

    // Verify stock increment in database
    const [[prod1AfterPurchase]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod2AfterPurchase]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    assert(prod1AfterPurchase.Stock_Quantity === prod1Before.Stock_Quantity + 5,
      `Product 1 stock increased by 5 (${prod1Before.Stock_Quantity} -> ${prod1AfterPurchase.Stock_Quantity})`);
    assert(prod2AfterPurchase.Stock_Quantity === prod2Before.Stock_Quantity + 10,
      `Product 2 stock increased by 10 (${prod2Before.Stock_Quantity} -> ${prod2AfterPurchase.Stock_Quantity})`);

    // ------------------------------------------------------------------------
    // TEST 6: Purchase Transaction Failure & Rollback (Invalid Supplier)
    // ------------------------------------------------------------------------
    console.log('\n6. Testing Purchase Transaction Rollback on Invalid Supplier:');
    const resBadSupplier = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Supplier_ID: 99999,
        items: [{ Product_ID: 1, Quantity: 10, Unit_Price: 500 }]
      })
    });
    assert(resBadSupplier.status === 400, 'POST /api/purchases rejected invalid Supplier ID');

    // ------------------------------------------------------------------------
    // TEST 7: MULTI-PRODUCT SALE TRANSACTION (Stock Decrement)
    // ------------------------------------------------------------------------
    console.log('\n7. Testing Multi-Product Sale Transaction:');
    const salePayload = {
      Customer_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 3, Unit_Price: 2650.00 }, // 7,950.00
        { Product_ID: 2, Quantity: 5, Unit_Price: 450.00 }   // 2,250.00
      ] // Total: 10,200.00
    };

    const resSale = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    });
    const dataSale = await resSale.json();

    assert(resSale.status === 201 && dataSale.success, 'POST /api/sales succeeded with status 201');
    assert(dataSale.data.Total_Amount === 10200.00, 'Sale Total_Amount = 10,200.00 matches SUM(Quantity * Unit_Price)');

    const testSaleId = dataSale.data.Sale_ID;

    // Verify stock decrement in database
    const [[prod1AfterSale]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod2AfterSale]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    assert(prod1AfterSale.Stock_Quantity === prod1AfterPurchase.Stock_Quantity - 3,
      `Product 1 stock decreased by 3 (${prod1AfterPurchase.Stock_Quantity} -> ${prod1AfterSale.Stock_Quantity})`);
    assert(prod2AfterSale.Stock_Quantity === prod2AfterPurchase.Stock_Quantity - 5,
      `Product 2 stock decreased by 5 (${prod2AfterPurchase.Stock_Quantity} -> ${prod2AfterSale.Stock_Quantity})`);

    // ------------------------------------------------------------------------
    // TEST 8: SALE INSUFFICIENT STOCK VALIDATION & ATOMIC ROLLBACK
    // ------------------------------------------------------------------------
    console.log('\n8. Testing Sale Insufficient Stock & Atomic Rollback:');
    // Product 4 has current stock of 4. We request 50 units (insufficient).
    // Product 1 has plenty of stock.
    // If the transaction is atomic, Product 1 stock MUST NOT CHANGE and no records must be created!
    const [[prod1BeforeFailedSale]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod4BeforeFailedSale]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 4');

    const [saleCountBefore] = await db.query('SELECT COUNT(*) AS c FROM Sale');

    const insufficientSalePayload = {
      Customer_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 2, Unit_Price: 2650.00 },
        { Product_ID: 4, Quantity: 50, Unit_Price: 5600.00 } // Insufficient! Available is only 4
      ]
    };

    const resInsufficient = await fetch(`${BASE_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(insufficientSalePayload)
    });
    const dataInsufficient = await resInsufficient.json();

    assert(resInsufficient.status === 400, 'POST /api/sales returned 400 for insufficient stock');
    assert(dataInsufficient.message.includes('Insufficient stock available'),
      `Correct error message returned: "${dataInsufficient.message}"`);

    // Verify atomic rollback: No Sale was committed
    const [saleCountAfter] = await db.query('SELECT COUNT(*) AS c FROM Sale');
    assert(saleCountAfter[0].c === saleCountBefore[0].c, 'No orphan Sale header created in database');

    // Verify stock of ALL products remains unchanged
    const [[prod1AfterFailedSale]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[prod4AfterFailedSale]] = await db.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 4');
    assert(prod1AfterFailedSale.Stock_Quantity === prod1BeforeFailedSale.Stock_Quantity,
      'Product 1 stock was NOT partially decremented (Rollback verified)');
    assert(prod4AfterFailedSale.Stock_Quantity === prod4BeforeFailedSale.Stock_Quantity,
      'Product 4 stock remains untouched (Rollback verified)');

    // ------------------------------------------------------------------------
    // TEST 9: CLEANUP OF TEST TRANSACTIONS
    // ------------------------------------------------------------------------
    console.log('\n9. Cleaning up test transactions:');
    await db.query('DELETE FROM Sale WHERE Sale_ID = ?', [testSaleId]);
    await db.query('DELETE FROM Purchase WHERE Purchase_ID = ?', [testPurchaseId]);
    // Restore original baseline stocks of products 1 and 2
    await db.query('UPDATE Product SET Stock_Quantity = 28 WHERE Product_ID = 1');
    await db.query('UPDATE Product SET Stock_Quantity = 45 WHERE Product_ID = 2');
    console.log('  Cleaned up temporary test transactions and restored original sample stocks.');

    // ------------------------------------------------------------------------
    // TEST 10: Final Database State Verification
    // ------------------------------------------------------------------------
    console.log('\n10. Final State Verification:');
    const [[cCat]] = await db.query('SELECT COUNT(*) as c FROM Category');
    const [[cProd]] = await db.query('SELECT COUNT(*) as c FROM Product');
    const [[cSupp]] = await db.query('SELECT COUNT(*) as c FROM Supplier');
    const [[cCust]] = await db.query('SELECT COUNT(*) as c FROM Customer');
    const [[cPur]] = await db.query('SELECT COUNT(*) as c FROM Purchase');
    const [[cPurDet]] = await db.query('SELECT COUNT(*) as c FROM Purchase_Details');
    const [[cSale]] = await db.query('SELECT COUNT(*) as c FROM Sale');
    const [[cSaleDet]] = await db.query('SELECT COUNT(*) as c FROM Sale_Details');

    assert(cCat.c === 5, 'Final Category count = 5');
    assert(cProd.c === 14, 'Final Product count = 14');
    assert(cSupp.c === 5, 'Final Supplier count = 5');
    assert(cCust.c === 6, 'Final Customer count = 6');
    assert(cPur.c === 5, 'Final Purchase count = 5');
    assert(cPurDet.c === 12, 'Final Purchase_Details count = 12');
    assert(cSale.c === 5, 'Final Sale count = 5');
    assert(cSaleDet.c === 11, 'Final Sale_Details count = 11');

  } catch (error) {
    console.error('Test suite error:', error);
    failedCount++;
  } finally {
    console.log('\n================================================================');
    console.log(` TEST EXECUTION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('================================================================\n');

    server.close();
    await db.end();
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
