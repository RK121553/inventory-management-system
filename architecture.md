# System Architecture & Technical Specifications

**Project Title**: INVENTORY MANAGEMENT  
**Target Environment**: Windows 11 Home, VS Code  
**Database**: MySQL Community Server 26.7  
**Runtime**: Node.js v24.11.1 (Verified on local system)  

---

## 1. Architectural Overview (3-Tier Model)

The application follows the classic, clean **3-Tier Client-Server Architecture** ideal for academic evaluation and DBMS viva defense.

```
+--------------------------------------------------------------------+
|                         PRESENTATION TIER                          |
|  - Modern, responsive HTML5 / CSS3 / Bootstrap 5 UI                |
|  - Vanilla JavaScript (Fetch API) - No complicated build tools     |
|  - Live Dashboard, Entity Modals, Low-Stock Badges, Transaction UI |
+---------------------------------+----------------------------------+
                                  | HTTP / JSON REST APIs
                                  v
+--------------------------------------------------------------------+
|                         APPLICATION TIER                           |
|  - Node.js (v24.11) + Express.js Web Server                        |
|  - Controller & Service Layer with SQL Query Builders              |
|  - ACID Transaction Management (BEGIN, COMMIT, ROLLBACK)           |
|  - Input Validation & Stock Availability Guard Rules               |
+---------------------------------+----------------------------------+
                                  | TCP / Connection Pool (mysql2)
                                  v
+--------------------------------------------------------------------+
|                           DATABASE TIER                            |
|  - MySQL Community Server 26.7 (Service: MySQL267)                 |
|  - 8 Normalized Relational Tables with Foreign Keys & Constraints  |
|  - Views for Analytical Reporting & Real-time Aggregate Queries    |
+--------------------------------------------------------------------+
```

---

## 2. Technology Stack & Rationale

| Component | Choice | Academic & Practical Rationale |
| :--- | :--- | :--- |
| **Database** | **MySQL Community Server 26.7** | Mandatory academic requirement. Already installed and running as local Windows service `MySQL267`. Full support for ACID transactions, foreign keys, and check constraints. |
| **Backend Runtime** | **Node.js (v24.11.1) + Express.js** | Already installed on the user's Windows system. Highly readable, non-blocking I/O, simple routing, easy to inspect in VS Code. |
| **Database Driver** | **`mysql2/promise`** | Supports standard SQL queries, parameterized queries (preventing SQL injection), connection pooling, and native promise-based transaction blocks (`beginTransaction`, `commit`, `rollback`). |
| **Frontend** | **HTML5 + Bootstrap 5 + Vanilla JS** | Zero-build simplicity: no complex bundlers (Webpack/Vite), no node-modules overhead on the client. Extremely easy for a student to modify, run, and explain during a viva. |
| **Environment** | **dotenv** | Securely manages DB credentials (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_PORT`) through `.env` without exposing them in source code. |

---

## 3. Core Business Workflows

### 3.1 Purchase Workflow (Stock Replenishment)
When goods arrive from a supplier:
1. User selects `Supplier_ID`, selects `Product_ID`, and inputs `Quantity` and `Unit_Price`.
2. Backend starts a database transaction:
   ```sql
   START TRANSACTION;
   INSERT INTO Purchase (Supplier_ID, Purchase_Date, Total_Amount) VALUES (?, NOW(), ?);
   INSERT INTO Purchase_Details (Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?);
   UPDATE Product SET Stock_Quantity = Stock_Quantity + ? WHERE Product_ID = ?;
   COMMIT;
   ```
3. If any step fails, the transaction is safely rolled back (`ROLLBACK`).

### 3.2 Sales Workflow (Stock Consumption & Guard Rules)
When a customer orders products:
1. User selects `Customer_ID`, `Product_ID`, and inputs `Quantity` and `Unit_Price`.
2. Backend checks current available stock:
   ```sql
   SELECT Stock_Quantity FROM Product WHERE Product_ID = ? FOR UPDATE;
   ```
3. **Guard Condition**:
   - If $\text{Requested Quantity} > \text{Stock\_Quantity}$, the request is rejected immediately with error:
     > *"Insufficient stock available. Requested: X, Available: Y"*
4. If sufficient stock exists, execute within a transaction:
   ```sql
   START TRANSACTION;
   INSERT INTO Sale (Customer_ID, Sale_Date, Total_Amount) VALUES (?, NOW(), ?);
   INSERT INTO Sale_Details (Sale_ID, Product_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?);
   UPDATE Product SET Stock_Quantity = Stock_Quantity - ? WHERE Product_ID = ?;
   COMMIT;
   ```

### 3.3 Low-Stock & Dashboard Aggregation
- **Dashboard API**: Runs aggregate SQL queries:
  - Total counts from `Product`, `Category`, `Supplier`, `Customer`, `Purchase`, `Sale`.
  - Total purchase valuation: `SELECT SUM(Total_Amount) FROM Purchase`.
  - Total revenue: `SELECT SUM(Total_Amount) FROM Sale`.
  - Low-stock counter: `SELECT COUNT(*) FROM Product WHERE Stock_Quantity <= Reorder_Level`.
- **Low-Stock View**: Fetches all items meeting the reorder criterion with category details.

---

## 4. Proposed Folder Structure

```
INVENTORYMANAGEMENT/
├── database/                       # All SQL files required by academic guidelines
│   ├── 01_create_database.sql      # Database creation script
│   ├── 02_create_tables.sql        # 8 core relational tables
│   ├── 03_constraints.sql          # Primary, Foreign, and Check constraints
│   ├── 04_insert_sample_data.sql   # Realistic Indian-context sample data
│   ├── 05_basic_queries.sql        # Basic SELECT, WHERE, ORDER BY queries
│   ├── 06_join_queries.sql         # Multi-table INNER & LEFT JOINs
│   ├── 07_aggregate_queries.sql    # Aggregates, GROUP BY, HAVING queries
│   ├── 08_subqueries.sql           # Nested subqueries
│   └── 09_views.sql                # Analytical database views
├── docs/                           # Documentation for academic submission & viva
│   ├── viva_questions_answers.md   # Comprehensive viva Q&A
│   ├── testing_report.md           # Test cases with input/expected/actual status
│   └── normalization_guide.md      # Detailed 1NF, 2NF, 3NF walkthrough
├── public/                         # Client-side web assets (zero-build frontend)
│   ├── css/
│   │   └── style.css               # Clean, professional styling & badge highlights
│   ├── js/
│   │   ├── api.js                  # Centralized fetch API wrapper
│   │   └── app.js                  # Navigation, CRUD handlers, Modal forms, UI rendering
│   └── index.html                  # Single-page multi-view dashboard & management portal
├── src/                            # Backend application code
│   ├── config/
│   │   └── db.js                   # MySQL connection pool configuration (mysql2)
│   ├── routes/
│   │   ├── categoryRoutes.js       # Category CRUD endpoints
│   │   ├── productRoutes.js        # Product CRUD + Low stock endpoints
│   │   ├── supplierRoutes.js       # Supplier CRUD endpoints
│   │   ├── customerRoutes.js       # Customer CRUD endpoints
│   │   ├── purchaseRoutes.js       # Purchase + Stock Increment transaction endpoints
│   │   ├── saleRoutes.js           # Sale + Stock Decrement transaction endpoints
│   │   └── dashboardRoutes.js      # Live SQL aggregation statistics
│   └── server.js                   # Express application entry point
├── .env.example                    # Template for MySQL credentials
├── .gitignore                      # Excludes node_modules, .env, OS cache
├── architecture.md                 # Architecture documentation
├── database_design.md              # Relational schema and normalization documentation
├── package.json                    # Project metadata & npm dependencies
├── README.md                       # Complete setup & project execution guide
└── requirements.md                 # Functional & academic requirements
```

---

## 5. API Endpoints Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Fetches aggregate totals, revenue, and low-stock count |
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Add a new category |
| `PUT` | `/api/categories/:id` | Update category details |
| `DELETE` | `/api/categories/:id` | Delete category (restricted if products exist) |
| `GET` | `/api/products` | List all products (includes Category name via JOIN) |
| `GET` | `/api/products/low-stock` | Filter products where `Stock_Quantity <= Reorder_Level` |
| `POST` | `/api/products` | Add a new product |
| `PUT` | `/api/products/:id` | Update product details |
| `DELETE` | `/api/products/:id` | Delete product (restricted if purchase/sale records exist) |
| `GET` | `/api/suppliers` | List all suppliers |
| `POST` | `/api/suppliers` | Add a new supplier |
| `PUT` | `/api/suppliers/:id` | Update supplier |
| `DELETE` | `/api/suppliers/:id` | Delete supplier |
| `GET` | `/api/customers` | List all customers |
| `POST` | `/api/customers` | Add a new customer |
| `PUT` | `/api/customers/:id` | Update customer |
| `DELETE` | `/api/customers/:id` | Delete customer |
| `GET` | `/api/purchases` | Fetch purchase history with supplier details |
| `POST` | `/api/purchases` | Process purchase transaction & increase product stock |
| `GET` | `/api/sales` | Fetch sales history with customer details |
| `POST` | `/api/sales` | Process sale transaction, validate stock, decrease stock |
