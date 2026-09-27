# 5-to-10 Minute Project Viva Demonstration Guide

**Project Title**: INVENTORY MANAGEMENT  
**Target Audience**: External / Internal DBMS Viva Examiners  
**Estimated Duration**: 7 to 10 Minutes  
**Prerequisites**: Server running on `http://localhost:3000`, MySQL Workbench or CLI open in background.  

---

## Demonstration Sequence

### Step 1: Dashboard & Live Aggregate Overview (1 Minute)
- **What to do**: Open `http://localhost:3000` in Google Chrome. Point to the top KPI cards and recent transactions.
- **What to say**:
  > *"Good morning/afternoon, Sir/Madam. This is our relational Inventory Management System. The dashboard calculates every single metric live from MySQL using SQL aggregate functions—nothing is hard-coded. We currently have 14 products across 5 categories, 5 suppliers, 6 customers, and an inventory valuation of ₹3,85,030.00."*
- **DBMS Concept Proved**: SQL Aggregate Functions (`COUNT`, `SUM`), Multi-table Joins, Live Data Abstraction.

---

### Step 2: Product Catalog & Domain Constraints (1 Minute)
- **What to do**: Click **Products** in the sidebar. Type `"Keyboard"` in the search bar. Show the instant search results. Clear search. Then click **"+ Add Product"** and enter a negative price (`-100`) or negative stock (`-5`). Show the system rejecting it.
- **What to say**:
  > *"Here is our Product catalog. Each item stores its selling price, current stock quantity, and reorder level. We have implemented MySQL CHECK constraints (`CHECK (Price >= 0)` and `CHECK (Stock_Quantity >= 0)`). If an operator attempts to enter a negative price or stock, the database rejects it immediately."*
- **DBMS Concept Proved**: Domain Integrity, Check Constraints, Projection & Filtering (`LIKE`, `WHERE`).

---

### Step 3: Categories & Referential Integrity (`ON DELETE RESTRICT`) (1 Minute)
- **What to do**: Click **Categories** in the sidebar. Point out that Category #1 (*Computer Peripherals*) has 3 assigned products. Click the **Delete (Trash)** icon for Category #1. Show the friendly alert popup: *"Cannot delete category: 3 products currently belong to it."*
- **What to say**:
  > *"Here we demonstrate referential integrity. Category 1 is referenced by 3 products. Because we specified `ON DELETE RESTRICT` on our foreign key constraint `fk_product_category`, MySQL refuses to delete this parent record, preventing orphaned product records."*
- **DBMS Concept Proved**: Referential Integrity, Foreign Keys, `ON DELETE RESTRICT`.

---

### Step 4: Multi-Product Purchase Transaction (Stock Inflow) (1.5 Minutes)
- **What to do**: Click **Purchases** in the sidebar. Note the current stock of **Product 1** (Logitech Keyboard: 28 units) and **Product 2** (Dell Mouse: 45 units). Click **"+ New Multi-Product Purchase"**.
  - Select Supplier: *Apex Infotech Solutions*.
  - Item 1: *Logitech Keyboard* $\to$ Quantity: `5`, Unit Price: `2000.00` (Line Total: ₹10,000.00).
  - Click **"+ Add Item"**.
  - Item 2: *Dell Mouse* $\to$ Quantity: `10`, Unit Price: `300.00` (Line Total: ₹3,000.00).
  - Show the live Grand Total: **₹13,000.00**.
  - Click **"Commit Purchase Transaction"**.
  - Show success message and navigate to **Products** to show new stocks: Product 1 is now **33**, Product 2 is now **55**.
- **What to say**:
  > *"A single purchase order supports multiple products. Notice how the grand total automatically equals the sum of quantity times unit price across all detail rows. When committed, an ACID transaction inserts the header, inserts both detail records, and increments the stock for each product in the Product table."*
- **DBMS Concept Proved**: 1:M and M:N Decomposition (`Purchase_Details`), ACID Transaction (`BEGIN`, `COMMIT`), Automated Stock Inflow.

---

### Step 5: Multi-Product Sale Transaction (Stock Outflow) (1.5 Minutes)
- **What to do**: Click **Sales** in the sidebar. Click **"+ New Multi-Product Sale"**.
  - Select Customer: *Rajesh Sharma*.
  - Item 1: *Logitech Keyboard* (Show the green badge: `Available: 33`) $\to$ Quantity: `3`, Unit Price: `2650.00` (Line Total: ₹7,950.00).
  - Click **"+ Add Item"**.
  - Item 2: *Dell Mouse* (Badge: `Available: 55`) $\to$ Quantity: `5`, Unit Price: `450.00` (Line Total: ₹2,250.00).
  - Show Grand Total: **₹10,200.00**.
  - Click **"Commit Sale Transaction"**.
  - Show the updated stock in **Products**: Product 1 is now **30**, Product 2 is now **50**.
- **What to say**:
  > *"When fulfilling a customer order, the system inspects real-time on-hand stock. Upon committing, stock is decremented accurately across all line items, maintaining the single source of truth in the Product table."*
- **DBMS Concept Proved**: ACID Concurrency Locking (`FOR UPDATE`), Stock Outflow, Transactional Multi-Item Invoicing.

---

### Step 6: CRITICAL ATOMIC ROLLBACK DEMONSTRATION (1.5 Minutes)
- **What to do**: Click **"+ New Sale"**.
  - Select Customer: *Priya Sundaram*.
  - Item 1: *Logitech Keyboard* $\to$ Quantity: `2` (Available: 30 $\to$ Valid).
  - Click **"+ Add Item"**.
  - Item 2: *Kingston 1TB NVMe SSD* $\to$ Point to badge: `Available: 4`. Enter Quantity: `100`! Show the red warning: *"Exceeds Stock!"*.
  - Click **"Commit Sale Transaction"**.
  - Show the error dialog:
    > *"Transaction Cancelled: Insufficient stock available for 'Kingston NV2 1TB M.2 NVMe SSD' (ID #4). Requested: 100, Available: 4. Entire sale cancelled."*
  - Open **Products** table and show that Product 1 stock is **STILL 30** (NOT partially deducted) and Product 4 stock is **STILL 4**.
  - Show that no new invoice exists in Sales history!
- **What to say**:
  > *"This proves Atomicity in ACID. If even one product has insufficient stock, the entire transaction is rolled back. Product 1 was not partially sold, no orphan invoice was created, and database consistency remained 100% intact."*
- **DBMS Concept Proved**: **Atomicity & Rollback (`ROLLBACK`)**, Concurrency Guard, Zero Partial Commits.

---

### Step 7: Low-Stock Alerts & Reorder Deficit (1 Minute)
- **What to do**: Click **Low Stock Alerts** in the sidebar.
- **What to say**:
  > *"Our system automatically identifies all products where `Stock_Quantity <= Reorder_Level`. Here, items like the D-Link Cat6 Cable (Stock: 5, Reorder: 15) show a deficit of +10 units. We have a direct 'Reorder' shortcut that opens a pre-configured Purchase modal to restock."*
- **DBMS Concept Proved**: Business Logic Constraints, Query Filtering, Database Views (`vw_low_stock_products`).

---

### Step 8: Database Views & SQL Demonstration (1 Minute)
- **What to do**: Click **SQL Reports** in the sidebar. Show the Category Inventory Valuation table.
- **What to say**:
  > *"This report is powered by our MySQL view `vw_category_stock_valuation`. It aggregates products, stock units, and total inventory capitalization per category without recalculating raw tables from scratch."*
- **DBMS Concept Proved**: Virtual Tables / Views, Analytical GROUP BY, Data Abstraction.

---

## 5-Point Quick Checklist for Examiner Questions

1. **"Why not put Supplier_ID in Product?"** $\to$ *"Because a product can be procured from different suppliers over time; supplier association belongs in Purchase orders."*
2. **"Why are Purchase_Details and Sale_Details needed?"** $\to$ *"To eliminate repeating groups and decompose Many-to-Many relationships into 1:M relationships (satisfying 1NF and 2NF)."*
3. **"Where is current stock stored?"** $\to$ *"In `Product.Stock_Quantity`, protected by `CHECK (Stock_Quantity >= 0)` and updated via ACID transactions."*
4. **"How does rollback protect the inventory?"** $\to$ *"If any product has insufficient stock, `ROLLBACK` undoes all temporary changes so no partial sales occur."*
5. **"What normalization level is achieved?"** $\to$ *"Third Normal Form (3NF), with zero partial and zero transitive dependencies."*
