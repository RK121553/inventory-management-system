// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Phase 5 Comprehensive Frontend & Database Workflow Verification
// Simulates browser interactions against all frontend endpoints and MySQL
// ============================================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3000/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

let authToken = null;

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runWorkflowTests() {
  console.log('================================================================');
  console.log(' PHASE 5: FRONTEND WORKFLOWS & FULL-STACK INTEGRATION TEST');
  console.log('================================================================\n');

  // Authenticate as Admin
  try {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD
      })
    });
    if (loginRes.data && loginRes.data.token) {
      authToken = loginRes.data.token;
      console.log('  [AUTH] Authenticated as Admin successfully.');
    }
  } catch (e) {
    console.warn('  [AUTH] Authentication error:', e.message);
  }

  try {
    // ------------------------------------------------------------------------
    // WORKFLOW 1: Dashboard Loading & Live Aggregate Metrics
    // ------------------------------------------------------------------------
    console.log('1. Workflow: Dashboard Loading & Aggregates:');
    const dash = await request('/dashboard/stats');
    assert(dash.status === 200 && dash.data.success, 'Dashboard API returned 200 with success status');
    assert(dash.data.data.summary.totalProducts === 14, 'Dashboard confirms exactly 14 products in database');
    assert(dash.data.data.summary.totalCategories === 5, 'Dashboard confirms 5 product categories');
    assert(dash.data.data.summary.totalSuppliers === 5, 'Dashboard confirms 5 registered suppliers');
    assert(dash.data.data.summary.totalCustomers === 6, 'Dashboard confirms 6 registered customers');
    assert(dash.data.data.summary.lowStockCount === 5, 'Dashboard accurately identifies 5 low stock products');
    assert(dash.data.data.summary.totalInventoryValuation > 0, 'Dashboard computes live inventory valuation in ₹');
    assert(dash.data.data.recentPurchases.length > 0, 'Dashboard displays recent purchase inflow activities');
    assert(dash.data.data.recentSales.length > 0, 'Dashboard displays recent sales outflow activities');

    // ------------------------------------------------------------------------
    // WORKFLOW 2: Category Management & Referential Integrity Protection
    // ------------------------------------------------------------------------
    console.log('\n2. Workflow: Category CRUD & Integrity Check:');
    // Add new Category
    const createCat = await request('/categories', {
      method: 'POST',
      body: JSON.stringify({ Category_Name: 'Audio & Visual Devices', Description: 'Microphones, studio monitors, and projectors' })
    });
    assert(createCat.status === 201, 'Created new category "Audio & Visual Devices"');
    const newCatId = createCat.data.data.Category_ID;

    // Update Category
    const updateCat = await request(`/categories/${newCatId}`, {
      method: 'PUT',
      body: JSON.stringify({ Category_Name: 'Audio & Studio Gear', Description: 'Updated description' })
    });
    assert(updateCat.status === 200 && updateCat.data.data.Category_Name === 'Audio & Studio Gear', 'Updated category name and description');

    // Attempt deleting Category 1 (Contains products - must be protected)
    const delProtectedCat = await request('/categories/1', { method: 'DELETE' });
    assert(delProtectedCat.status === 400 && delProtectedCat.data.message.includes('products currently belong to it'),
      'Referential integrity blocked deletion of Category #1 with active products');

    // Delete the unreferenced temporary category
    const delNewCat = await request(`/categories/${newCatId}`, { method: 'DELETE' });
    assert(delNewCat.status === 200, 'Successfully deleted unreferenced temporary category');

    // ------------------------------------------------------------------------
    // WORKFLOW 3: Product Management, Search, & Filters
    // ------------------------------------------------------------------------
    console.log('\n3. Workflow: Product Catalog & Search/Filters:');
    // Search products by keyword
    const searchRes = await request('/products?search=Keyboard');
    assert(searchRes.data.data.some(p => p.Product_Name.includes('Keyboard')), 'Product search by "Keyboard" returned relevant matches');

    // Filter products by category
    const catFilterRes = await request('/products?category_id=1');
    assert(catFilterRes.data.data.every(p => p.Category_ID === 1), 'Category filter returned products belonging strictly to Category 1');

    // Create a new product
    const createProd = await request('/products', {
      method: 'POST',
      body: JSON.stringify({
        Product_Name: 'Sony WH-1000XM5 Wireless Headphones',
        Category_ID: 1,
        Price: 24990.00,
        Stock_Quantity: 15,
        Reorder_Level: 5
      })
    });
    assert(createProd.status === 201, 'Created new product "Sony WH-1000XM5"');
    const newProdId = createProd.data.data.Product_ID;

    // Update product price and stock
    const updateProd = await request(`/products/${newProdId}`, {
      method: 'PUT',
      body: JSON.stringify({
        Product_Name: 'Sony WH-1000XM5 Wireless Headphones',
        Category_ID: 1,
        Price: 23490.00,
        Stock_Quantity: 20,
        Reorder_Level: 5
      })
    });
    assert(updateProd.status === 200 && updateProd.data.data.Price === 23490.00, 'Updated product price successfully');

    // Delete unreferenced temporary product
    const delProd = await request(`/products/${newProdId}`, { method: 'DELETE' });
    assert(delProd.status === 200, 'Deleted temporary product');

    // ------------------------------------------------------------------------
    // WORKFLOW 4: Supplier Directory & Protection
    // ------------------------------------------------------------------------
    console.log('\n4. Workflow: Supplier Directory & Protection:');
    const suppList = await request('/suppliers');
    assert(suppList.data.data.length === 5, 'Retrieved all 5 registered suppliers with purchase counts');

    // Attempt deleting Supplier 1 (Has purchases - must be protected)
    const delSuppProtected = await request('/suppliers/1', { method: 'DELETE' });
    assert(delSuppProtected.status === 400 && delSuppProtected.data.message.includes('historical purchase orders'),
      'Referential integrity blocked deletion of Supplier #1 with purchase history');

    // ------------------------------------------------------------------------
    // WORKFLOW 5: Customer Directory & Protection
    // ------------------------------------------------------------------------
    console.log('\n5. Workflow: Customer Directory & Protection:');
    const custList = await request('/customers');
    assert(custList.data.data.length === 6, 'Retrieved all 6 registered customers with sales counts');

    // Attempt deleting Customer 1 (Has sales - must be protected)
    const delCustProtected = await request('/customers/1', { method: 'DELETE' });
    assert(delCustProtected.status === 400 && delCustProtected.data.message.includes('historical sales invoices'),
      'Referential integrity blocked deletion of Customer #1 with sales history');

    // ------------------------------------------------------------------------
    // WORKFLOW 6: MULTI-PRODUCT PURCHASE TRANSACTION (Stock Inflow)
    // ------------------------------------------------------------------------
    console.log('\n6. Workflow: Multi-Product Purchase Transaction (Stock Inflow):');
    // Fetch initial stocks of Product 1 (Keyboard) and Product 2 (Mouse)
    const p1Before = (await request('/products/1')).data.data.Stock_Quantity;
    const p2Before = (await request('/products/2')).data.data.Stock_Quantity;

    const purchasePayload = {
      Supplier_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 4, Unit_Price: 2100.00 }, // 4 * 2100 = 8400
        { Product_ID: 2, Quantity: 8, Unit_Price: 320.00 }   // 8 *  320 = 2560
      ] // Grand Total: 10,960.00
    };

    const newPurchase = await request('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchasePayload)
    });

    assert(newPurchase.status === 201 && newPurchase.data.success, 'Multi-product purchase created successfully (HTTP 201)');
    assert(newPurchase.data.data.Total_Amount === 10960.00, 'Purchase total equals exactly SUM(Quantity * Unit_Price) = ₹10,960.00');

    const createdPurchaseId = newPurchase.data.data.Purchase_ID;

    // Verify stock increment in MySQL
    const p1AfterPur = (await request('/products/1')).data.data.Stock_Quantity;
    const p2AfterPur = (await request('/products/2')).data.data.Stock_Quantity;
    assert(p1AfterPur === p1Before + 4, `Product 1 stock increased by 4 (${p1Before} -> ${p1AfterPur})`);
    assert(p2AfterPur === p2Before + 8, `Product 2 stock increased by 8 (${p2Before} -> ${p2AfterPur})`);

    // Verify fetching purchase invoice details
    const purInvoice = await request(`/purchases/${createdPurchaseId}`);
    assert(purInvoice.status === 200 && purInvoice.data.data.items.length === 2, 'Fetched complete purchase invoice with all line items');

    // ------------------------------------------------------------------------
    // WORKFLOW 7: MULTI-PRODUCT SALE TRANSACTION (Stock Outflow)
    // ------------------------------------------------------------------------
    console.log('\n7. Workflow: Multi-Product Sale Transaction (Stock Outflow):');
    const salePayload = {
      Customer_ID: 2,
      items: [
        { Product_ID: 1, Quantity: 2, Unit_Price: 2650.00 }, // 2 * 2650 = 5300
        { Product_ID: 2, Quantity: 4, Unit_Price: 450.00 }   // 4 *  450 = 1800
      ] // Grand Total: 7,100.00
    };

    const newSale = await request('/sales', {
      method: 'POST',
      body: JSON.stringify(salePayload)
    });

    assert(newSale.status === 201 && newSale.data.success, 'Multi-product sale invoice completed successfully (HTTP 201)');
    assert(newSale.data.data.Total_Amount === 7100.00, 'Sale total equals exactly SUM(Quantity * Unit_Price) = ₹7,100.00');

    const createdSaleId = newSale.data.data.Sale_ID;

    // Verify stock decrement in MySQL
    const p1AfterSale = (await request('/products/1')).data.data.Stock_Quantity;
    const p2AfterSale = (await request('/products/2')).data.data.Stock_Quantity;
    assert(p1AfterSale === p1AfterPur - 2, `Product 1 stock decreased by 2 (${p1AfterPur} -> ${p1AfterSale})`);
    assert(p2AfterSale === p2AfterPur - 4, `Product 2 stock decreased by 4 (${p2AfterPur} -> ${p2AfterSale})`);

    // Verify fetching sale invoice details
    const saleInvoice = await request(`/sales/${createdSaleId}`);
    assert(saleInvoice.status === 200 && saleInvoice.data.data.items.length === 2, 'Fetched complete sale invoice with all line items');

    // ------------------------------------------------------------------------
    // WORKFLOW 8: INSUFFICIENT STOCK VALIDATION & ATOMIC ROLLBACK
    // ------------------------------------------------------------------------
    console.log('\n8. Workflow: Insufficient Stock & Atomic Rollback:');
    // Product 4 has stock = 4. Requesting 80 units (impossible).
    // Product 1 has plenty of stock.
    const p1PreRollback = (await request('/products/1')).data.data.Stock_Quantity;
    const p4PreRollback = (await request('/products/4')).data.data.Stock_Quantity;

    const failSalePayload = {
      Customer_ID: 1,
      items: [
        { Product_ID: 1, Quantity: 2, Unit_Price: 2650.00 },
        { Product_ID: 4, Quantity: 80, Unit_Price: 5600.00 } // Insufficient!
      ]
    };

    const failSale = await request('/sales', {
      method: 'POST',
      body: JSON.stringify(failSalePayload)
    });

    assert(failSale.status === 400, 'Backend rejected sale with HTTP 400 Bad Request');
    assert(failSale.data.message.includes('Insufficient stock available'), `Error message correctly reports: "${failSale.data.message}"`);
    assert(failSale.data.message.includes('Entire sale cancelled'), 'Error message confirms: Entire sale cancelled.');

    // Confirm Product 1 stock was NOT changed (Zero partial update)
    const p1PostRollback = (await request('/products/1')).data.data.Stock_Quantity;
    const p4PostRollback = (await request('/products/4')).data.data.Stock_Quantity;
    assert(p1PostRollback === p1PreRollback, 'Product 1 stock remained unchanged after rollback');
    assert(p4PostRollback === p4PreRollback, 'Product 4 stock remained unchanged after rollback');

    // ------------------------------------------------------------------------
    // WORKFLOW 9: Low-Stock Products Section Verification
    // ------------------------------------------------------------------------
    console.log('\n9. Workflow: Low-Stock Alerts & Deficit Calculation:');
    const lowStock = await request('/products/low-stock');
    assert(lowStock.status === 200, 'Low-stock endpoint returned 200 OK');
    assert(lowStock.data.data.length >= 5, 'Detected low-stock products where Stock_Quantity <= Reorder_Level');
    lowStock.data.data.forEach(p => {
      assert(p.Stock_Quantity <= p.Reorder_Level, `Item "${p.Product_Name}" satisfies Stock (${p.Stock_Quantity}) <= Reorder (${p.Reorder_Level})`);
      assert(p.Reorder_Deficit === (p.Reorder_Level - p.Stock_Quantity), `Deficit calculation matches (${p.Reorder_Deficit} needed)`);
    });

    // ------------------------------------------------------------------------
    // WORKFLOW 10: Clean up temporary test transactions to preserve sample data
    // ------------------------------------------------------------------------
    console.log('\n10. Cleaning up test transactions:');
    // Delete test sale and purchase directly or via SQL
    const db = require('../src/config/db');
    await db.query('DELETE FROM Sale WHERE Sale_ID = ?', [createdSaleId]);
    await db.query('DELETE FROM Purchase WHERE Purchase_ID = ?', [createdPurchaseId]);
    // Reset product 1 and 2 to baseline 28 and 45
    await db.query('UPDATE Product SET Stock_Quantity = 28 WHERE Product_ID = 1');
    await db.query('UPDATE Product SET Stock_Quantity = 45 WHERE Product_ID = 2');
    await db.end();
    console.log('  Cleaned up temporary workflow transactions and restored original baseline stocks.');

  } catch (error) {
    console.error('Workflow error:', error);
  } finally {
    console.log('\n================================================================');
    console.log(` SUMMARY: ${passedTests} of ${totalTests} WORKFLOW CHECKS PASSED`);
    console.log('================================================================\n');
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runWorkflowTests();
