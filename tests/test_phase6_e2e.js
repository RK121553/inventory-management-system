// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Phase 6 Full End-to-End Integration & Verification Suite
// Tests complete flow: HTTP Client -> Express API -> MySQL 26.7 -> Response
// Directly validates MySQL database records for every operation
// ============================================================================

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3000/api';

let dbPool;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const testReportRecords = [];

function recordTest(testId, description, expected, actual, isPass) {
  totalTests++;
  if (isPass) {
    passedTests++;
    console.log(`  [PASS] [${testId}] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] [${testId}] ${description} | Expected: ${expected} | Actual: ${actual}`);
  }
  testReportRecords.push({
    testId,
    description,
    expected,
    actual,
    status: isPass ? 'PASS' : 'FAIL'
  });
}

let authToken = null;

async function apiRequest(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runEndToEndIntegration() {
  console.log('================================================================');
  console.log(' PHASE 6: FULL END-TO-END INTEGRATION & VERIFICATION SUITE');
  console.log(' Environment: Windows 11, Node.js v24.11, MySQL 26.7');
  console.log('================================================================\n');

  // Authenticate as Admin
  try {
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD
      })
    });
    if (loginRes.data && loginRes.data.token) {
      authToken = loginRes.data.token;
      console.log('  [AUTH] Authenticated as Admin successfully for Phase 6 test suite.');
    }
  } catch (e) {
    console.warn('  [AUTH] Could not authenticate:', e.message);
  }

  dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'inventory_management',
    decimalNumbers: true
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: SERVER & DATABASE CONNECTIVITY
    // ------------------------------------------------------------------------
    console.log('--- 1. Application & Database Health ---');
    const health = await apiRequest('/health');
    recordTest('TC-SYS-01', 'Verify backend server is running and responds with HTTP 200',
      'HTTP 200 with status: OK',
      `HTTP ${health.status}, status: ${health.data?.status}`,
      health.status === 200 && health.data?.status === 'OK'
    );

    const [dbVersion] = await dbPool.query('SELECT VERSION() AS ver');
    recordTest('TC-SYS-02', 'Verify direct MySQL Community Server 26.7 connectivity',
      'Connected to MySQL 26.7.x',
      `Connected to MySQL ${dbVersion[0].ver}`,
      dbVersion.length > 0 && dbVersion[0].ver.startsWith('26.7')
    );

    // ------------------------------------------------------------------------
    // SECTION 2: DASHBOARD VS MYSQL DIRECT QUERY VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Dashboard Live Aggregate vs Direct MySQL State ---');
    const dash = await apiRequest('/dashboard/stats');
    const s = dash.data?.data?.summary;

    const [[{ dbProdCount }]] = await dbPool.query('SELECT COUNT(*) AS dbProdCount FROM Product');
    const [[{ dbCatCount }]] = await dbPool.query('SELECT COUNT(*) AS dbCatCount FROM Category');
    const [[{ dbSuppCount }]] = await dbPool.query('SELECT COUNT(*) AS dbSuppCount FROM Supplier');
    const [[{ dbCustCount }]] = await dbPool.query('SELECT COUNT(*) AS dbCustCount FROM Customer');
    const [[{ dbPurCount }]] = await dbPool.query('SELECT COUNT(*) AS dbPurCount FROM Purchase');
    const [[{ dbSaleCount }]] = await dbPool.query('SELECT COUNT(*) AS dbSaleCount FROM Sale');
    const [[{ dbLowStockCount }]] = await dbPool.query('SELECT COUNT(*) AS dbLowStockCount FROM Product WHERE Stock_Quantity <= Reorder_Level');
    const [[{ dbValuation }]] = await dbPool.query('SELECT SUM(Stock_Quantity * Price) AS dbValuation FROM Product');

    recordTest('TC-DASH-01', 'Dashboard Total Products matches MySQL COUNT(*)',
      `dbProdCount: ${dbProdCount}`,
      `API: ${s?.totalProducts}`,
      s?.totalProducts === dbProdCount
    );

    recordTest('TC-DASH-02', 'Dashboard Categories count matches MySQL COUNT(*)',
      `dbCatCount: ${dbCatCount}`,
      `API: ${s?.totalCategories}`,
      s?.totalCategories === dbCatCount
    );

    recordTest('TC-DASH-03', 'Dashboard Suppliers count matches MySQL COUNT(*)',
      `dbSuppCount: ${dbSuppCount}`,
      `API: ${s?.totalSuppliers}`,
      s?.totalSuppliers === dbSuppCount
    );

    recordTest('TC-DASH-04', 'Dashboard Customers count matches MySQL COUNT(*)',
      `dbCustCount: ${dbCustCount}`,
      `API: ${s?.totalCustomers}`,
      s?.totalCustomers === dbCustCount
    );

    recordTest('TC-DASH-05', 'Dashboard Purchases count matches MySQL COUNT(*)',
      `dbPurCount: ${dbPurCount}`,
      `API: ${s?.totalPurchases}`,
      s?.totalPurchases === dbPurCount
    );

    recordTest('TC-DASH-06', 'Dashboard Sales count matches MySQL COUNT(*)',
      `dbSaleCount: ${dbSaleCount}`,
      `API: ${s?.totalSales}`,
      s?.totalSales === dbSaleCount
    );

    recordTest('TC-DASH-07', 'Dashboard Low Stock count matches MySQL (Stock <= Reorder)',
      `dbLowStockCount: ${dbLowStockCount}`,
      `API: ${s?.lowStockCount}`,
      s?.lowStockCount === dbLowStockCount
    );

    recordTest('TC-DASH-08', 'Dashboard Inventory Valuation matches MySQL SUM(Stock * Price)',
      `dbValuation: ₹${parseFloat(dbValuation).toFixed(2)}`,
      `API: ₹${parseFloat(s?.totalInventoryValuation).toFixed(2)}`,
      Math.abs(s?.totalInventoryValuation - dbValuation) < 0.01
    );

    // ------------------------------------------------------------------------
    // SECTION 3: PRODUCT MANAGEMENT END-TO-END
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Product CRUD & Domain Constraints ---');
    // 3.1 Create Product
    const newProdPayload = {
      Product_Name: 'Logitech MX Master 3S Wireless Mouse',
      Category_ID: 1,
      Price: 9495.00,
      Stock_Quantity: 15,
      Reorder_Level: 4
    };
    const createProdRes = await apiRequest('/products', { method: 'POST', body: JSON.stringify(newProdPayload) });
    const createdProdId = createProdRes.data?.data?.Product_ID;

    // Direct MySQL verification
    const [dbProdRows] = await dbPool.query('SELECT * FROM Product WHERE Product_ID = ?', [createdProdId]);
    recordTest('TC-PROD-01', 'Add Product through API and verify in MySQL',
      `Product created and exists in DB: ${newProdPayload.Product_Name}`,
      `MySQL found: ID ${dbProdRows[0]?.Product_ID}, Name: ${dbProdRows[0]?.Product_Name}`,
      createProdRes.status === 201 && dbProdRows.length === 1 && dbProdRows[0].Product_Name === newProdPayload.Product_Name
    );

    // 3.2 Edit Product
    const editProdPayload = {
      Product_Name: 'Logitech MX Master 3S Wireless Mouse (Black)',
      Category_ID: 1,
      Price: 8995.00,
      Stock_Quantity: 20,
      Reorder_Level: 5
    };
    const editProdRes = await apiRequest(`/products/${createdProdId}`, { method: 'PUT', body: JSON.stringify(editProdPayload) });
    const [dbProdEdited] = await dbPool.query('SELECT Price, Stock_Quantity, Product_Name FROM Product WHERE Product_ID = ?', [createdProdId]);
    recordTest('TC-PROD-02', 'Edit Product through API and verify updated price/stock in MySQL',
      'Price: 8995.00, Stock: 20',
      `MySQL values: Price: ${dbProdEdited[0]?.Price}, Stock: ${dbProdEdited[0]?.Stock_Quantity}`,
      editProdRes.status === 200 && dbProdEdited[0]?.Price === 8995.00 && dbProdEdited[0]?.Stock_Quantity === 20
    );

    // 3.3 Search Product
    const searchProdRes = await apiRequest('/products?search=Master+3S');
    recordTest('TC-PROD-03', 'Search Product by keyword "Master 3S"',
      'Finds created product in search results',
      `Found ${searchProdRes.data?.data?.length} products matching query`,
      searchProdRes.data?.data?.some(p => p.Product_ID === createdProdId)
    );

    // 3.4 Delete unreferenced Product
    const delProdRes = await apiRequest(`/products/${createdProdId}`, { method: 'DELETE' });
    const [dbProdAfterDel] = await dbPool.query('SELECT * FROM Product WHERE Product_ID = ?', [createdProdId]);
    recordTest('TC-PROD-04', 'Delete unreferenced Product and verify removal from MySQL',
      'Deleted product no longer exists in MySQL',
      `MySQL record count: ${dbProdAfterDel.length}`,
      delProdRes.status === 200 && dbProdAfterDel.length === 0
    );

    // 3.5 Negative price constraint check
    const badPriceRes = await apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify({ Product_Name: 'Invalid', Category_ID: 1, Price: -100, Stock_Quantity: 5, Reorder_Level: 2 })
    });
    recordTest('TC-PROD-05', 'Validation: Reject negative product price',
      'HTTP 400 Bad Request',
      `HTTP ${badPriceRes.status}: ${badPriceRes.data?.message}`,
      badPriceRes.status === 400
    );

    // 3.6 Negative stock constraint check
    const badStockRes = await apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify({ Product_Name: 'Invalid', Category_ID: 1, Price: 100, Stock_Quantity: -5, Reorder_Level: 2 })
    });
    recordTest('TC-PROD-06', 'Validation: Reject negative stock quantity',
      'HTTP 400 Bad Request',
      `HTTP ${badStockRes.status}: ${badStockRes.data?.message}`,
      badStockRes.status === 400
    );

    // 3.7 Non-existent category check
    const badCatRes = await apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify({ Product_Name: 'Invalid', Category_ID: 99999, Price: 100, Stock_Quantity: 5, Reorder_Level: 2 })
    });
    recordTest('TC-PROD-07', 'Validation: Reject non-existent Category_ID',
      'HTTP 400 Bad Request',
      `HTTP ${badCatRes.status}: ${badCatRes.data?.message}`,
      badCatRes.status === 400
    );

    // ------------------------------------------------------------------------
    // SECTION 4: CATEGORY MANAGEMENT & FK RESTRICT
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Category CRUD & Referential Protection ---');
    // 4.1 Create Category
    const createCatRes = await apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify({ Category_Name: 'Audio Equipment', Description: 'Headphones and audio interfaces' })
    });
    const createdCatId = createCatRes.data?.data?.Category_ID;
    const [dbCatRows] = await dbPool.query('SELECT * FROM Category WHERE Category_ID = ?', [createdCatId]);
    recordTest('TC-CAT-01', 'Add Category and verify existence in MySQL',
      'Category created in MySQL',
      `Found Category ID ${dbCatRows[0]?.Category_ID}`,
      createCatRes.status === 201 && dbCatRows.length === 1
    );

    // 4.2 Edit Category
    const editCatRes = await apiRequest(`/categories/${createdCatId}`, {
      method: 'PUT',
      body: JSON.stringify({ Category_Name: 'Pro Audio Equipment', Description: 'Updated description' })
    });
    const [dbCatEdited] = await dbPool.query('SELECT Category_Name FROM Category WHERE Category_ID = ?', [createdCatId]);
    recordTest('TC-CAT-02', 'Edit Category and verify update in MySQL',
      'Category name updated to "Pro Audio Equipment"',
      `MySQL name: ${dbCatEdited[0]?.Category_Name}`,
      editCatRes.status === 200 && dbCatEdited[0]?.Category_Name === 'Pro Audio Equipment'
    );

    // 4.3 Attempt deletion of Category 1 (Contains products - FK RESTRICT)
    const delReferencedCat = await apiRequest('/categories/1', { method: 'DELETE' });
    const [dbCat1StillExists] = await dbPool.query('SELECT Category_ID FROM Category WHERE Category_ID = 1');
    recordTest('TC-CAT-03', 'Prevent deletion of Category #1 referenced by products (FK RESTRICT)',
      'HTTP 400 error and Category #1 remains in MySQL',
      `HTTP ${delReferencedCat.status}, Category #1 in DB: ${dbCat1StillExists.length === 1}`,
      delReferencedCat.status === 400 && dbCat1StillExists.length === 1
    );

    // 4.4 Delete unreferenced category
    const delCatRes = await apiRequest(`/categories/${createdCatId}`, { method: 'DELETE' });
    const [dbCatAfterDel] = await dbPool.query('SELECT * FROM Category WHERE Category_ID = ?', [createdCatId]);
    recordTest('TC-CAT-04', 'Delete unreferenced Category and verify removal in MySQL',
      'Deleted category removed from MySQL',
      `MySQL record count: ${dbCatAfterDel.length}`,
      delCatRes.status === 200 && dbCatAfterDel.length === 0
    );

    // ------------------------------------------------------------------------
    // SECTION 5: SUPPLIER MANAGEMENT & FK RESTRICT
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Supplier Directory & Referential Protection ---');
    const newSuppPayload = {
      Supplier_Name: 'Hindustan Hardware Distributors',
      Phone: '+91 98765 43210',
      Email: 'contact@hindustanhw.in',
      Address: 'Industrial Area Phase 2, Chandigarh - 160002'
    };
    const createSuppRes = await apiRequest('/suppliers', { method: 'POST', body: JSON.stringify(newSuppPayload) });
    const createdSuppId = createSuppRes.data?.data?.Supplier_ID;
    const [dbSuppRows] = await dbPool.query('SELECT * FROM Supplier WHERE Supplier_ID = ?', [createdSuppId]);
    recordTest('TC-SUPP-01', 'Add Supplier and verify in MySQL',
      'Supplier created in MySQL',
      `Found Supplier ID: ${dbSuppRows[0]?.Supplier_ID}`,
      createSuppRes.status === 201 && dbSuppRows.length === 1
    );

    // Attempt deleting Supplier 1 (has purchase history)
    const delSupp1Res = await apiRequest('/suppliers/1', { method: 'DELETE' });
    const [dbSupp1StillExists] = await dbPool.query('SELECT Supplier_ID FROM Supplier WHERE Supplier_ID = 1');
    recordTest('TC-SUPP-02', 'Prevent deletion of Supplier #1 with purchase orders (FK RESTRICT)',
      'HTTP 400 error and Supplier #1 remains in MySQL',
      `HTTP ${delSupp1Res.status}, Supplier #1 in DB: ${dbSupp1StillExists.length === 1}`,
      delSupp1Res.status === 400 && dbSupp1StillExists.length === 1
    );

    // Delete unreferenced supplier
    const delSuppRes = await apiRequest(`/suppliers/${createdSuppId}`, { method: 'DELETE' });
    const [dbSuppAfterDel] = await dbPool.query('SELECT * FROM Supplier WHERE Supplier_ID = ?', [createdSuppId]);
    recordTest('TC-SUPP-03', 'Delete unreferenced Supplier and verify removal in MySQL',
      'Supplier removed from MySQL',
      `MySQL record count: ${dbSuppAfterDel.length}`,
      delSuppRes.status === 200 && dbSuppAfterDel.length === 0
    );

    // ------------------------------------------------------------------------
    // SECTION 6: CUSTOMER MANAGEMENT & FK RESTRICT
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Customer Directory & Referential Protection ---');
    const newCustPayload = {
      Customer_Name: 'Sunil Gavaskar Enterprises',
      Phone: '+91 98200 11223',
      Email: 'sunil@gavaskarenterprise.com',
      Address: 'Marine Drive, Nariman Point, Mumbai - 400021'
    };
    const createCustRes = await apiRequest('/customers', { method: 'POST', body: JSON.stringify(newCustPayload) });
    const createdCustId = createCustRes.data?.data?.Customer_ID;
    const [dbCustRows] = await dbPool.query('SELECT * FROM Customer WHERE Customer_ID = ?', [createdCustId]);
    recordTest('TC-CUST-01', 'Add Customer and verify in MySQL',
      'Customer created in MySQL',
      `Found Customer ID: ${dbCustRows[0]?.Customer_ID}`,
      createCustRes.status === 201 && dbCustRows.length === 1
    );

    // Attempt deleting Customer 1 (has sales history)
    const delCust1Res = await apiRequest('/customers/1', { method: 'DELETE' });
    const [dbCust1StillExists] = await dbPool.query('SELECT Customer_ID FROM Customer WHERE Customer_ID = 1');
    recordTest('TC-CUST-02', 'Prevent deletion of Customer #1 with sales invoices (FK RESTRICT)',
      'HTTP 400 error and Customer #1 remains in MySQL',
      `HTTP ${delCust1Res.status}, Customer #1 in DB: ${dbCust1StillExists.length === 1}`,
      delCust1Res.status === 400 && dbCust1StillExists.length === 1
    );

    // Delete unreferenced customer
    const delCustRes = await apiRequest(`/customers/${createdCustId}`, { method: 'DELETE' });
    const [dbCustAfterDel] = await dbPool.query('SELECT * FROM Customer WHERE Customer_ID = ?', [createdCustId]);
    recordTest('TC-CUST-03', 'Delete unreferenced Customer and verify removal in MySQL',
      'Customer removed from MySQL',
      `MySQL record count: ${dbCustAfterDel.length}`,
      delCustRes.status === 200 && dbCustAfterDel.length === 0
    );

    // ------------------------------------------------------------------------
    // SECTION 7: MULTI-PRODUCT PURCHASE TRANSACTION (At least 3 Products)
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Multi-Product Purchase (Stock Inflow & Total Calculation) ---');
    // Initial stocks of Product 1, 2, 6
    const [[p1Init]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[p2Init]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    const [[p6Init]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 6');

    const multiPurchasePayload = {
      Supplier_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 5, Unit_Price: 2100.00 }, // 10,500.00
        { Product_ID: 2, Quantity: 10, Unit_Price: 320.00 }, //  3,200.00
        { Product_ID: 6, Quantity: 15, Unit_Price: 500.00 }  //  7,500.00
      ] // Grand Total: 21,200.00
    };

    const multiPurRes = await apiRequest('/purchases', { method: 'POST', body: JSON.stringify(multiPurchasePayload) });
    const purId = multiPurRes.data?.data?.Purchase_ID;

    // Direct MySQL verification of header and details
    const [dbPurHeader] = await dbPool.query('SELECT * FROM Purchase WHERE Purchase_ID = ?', [purId]);
    const [dbPurDetails] = await dbPool.query('SELECT * FROM Purchase_Details WHERE Purchase_ID = ? ORDER BY Product_ID', [purId]);
    const [[{ detailsSum }]] = await dbPool.query('SELECT SUM(Quantity * Unit_Price) AS detailsSum FROM Purchase_Details WHERE Purchase_ID = ?', [purId]);

    recordTest('TC-PUR-01', 'Multi-product purchase creates Purchase header in MySQL with exact calculated total',
      'Header Total = 21,200.00',
      `MySQL Total_Amount = ${dbPurHeader[0]?.Total_Amount}`,
      multiPurRes.status === 201 && dbPurHeader[0]?.Total_Amount === 21200.00
    );

    recordTest('TC-PUR-02', 'Multi-product purchase creates 3 separate Purchase_Details records in MySQL',
      '3 detail rows created',
      `Found ${dbPurDetails.length} detail rows in MySQL`,
      dbPurDetails.length === 3
    );

    recordTest('TC-PUR-03', 'Total_Amount equals SUM(Quantity * Unit_Price) across all detail rows',
      `Header Total 21200.00 == Details Sum ${detailsSum}`,
      `Header: ${dbPurHeader[0]?.Total_Amount}, Details Sum: ${detailsSum}`,
      dbPurHeader[0]?.Total_Amount === detailsSum
    );

    // Direct MySQL verification of stock increments
    const [[p1AfterPur]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[p2AfterPur]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    const [[p6AfterPur]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 6');

    recordTest('TC-PUR-04', 'Stock increased for Product 1 in MySQL (+5)',
      `Stock = ${p1Init.Stock_Quantity + 5}`,
      `Stock in MySQL = ${p1AfterPur.Stock_Quantity}`,
      p1AfterPur.Stock_Quantity === p1Init.Stock_Quantity + 5
    );

    recordTest('TC-PUR-05', 'Stock increased for Product 2 in MySQL (+10)',
      `Stock = ${p2Init.Stock_Quantity + 10}`,
      `Stock in MySQL = ${p2AfterPur.Stock_Quantity}`,
      p2AfterPur.Stock_Quantity === p2Init.Stock_Quantity + 10
    );

    recordTest('TC-PUR-06', 'Stock increased for Product 6 in MySQL (+15)',
      `Stock = ${p6Init.Stock_Quantity + 15}`,
      `Stock in MySQL = ${p6AfterPur.Stock_Quantity}`,
      p6AfterPur.Stock_Quantity === p6Init.Stock_Quantity + 15
    );

    // ------------------------------------------------------------------------
    // SECTION 8: MULTI-PRODUCT SALE TRANSACTION (At least 3 Products)
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Multi-Product Sale (Stock Outflow & Total Calculation) ---');
    const multiSalePayload = {
      Customer_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 2, Unit_Price: 2650.00 }, // 5,300.00
        { Product_ID: 2, Quantity: 4, Unit_Price: 450.00 },  // 1,800.00
        { Product_ID: 6, Quantity: 5, Unit_Price: 650.00 }   // 3,250.00
      ] // Grand Total: 10,350.00
    };

    const multiSaleRes = await apiRequest('/sales', { method: 'POST', body: JSON.stringify(multiSalePayload) });
    const saleId = multiSaleRes.data?.data?.Sale_ID;

    // Direct MySQL verification of header and details
    const [dbSaleHeader] = await dbPool.query('SELECT * FROM Sale WHERE Sale_ID = ?', [saleId]);
    const [dbSaleDetails] = await dbPool.query('SELECT * FROM Sale_Details WHERE Sale_ID = ? ORDER BY Product_ID', [saleId]);
    const [[{ saleDetailsSum }]] = await dbPool.query('SELECT SUM(Quantity * Unit_Price) AS saleDetailsSum FROM Sale_Details WHERE Sale_ID = ?', [saleId]);

    recordTest('TC-SALE-01', 'Multi-product sale creates Sale header in MySQL with exact calculated total',
      'Header Total = 10,350.00',
      `MySQL Total_Amount = ${dbSaleHeader[0]?.Total_Amount}`,
      multiSaleRes.status === 201 && dbSaleHeader[0]?.Total_Amount === 10350.00
    );

    recordTest('TC-SALE-02', 'Multi-product sale creates 3 separate Sale_Details records in MySQL',
      '3 detail rows created',
      `Found ${dbSaleDetails.length} detail rows in MySQL`,
      dbSaleDetails.length === 3
    );

    recordTest('TC-SALE-03', 'Total_Amount equals SUM(Quantity * Unit_Price) across all sale detail rows',
      `Header Total 10350.00 == Details Sum ${saleDetailsSum}`,
      `Header: ${dbSaleHeader[0]?.Total_Amount}, Details Sum: ${saleDetailsSum}`,
      dbSaleHeader[0]?.Total_Amount === saleDetailsSum
    );

    // Direct MySQL verification of stock decrements
    const [[p1AfterSale]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[p2AfterSale]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 2');
    const [[p6AfterSale]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 6');

    recordTest('TC-SALE-04', 'Stock decreased for Product 1 in MySQL (-2)',
      `Stock = ${p1AfterPur.Stock_Quantity - 2}`,
      `Stock in MySQL = ${p1AfterSale.Stock_Quantity}`,
      p1AfterSale.Stock_Quantity === p1AfterPur.Stock_Quantity - 2
    );

    recordTest('TC-SALE-05', 'Stock decreased for Product 2 in MySQL (-4)',
      `Stock = ${p2AfterPur.Stock_Quantity - 4}`,
      `Stock in MySQL = ${p2AfterSale.Stock_Quantity}`,
      p2AfterSale.Stock_Quantity === p2AfterPur.Stock_Quantity - 4
    );

    recordTest('TC-SALE-06', 'Stock decreased for Product 6 in MySQL (-5)',
      `Stock = ${p6AfterPur.Stock_Quantity - 5}`,
      `Stock in MySQL = ${p6AfterSale.Stock_Quantity}`,
      p6AfterSale.Stock_Quantity === p6AfterPur.Stock_Quantity - 5
    );

    // ------------------------------------------------------------------------
    // SECTION 9: CRITICAL ATOMIC ROLLBACK TEST (Insufficient Stock)
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Critical Atomic Rollback Verification ---');
    // Product 1: Has ample stock (approx 31)
    // Product 4: Current stock is 4 units. Requesting 100 units.
    const [[p1PreFail]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[p4PreFail]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 4');
    const [[{ salesCountBefore }]] = await dbPool.query('SELECT COUNT(*) AS salesCountBefore FROM Sale');
    const [[{ saleDetailsCountBefore }]] = await dbPool.query('SELECT COUNT(*) AS saleDetailsCountBefore FROM Sale_Details');

    const rollbackSalePayload = {
      Customer_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 3, Unit_Price: 2650.00 }, // Valid item
        { Product_ID: 4, Quantity: 100, Unit_Price: 5600.00 } // INSUFFICIENT ITEM!
      ]
    };

    const failSaleRes = await apiRequest('/sales', { method: 'POST', body: JSON.stringify(rollbackSalePayload) });

    recordTest('TC-ROLLBACK-01', 'Sale rejected with HTTP 400 Bad Request when one product has insufficient stock',
      'HTTP 400 with "Insufficient stock available" and "Entire sale cancelled"',
      `HTTP ${failSaleRes.status}: ${failSaleRes.data?.message}`,
      failSaleRes.status === 400 &&
      failSaleRes.data?.message?.includes('Insufficient stock available') &&
      failSaleRes.data?.message?.includes('Entire sale cancelled')
    );

    // Check MySQL state directly
    const [[{ salesCountAfter }]] = await dbPool.query('SELECT COUNT(*) AS salesCountAfter FROM Sale');
    const [[{ saleDetailsCountAfter }]] = await dbPool.query('SELECT COUNT(*) AS saleDetailsCountAfter FROM Sale_Details');
    const [[p1PostFail]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 1');
    const [[p4PostFail]] = await dbPool.query('SELECT Stock_Quantity FROM Product WHERE Product_ID = 4');

    recordTest('TC-ROLLBACK-02', 'Verify NO Sale header was committed to MySQL',
      `Sales count before (${salesCountBefore}) == after (${salesCountAfter})`,
      `Before: ${salesCountBefore}, After: ${salesCountAfter}`,
      salesCountAfter === salesCountBefore
    );

    recordTest('TC-ROLLBACK-03', 'Verify NO orphan Sale_Details rows were committed to MySQL',
      `Sale_Details count before (${saleDetailsCountBefore}) == after (${saleDetailsCountAfter})`,
      `Before: ${saleDetailsCountBefore}, After: ${saleDetailsCountAfter}`,
      saleDetailsCountAfter === saleDetailsCountBefore
    );

    recordTest('TC-ROLLBACK-04', 'Verify Product 1 stock was NOT partially decreased (Atomic Rollback)',
      `Product 1 stock remains: ${p1PreFail.Stock_Quantity}`,
      `Product 1 stock in MySQL: ${p1PostFail.Stock_Quantity}`,
      p1PostFail.Stock_Quantity === p1PreFail.Stock_Quantity
    );

    recordTest('TC-ROLLBACK-05', 'Verify Product 4 stock was NOT altered',
      `Product 4 stock remains: ${p4PreFail.Stock_Quantity}`,
      `Product 4 stock in MySQL: ${p4PostFail.Stock_Quantity}`,
      p4PostFail.Stock_Quantity === p4PreFail.Stock_Quantity
    );

    // ------------------------------------------------------------------------
    // SECTION 10: LOW STOCK ALERTS & DYNAMIC STATUS TRANSITION
    // ------------------------------------------------------------------------
    console.log('\n--- 10. Low-Stock Detection & Dynamic Threshold Transition ---');
    const lowStockRes = await apiRequest('/products/low-stock');
    const lowStockList = lowStockRes.data?.data || [];

    recordTest('TC-LOW-01', 'Retrieve low-stock products satisfying Stock_Quantity <= Reorder_Level',
      'All returned products have Stock_Quantity <= Reorder_Level',
      `${lowStockList.length} products found`,
      lowStockList.length > 0 && lowStockList.every(p => p.Stock_Quantity <= p.Reorder_Level)
    );

    recordTest('TC-LOW-02', 'Verify calculated Reorder_Deficit equals Reorder_Level - Stock_Quantity',
      'Reorder_Deficit == Reorder_Level - Stock_Quantity for all products',
      'Verified across all low stock items',
      lowStockList.every(p => p.Reorder_Deficit === (p.Reorder_Level - p.Stock_Quantity))
    );

    // ------------------------------------------------------------------------
    // SECTION 11: CLEANUP TEST TRANSACTIONS & RESTORE BASELINE
    // ------------------------------------------------------------------------
    console.log('\n--- 11. Cleanup Test Transactions & Restore Original Baseline ---');
    // Remove the test purchase and test sale created in sections 7 and 8
    await dbPool.query('DELETE FROM Sale WHERE Sale_ID = ?', [saleId]);
    await dbPool.query('DELETE FROM Purchase WHERE Purchase_ID = ?', [purId]);

    // Restore baseline stocks for Product 1 (28), Product 2 (45), Product 6 (50)
    await dbPool.query('UPDATE Product SET Stock_Quantity = 28 WHERE Product_ID = 1');
    await dbPool.query('UPDATE Product SET Stock_Quantity = 45 WHERE Product_ID = 2');
    await dbPool.query('UPDATE Product SET Stock_Quantity = 50 WHERE Product_ID = 6');

    // Verify exact final sample counts
    const [[cCat]] = await dbPool.query('SELECT COUNT(*) as c FROM Category');
    const [[cProd]] = await dbPool.query('SELECT COUNT(*) as c FROM Product');
    const [[cSupp]] = await dbPool.query('SELECT COUNT(*) as c FROM Supplier');
    const [[cCust]] = await dbPool.query('SELECT COUNT(*) as c FROM Customer');
    const [[cPur]] = await dbPool.query('SELECT COUNT(*) as c FROM Purchase');
    const [[cPurDet]] = await dbPool.query('SELECT COUNT(*) as c FROM Purchase_Details');
    const [[cSale]] = await dbPool.query('SELECT COUNT(*) as c FROM Sale');
    const [[cSaleDet]] = await dbPool.query('SELECT COUNT(*) as c FROM Sale_Details');

    recordTest('TC-CLEAN-01', 'Final Category count restored to exact 5 records', '5', `${cCat.c}`, cCat.c === 5);
    recordTest('TC-CLEAN-02', 'Final Product count restored to exact 14 records', '14', `${cProd.c}`, cProd.c === 14);
    recordTest('TC-CLEAN-03', 'Final Supplier count restored to exact 5 records', '5', `${cSupp.c}`, cSupp.c === 5);
    recordTest('TC-CLEAN-04', 'Final Customer count restored to exact 6 records', '6', `${cCust.c}`, cCust.c === 6);
    recordTest('TC-CLEAN-05', 'Final Purchase count restored to exact 5 records (1001-1005)', '5', `${cPur.c}`, cPur.c === 5);
    recordTest('TC-CLEAN-06', 'Final Purchase_Details count restored to exact 12 records', '12', `${cPurDet.c}`, cPurDet.c === 12);
    recordTest('TC-CLEAN-07', 'Final Sale count restored to exact 5 records (5001-5005)', '5', `${cSale.c}`, cSale.c === 5);
    recordTest('TC-CLEAN-08', 'Final Sale_Details count restored to exact 11 records', '11', `${cSaleDet.c}`, cSaleDet.c === 11);

  } catch (err) {
    console.error('Fatal test error:', err);
    failedTests++;
  } finally {
    if (dbPool) await dbPool.end();
    console.log('\n================================================================');
    console.log(` INTEGRATION SUMMARY: ${passedTests} of ${totalTests} CHECKS PASSED (${failedTests} FAILED)`);
    console.log('================================================================\n');
  }

  return { totalTests, passedTests, failedTests, records: testReportRecords };
}

if (require.main === module) {
  runEndToEndIntegration().then(res => {
    process.exit(res.failedTests > 0 ? 1 : 0);
  });
}

module.exports = { runEndToEndIntegration };
