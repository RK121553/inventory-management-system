# Inventory Management System (IMS)
### Academic DBMS Project | B.Tech Computer Science & Engineering (CSE)

A pure relational **Inventory Management System** designed and implemented using **MySQL Community Server 26.7**, **Node.js + Express.js**, and a responsive **HTML5 / Bootstrap 5** web interface.

This project demonstrates core relational database concepts, including normalization (1NF, 2NF, 3NF), declarative constraints, multi-table joins, SQL aggregates, database views, and ACID-compliant transactional stock management.

---

## 1. Project Overview & Objectives

Manual inventory record-keeping is prone to mathematical errors, inventory discrepancies, stockout delays, and lack of audit trails. This project solves these challenges by implementing an automated, relational database management system that:

- **Centralizes Inventory Records**: Tracks products, categories, suppliers, and customers.
- **Enforces Data Consistency**: Relational foreign keys and check constraints guarantee that invalid data (negative prices, negative stock, orphan line items) cannot enter the system.
- **Automates Stock Replenishment (Purchases)**: Increases product stock dynamically across multi-product vendor purchases.
- **Guarantees Safe Fulfillment (Sales)**: Automatically validates stock before selling, decrements stock on completion, and safely rolls back the entire transaction if any item is out of stock.
- **Flags Low-Stock Deficits**: Detects products where $\text{Stock\_Quantity} \le \text{Reorder\_Level}$ to trigger timely reordering.
- **Demonstrates Relational Mastery**: Features multi-table joins, subqueries, aggregate grouping, and database views suitable for an academic B.Tech CSE evaluation.

---

## 2. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Database** | **MySQL Community Server 26.7** | InnoDB Storage Engine (ACID transactions, Foreign Keys, Row-Level Locking). |
| **Backend API** | **Node.js (v24.11.1) + Express.js** | Modular REST API with parameterized SQL queries preventing SQL injection. |
| **Authentication** | **Node.js `crypto` & Bearer Tokens** | Single-Admin portal with timing-safe password comparison and in-memory session tokens. |
| **Database Driver** | **`mysql2/promise`** | Connection pooling and native Promise-based transaction blocks. |
| **Frontend UI** | **HTML5, CSS3, Bootstrap 5.3, Vanilla JS** | Zero-build Single Page Application (SPA) using standard Fetch API. |
| **Configuration** | **`dotenv`** | Secure environment variables for MySQL and Admin credentials. |

---

## 3. System Architecture (3-Tier Model)

```
+-------------------------------------------------------------------------+
|                           PRESENTATION TIER                             |
|  - Modern, responsive SPA with Bootstrap 5 and Bootstrap Icons          |
|  - Real-time Dashboard, Dynamic Multi-Item Order Forms, Alert Badges    |
+------------------------------------+------------------------------------+
                                     | HTTP / JSON REST APIs
                                     v
+-------------------------------------------------------------------------+
|                           APPLICATION TIER                              |
|  - Node.js (v24.11) + Express.js HTTP Server                            |
|  - ACID Transaction Controller (BEGIN, COMMIT, ROLLBACK)                |
|  - Input sanitization, business validation, and error translation       |
+------------------------------------+------------------------------------+
                                     | MySQL Connection Pool (mysql2)
                                     v
+-------------------------------------------------------------------------+
|                            DATABASE TIER                                |
|  - MySQL Community Server 26.7 (Service: MySQL267, Port 3306)           |
|  - 8 Normalized Relational Tables (InnoDB)                              |
|  - Primary Keys, Foreign Keys (RESTRICT/CASCADE), Check Constraints     |
|  - Analytical Views (vw_low_stock_products, vw_sales_summary, etc.)     |
+-------------------------------------------------------------------------+
```

---

## 4. Database Schema Overview (8 Core Tables)

The database strictly utilizes the **8 authoritative core entities**:

```
       +--------------+
       |   CATEGORY   |
       +--------------+
              | 1
              |
              | M
       +--------------+        1:M        +--------------------+
       |   PRODUCT    |-------------------|  PURCHASE_DETAILS  |
       +--------------+                   +--------------------+
              | 1                                   | M
              |                                     |
              | M                                   | 1
       +--------------------+             +--------------------+
       |    SALE_DETAILS    |             |      PURCHASE      |
       +--------------------+             +--------------------+
              | M                                   | M
              |                                     |
              | 1                                   | 1
       +--------------+                   +--------------------+
       |     SALE     |                   |      SUPPLIER      |
       +--------------+                   +--------------------+
              | M
              |
              | 1
       +--------------+
       |   CUSTOMER   |
       +--------------+
```

### Table Reference Summary

| # | Table Name | Primary Key | Foreign Keys | Key Purpose |
| :-: | :--- | :--- | :--- | :--- |
| 1 | **`Category`** | `Category_ID` | *None* | Classifies inventory items (e.g., Computer Peripherals, Storage). |
| 2 | **`Product`** | `Product_ID` | `Category_ID` $\to$ `Category` | Catalog items with unit price, current stock, and reorder level. |
| 3 | **`Supplier`** | `Supplier_ID` | *None* | Vendor profiles (Company Name, Phone, Email, Address). |
| 4 | **`Customer`** | `Customer_ID` | *None* | Client profiles (Customer Name, Phone, Email, Address). |
| 5 | **`Purchase`** | `Purchase_ID` | `Supplier_ID` $\to$ `Supplier` | Transaction header for supplier procurement orders. |
| 6 | **`Purchase_Details`** | `Purchase_Detail_ID` | `Purchase_ID` $\to$ `Purchase`<br>`Product_ID` $\to$ `Product` | Line items for purchases (Product, Quantity, Unit Price). |
| 7 | **`Sale`** | `Sale_ID` | `Customer_ID` $\to$ `Customer` | Transaction header for customer sales invoices. |
| 8 | **`Sale_Details`** | `Sale_Detail_ID` | `Sale_ID` $\to$ `Sale`<br>`Product_ID` $\to$ `Product` | Line items for sales (Product, Quantity, Unit Price). |

### Important Database Design Rules
1. **NO `Supplier_ID` in `Product`**: A product is an abstract catalog item. It can be supplied by various vendors over time across different purchase orders.
2. **NO `Category_ID` in `Purchase`**: Products already reference categories; adding Category to Purchase would introduce transitive redundancy (violating 3NF).
3. **NO Direct Link Between `Sale_Details` and `Purchase_Details`**: Sales and Purchases interact strictly through the authoritative `Product.Stock_Quantity`.
4. **Header Totals**: `Total_Amount` in `Purchase` and `Sale` equals $\sum(\text{Quantity} \times \text{Unit\_Price})$ across all respective detail rows.

---

## 5. Stock Management & Transaction Logic

### A. Multi-Product Purchases (Stock Inflow)
1. User selects a **Supplier** and adds multiple products with quantities and purchase prices.
2. The backend opens a transaction:
   ```sql
   START TRANSACTION;
   INSERT INTO Purchase (Supplier_ID, Purchase_Date, Total_Amount) VALUES (?, NOW(), ?);
   -- For each line item:
   INSERT INTO Purchase_Details (Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?);
   UPDATE Product SET Stock_Quantity = Stock_Quantity + ? WHERE Product_ID = ?;
   COMMIT;
   ```
3. Stock is incremented for all products in the purchase order.

### B. Multi-Product Sales & Insufficient Stock Rollback (Stock Outflow)
1. User selects a **Customer** and adds multiple products with quantities.
2. The backend begins an ACID transaction and applies row-level locks:
   ```sql
   START TRANSACTION;
   SELECT Product_ID, Product_Name, Stock_Quantity FROM Product WHERE Product_ID = ? FOR UPDATE;
   ```
3. **Strict Sufficiency Guard**: If for *any* product, $\text{Requested Quantity} > \text{Stock\_Quantity}$:
   - The transaction immediately executes `ROLLBACK`.
   - Returns HTTP 400: *"Insufficient stock available for [Product Name]. Entire sale cancelled."*
   - Zero records are created, and zero stocks are changed (no partial sales).
4. If all products have adequate stock:
   - Line items are recorded in `Sale_Details`.
   - Stocks are decremented: `UPDATE Product SET Stock_Quantity = Stock_Quantity - ?`.
   - Header is committed with $\text{Total\_Amount} = \sum(\text{Quantity} \times \text{Unit\_Price})$.

### C. Low-Stock Detection Logic
A product is flagged as **Low Stock** when:
$$\text{Stock\_Quantity} \le \text{Reorder\_Level}$$
The low-stock report shows current stock, reorder level, and the reorder deficit ($+\text{units needed}$).

---

## 6. Project Directory Structure

```text
INVENTORYMANAGEMENT/
├── database/                       # All SQL scripts for academic submission
│   ├── 01_create_database.sql      # Database initialization
│   ├── 02_create_tables.sql        # 8 core relational tables
│   ├── 03_constraints.sql          # Primary, Foreign, and Check constraints
│   ├── 04_insert_sample_data.sql   # Realistic Indian-context sample data
│   ├── 05_basic_queries.sql        # Single-table SELECT, WHERE, ORDER BY, LIKE
│   ├── 06_join_queries.sql         # Multi-table INNER and LEFT JOINs
│   ├── 07_aggregate_queries.sql    # Aggregates, GROUP BY, and HAVING
│   ├── 08_subqueries.sql           # Nested and correlated subqueries
│   └── 09_views.sql                # Analytical reporting views
├── docs/                           # Documentation & Viva Preparation
│   ├── demo_guide.md               # 5-10 minute presentation sequence for viva
│   ├── integration_test_report.md  # Complete 54-test integration matrix
│   ├── normalization_guide.md      # Detailed 1NF, 2NF, 3NF walkthrough
│   ├── project_explanation.md      # 2-3 minute spoken elevator pitch
│   ├── sql_demo_guide.md           # Curated SQL viva queries with explanations
│   ├── testing_report.md           # Unified testing documentation
│   └── viva_questions_answers.md   # Comprehensive viva Q&A (Sections A to AF)
├── public/                         # Client-side web portal (Zero-build SPA)
│   ├── css/
│   │   └── style.css               # Clean styling, KPI cards & badges
│   ├── js/
│   │   ├── api.js                  # Centralized Fetch API client wrapper
│   │   └── app.js                  # SPA navigation, modals, and dynamic forms
│   └── index.html                  # Single-page dashboard & management portal
├── src/                            # Backend application code
│   ├── config/
│   │   └── db.js                   # MySQL connection pool (mysql2/promise)
│   ├── middleware/
│   │   └── authMiddleware.js       # Single-Admin session manager & route guard
│   ├── routes/
│   │   ├── authRoutes.js           # Admin login, logout, and token verification
│   │   ├── categoryRoutes.js       # Category CRUD endpoints
│   │   ├── customerRoutes.js       # Customer CRUD endpoints
│   │   ├── dashboardRoutes.js      # Live SQL aggregation statistics
│   │   ├── productRoutes.js        # Product CRUD + Low stock endpoints
│   │   ├── purchaseRoutes.js       # Multi-product purchase transaction
│   │   ├── saleRoutes.js           # Multi-product sale transaction
│   │   └── supplierRoutes.js       # Supplier CRUD endpoints
│   └── server.js                   # Express application entry point & route protection
├── tests/                          # Automated verification suites
│   ├── test_auth_e2e.js            # Single-Admin auth & access control suite (58 tests)
│   ├── test_backend.js             # Phase 4 API & transaction tests (36 tests)
│   ├── test_frontend_workflows.js  # Phase 5 workflow simulation (49 tests)
│   └── test_phase6_e2e.js          # Phase 6 full E2E & MySQL verification (54 tests)
├── .env.example                    # Template for MySQL credentials
├── .gitignore                      # Excludes node_modules, .env, and logs
├── architecture.md                 # System architecture documentation
├── database_design.md              # Relational schema and design documentation
├── package.json                    # Project metadata & npm dependencies
├── README.md                       # Main project documentation
└── requirements.md                 # Detailed project requirements
```

---

## 7. Installation & Setup Instructions

### Prerequisites
- **Operating System**: Windows 10/11
- **Database**: MySQL Community Server (Version 8.0+ or 26.7)
- **Runtime**: Node.js (Version 18+ or 24+) with npm
- **Editor**: Visual Studio Code (VS Code)

### Step 1: Clone or Navigate to the Project
```bash
cd "c:\Users\ram krishna\OneDrive\Desktop\INVENTORYMANAGEMENT"
```

### Step 2: Install Dependencies
```bash
npm install
```
*(On Windows PowerShell, if execution policy restricts scripts, run `cmd.exe /c "npm install"`).*

### Step 3: Configure Database & Admin Credentials
Create a `.env` file in the project root based on `.env.example`:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=inventory_management

# Server Configuration
PORT=3000

# Single-Admin Authentication Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password_here
SESSION_SECRET=your_random_session_secret_key_here
```

> [!IMPORTANT]
> **Security Notice**: Never commit `.env` containing sensitive credentials to Git or public repositories. A `.gitignore` file is included to prevent accidental commits.

### Step 4: Initialize the Database
Open a terminal and run the SQL scripts in order using the MySQL command-line tool:
```bash
# In MySQL CLI or Command Prompt:
mysql -u root -p < database/01_create_database.sql
mysql -u root -p inventory_management < database/02_create_tables.sql
mysql -u root -p inventory_management < database/03_constraints.sql
mysql -u root -p inventory_management < database/04_insert_sample_data.sql
```
*(Alternatively, execute scripts 01 to 04 directly in MySQL Workbench or VS Code MySQL extension).*

### Step 5: Start the Backend Server
```bash
npm start
```
The server will start on port `3000`:
```text
================================================================
 Inventory Management Backend Server running on port 3000
 Local URL: http://localhost:3000
 API Base:  http://localhost:3000/api
 Authentication: Single-Admin Guard Active
================================================================
```

### Step 6: Sign In to the Application
1. Open any web browser (Chrome, Edge, Firefox) and navigate to:
   ```text
   http://localhost:3000
   ```
2. The **Single-Admin Sign-In Portal** will appear before the inventory dashboard.
3. Enter your configured `ADMIN_USERNAME` and `ADMIN_PASSWORD` from your `.env` file.
4. Click **Sign In to Dashboard**. Upon successful verification, the management interface and real-time dashboard are loaded.
5. To log out, click the **Logout** button in the sidebar footer or the top navbar profile dropdown. The active session token will be immediately destroyed on both the server and client.

---

## 8. Single-Admin Authentication & Access Control Architecture

The system features a lightweight, robust, single-administrator access control guard designed specifically for academic DBMS evaluation:

- **Single Authorized Administrator**: No public sign-up, user registration, or multi-user clutter. There is exactly one administrator account defined securely via server-side environment variables.
- **Timing-Safe Password Comparison**: Uses `crypto.timingSafeEqual` with SHA-256 digested buffers to defend against side-channel timing analysis attacks.
- **Cryptographically Secure Session Tokens**: Session tokens are generated using 32 bytes (256 bits) of entropy (`crypto.randomBytes(32).toString('hex')`).
- **In-Memory Session Store**: Valid tokens are stored in an active in-memory map with automatic 12-hour expiration and immediate invalidation upon logout.
- **Modifying API Guard**: All state-modifying HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`) under `/api/*` strictly require a valid `Authorization: Bearer <token>` header, returning `HTTP 401 Unauthorized` for missing or invalid tokens.
- **Brute-Force Rate Limiting**: Enforces a temporary 5-minute lockout (returning `HTTP 429 Too Many Requests`) if more than 5 consecutive invalid login attempts occur from the same client IP address.

---

## 9. Running Automated Verification Tests

The project includes an end-to-end test suite covering authentication, backend APIs, frontend workflows, and relational constraints:

```bash
# 1. Run the Single-Admin Authentication & Access Control Suite (58 tests):
node tests/test_auth_e2e.js

# 2. Run the Full Phase 6 End-to-End Integration Suite (54 tests):
node tests/test_phase6_e2e.js

# 3. Run the Frontend Workflow & ACID Transaction Suite (49 tests):
node tests/test_frontend_workflows.js

# 4. Run the Phase 4 Backend API Suite (36 tests):
node tests/test_backend.js
```

### Expected Output Summary:
- **`test_auth_e2e.js`**: `58 / 58 TESTS PASSED` (Unauthenticated 401 blocks, login timing-safety, rate limiting, token invalidation, database regression).
- **`test_phase6_e2e.js`**: `54 / 54 CHECKS PASSED` (End-to-end MySQL verification, aggregate stats, transactions, atomic rollback).
- **`test_frontend_workflows.js`**: `49 / 49 CHECKS PASSED` (Interactive UI workflows, filters, cascade protections).
- **`test_backend.js`**: `36 / 36 CHECKS PASSED` (Core REST API endpoints and referential integrity).

---

## 10. Future Enhancements

The following features represent realistic production enhancements beyond the scope of this core academic project:
- **Multi-Role RBAC**: Expanding from single-admin to multi-user roles (e.g., Inventory Clerk, Auditor, Cashier).
- **Barcode & QR Code Integration**: Hardware barcode scanner integration for automated SKU entry.
- **Automated Purchase Orders**: Automatic email notifications to suppliers when stock falls below reorder levels.
- **Exporting & Printing**: PDF invoice generation and Excel spreadsheet export.
- **Audit Logging**: Dedicated database audit log table capturing timestamped user actions.

---

## 11. Academic Disclaimer
*This project was developed strictly as an academic submission for the B.Tech Computer Science and Engineering (CSE) Database Management Systems (DBMS) curriculum. It focuses on relational modeling, normalization, SQL querying, database transaction integrity, and secure single-administrator access control.*
