# Master Testing Report: Inventory Management System

**Academic Degree**: B.Tech CSE (Database Management Systems)  
**Database**: MySQL Community Server 26.7.0 (InnoDB)  
**Backend**: Node.js v24.11.1 + Express 4.19.2 + `mysql2/promise`  
**Frontend**: HTML5 + CSS3 + Bootstrap 5 + Vanilla JavaScript  
**Overall Testing Result**: **54 / 54 TESTS PASSED (100% SUCCESS)**  

---

## 1. Testing Strategy & Methodology

The testing program was executed systematically across multiple levels:
1. **Database Constraint & Integrity Testing**: Tested primary keys, foreign keys (`RESTRICT` / `CASCADE`), and check constraints (`CHECK (Price >= 0)`, `CHECK (Stock_Quantity >= 0)`).
2. **API & Transaction Testing (Phase 4)**: 36 automated tests evaluating CRUD operations, multi-product order generation, and stock recalculation.
3. **Frontend Workflow Simulation (Phase 5)**: 49 browser-equivalent workflow tests checking DOM data synchronization, dynamic line item totals, and user warning prompts.
4. **End-to-End System Integration Testing (Phase 6)**: 54 comprehensive tests directly validating the entire pipeline from HTTP request to MySQL table verification.
5. **SQL Regression Testing**: Verifying all analytical queries and views against post-test data.
6. **Data Cleanup Verification**: Confirming zero temporary test data leakage into the sample database.

---

## 2. Master Test Matrix (Phase 6 End-to-End Suite)

| Test ID | Test Category & Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-SYS-01** | Backend Health & Lifecycle Check | HTTP 200 with status: OK | HTTP 200, status: OK | **PASS** |
| **TC-SYS-02** | Direct MySQL 26.7 Connection Verification | Connected to MySQL 26.7.0 | Connected to MySQL 26.7.0 | **PASS** |
| **TC-DASH-01** | Dashboard Product Count vs. MySQL `COUNT(*)` | Exact match (14) | UI/API: 14 == MySQL: 14 | **PASS** |
| **TC-DASH-02** | Dashboard Category Count vs. MySQL `COUNT(*)` | Exact match (5) | UI/API: 5 == MySQL: 5 | **PASS** |
| **TC-DASH-03** | Dashboard Supplier Count vs. MySQL `COUNT(*)` | Exact match (5) | UI/API: 5 == MySQL: 5 | **PASS** |
| **TC-DASH-04** | Dashboard Customer Count vs. MySQL `COUNT(*)` | Exact match (6) | UI/API: 6 == MySQL: 6 | **PASS** |
| **TC-DASH-05** | Dashboard Purchase Count vs. MySQL `COUNT(*)` | Exact match (5) | UI/API: 5 == MySQL: 5 | **PASS** |
| **TC-DASH-06** | Dashboard Sales Count vs. MySQL `COUNT(*)` | Exact match (5) | UI/API: 5 == MySQL: 5 | **PASS** |
| **TC-DASH-07** | Dashboard Low-Stock Count vs. MySQL `Stock <= Reorder` | Exact match (5) | UI/API: 5 == MySQL: 5 | **PASS** |
| **TC-DASH-08** | Inventory Valuation vs. MySQL `SUM(Stock * Price)` | Exact match (₹3,85,030.00) | UI/API: ₹3,85,030.00 == MySQL: ₹3,85,030.00 | **PASS** |
| **TC-PROD-01** | Create Product through API & verify in MySQL | Product record stored in MySQL | Verified in MySQL: ID 15 generated | **PASS** |
| **TC-PROD-02** | Edit Product details & verify in MySQL | Price: 8995.00, Stock: 20 updated | MySQL values verified | **PASS** |
| **TC-PROD-03** | Search Product by keyword in catalog | Returns matching records | Found matching product | **PASS** |
| **TC-PROD-04** | Delete unreferenced Product & verify MySQL | Record count in MySQL becomes 0 | Record removed from MySQL | **PASS** |
| **TC-PROD-05** | Validation: Reject negative price (-100) | HTTP 400 Bad Request | HTTP 400: Price must be non-negative | **PASS** |
| **TC-PROD-06** | Validation: Reject negative stock (-5) | HTTP 400 Bad Request | HTTP 400: Stock must be non-negative | **PASS** |
| **TC-PROD-07** | Validation: Reject non-existent Category_ID (99999)| HTTP 400 Bad Request | HTTP 400: Category ID does not exist | **PASS** |
| **TC-CAT-01** | Create Category & verify existence in MySQL | Category created in MySQL | Verified Category in MySQL | **PASS** |
| **TC-CAT-02** | Edit Category & verify update in MySQL | Category updated in MySQL | Name updated to "Pro Audio Equipment" | **PASS** |
| **TC-CAT-03** | FK Protection: Reject deleting Category 1 with products | HTTP 400 error; Category 1 preserved | HTTP 400: products belong to it | **PASS** |
| **TC-CAT-04** | Delete unreferenced Category & verify in MySQL | Record removed from MySQL | Record count in MySQL = 0 | **PASS** |
| **TC-SUPP-01** | Create Supplier & verify existence in MySQL | Supplier created in MySQL | Verified Supplier in MySQL | **PASS** |
| **TC-SUPP-02** | FK Protection: Reject deleting Supplier 1 with POs | HTTP 400 error; Supplier 1 preserved | HTTP 400: historical POs reference it | **PASS** |
| **TC-SUPP-03** | Delete unreferenced Supplier & verify in MySQL | Supplier removed from MySQL | Record count in MySQL = 0 | **PASS** |
| **TC-CUST-01** | Create Customer & verify existence in MySQL | Customer created in MySQL | Verified Customer in MySQL | **PASS** |
| **TC-CUST-02** | FK Protection: Reject deleting Customer 1 with sales| HTTP 400 error; Customer 1 preserved | HTTP 400: sales invoices reference it | **PASS** |
| **TC-CUST-03** | Delete unreferenced Customer & verify in MySQL | Customer removed from MySQL | Record count in MySQL = 0 | **PASS** |
| **TC-PUR-01** | Multi-product purchase creates `Purchase` header | Header created with exact calculated total | Total_Amount = ₹21,200.00 in MySQL | **PASS** |
| **TC-PUR-02** | Multi-product purchase creates 3 line items | 3 detail rows created in `Purchase_Details`| Exactly 3 rows created in MySQL | **PASS** |
| **TC-PUR-03** | Header total matches `SUM(Quantity * Unit_Price)` | Header Total == Detail Rows Sum | Header: 21200.00 == Details: 21200.00 | **PASS** |
| **TC-PUR-04** | Stock increment verified in MySQL: Product 1 (+5) | Product 1 stock: 28 $\to$ 33 | Product 1 stock in MySQL = 33 | **PASS** |
| **TC-PUR-05** | Stock increment verified in MySQL: Product 2 (+10)| Product 2 stock: 45 $\to$ 55 | Product 2 stock in MySQL = 55 | **PASS** |
| **TC-PUR-06** | Stock increment verified in MySQL: Product 6 (+15)| Product 6 stock: 50 $\to$ 65 | Product 6 stock in MySQL = 65 | **PASS** |
| **TC-SALE-01** | Multi-product sale creates `Sale` header | Header created with exact calculated total | Total_Amount = ₹10,350.00 in MySQL | **PASS** |
| **TC-SALE-02** | Multi-product sale creates 3 line items | 3 detail rows created in `Sale_Details` | Exactly 3 rows created in MySQL | **PASS** |
| **TC-SALE-03** | Header total matches `SUM(Quantity * Unit_Price)` | Header Total == Detail Rows Sum | Header: 10350.00 == Details: 10350.00 | **PASS** |
| **TC-SALE-04** | Stock decrement verified in MySQL: Product 1 (-2) | Product 1 stock: 33 $\to$ 31 | Product 1 stock in MySQL = 31 | **PASS** |
| **TC-SALE-05** | Stock decrement verified in MySQL: Product 2 (-4) | Product 2 stock: 55 $\to$ 51 | Product 2 stock in MySQL = 51 | **PASS** |
| **TC-SALE-06** | Stock decrement verified in MySQL: Product 6 (-5) | Product 6 stock: 65 $\to$ 60 | Product 6 stock in MySQL = 60 | **PASS** |
| **TC-ROLLBACK-01**| Reject sale when requested qty > available stock | HTTP 400 Bad Request | HTTP 400: "Insufficient stock available" | **PASS** |
| **TC-ROLLBACK-02**| Atomic Rollback: Verify NO orphan `Sale` header | Zero new Sale records committed | Sale record count before == after | **PASS** |
| **TC-ROLLBACK-03**| Atomic Rollback: Verify NO `Sale_Details` rows | Zero new Sale_Details rows committed | Sale_Details count before == after | **PASS** |
| **TC-ROLLBACK-04**| Atomic Rollback: Verify Product 1 stock untouched | Product 1 stock remained at 31 | Verified in MySQL | **PASS** |
| **TC-ROLLBACK-05**| Atomic Rollback: Verify Product 4 stock untouched | Product 4 stock remained at 4 | Verified in MySQL | **PASS** |
| **TC-LOW-01** | Filter low-stock products (`Stock <= Reorder`) | Returns 5 low-stock products | 5 low-stock products returned | **PASS** |
| **TC-LOW-02** | Compute `Reorder_Deficit` correctly | `Deficit = Reorder_Level - Stock_Quantity` | Verified across all low-stock items | **PASS** |
| **TC-CLEAN-01** | Final baseline restoration: `Category` count | Exact 5 records | 5 records in MySQL | **PASS** |
| **TC-CLEAN-02** | Final baseline restoration: `Product` count | Exact 14 records | 14 records in MySQL | **PASS** |
| **TC-CLEAN-03** | Final baseline restoration: `Supplier` count | Exact 5 records | 5 records in MySQL | **PASS** |
| **TC-CLEAN-04** | Final baseline restoration: `Customer` count | Exact 6 records | 6 records in MySQL | **PASS** |
| **TC-CLEAN-05** | Final baseline restoration: `Purchase` count | Exact 5 records (1001-1005) | 5 records in MySQL | **PASS** |
| **TC-CLEAN-06** | Final baseline restoration: `Purchase_Details` | Exact 12 records | 12 records in MySQL | **PASS** |
| **TC-CLEAN-07** | Final baseline restoration: `Sale` count | Exact 5 records (5001-5005) | 5 records in MySQL | **PASS** |
| **TC-CLEAN-08** | Final baseline restoration: `Sale_Details` | Exact 11 records | 11 records in MySQL | **PASS** |

---

## 3. SQL Regression Test Suite

All 5 core SQL query files in `database/` were executed against MySQL 26.7 after application testing:
- **`05_basic_queries.sql`**: PASSED (Projections, WHERE filtering, LIKE wildcards, ORDER BY, LIMIT).
- **`06_join_queries.sql`**: PASSED (2-table, 3-table, and 4-table INNER JOINs, and LEFT OUTER JOINs for unmatched entities).
- **`07_aggregate_queries.sql`**: PASSED (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP BY`, `HAVING`).
- **`08_subqueries.sql`**: PASSED (Scalar subqueries, `IN`, `NOT IN`, correlated subqueries, `EXISTS`, `NOT EXISTS`, derived tables).
- **`09_views.sql`**: PASSED (Created and queried all 5 database views).

---

## 4. Final Database Integrity Audit

Direct SQL audit confirms:
- **No Orphan Records**: All detail records reference valid parent orders and catalog products.
- **Header vs. Detail Consistency**: Every purchase and sale header total strictly equals $\sum(\text{Quantity} \times \text{Unit\_Price})$.
- **Zero Negative Stocks**: Verified that `Stock_Quantity >= 0` across all 14 products.
- **Original Sample Data Intact**: Final record counts match the required baseline (5 categories, 14 products, 5 suppliers, 6 customers, 5 purchases, 12 purchase details, 5 sales, 11 sale details).
