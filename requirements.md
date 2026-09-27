# Requirements Specification: Inventory Management System

**Academic Degree**: B.Tech Computer Science & Engineering (CSE)  
**Subject**: Database Management Systems (DBMS)  
**Database**: MySQL Community Server 26.7 (Windows 11 Local Service)  
**Project Title**: INVENTORY MANAGEMENT  

---

## 1. Project Purpose & Scope

The purpose of this project is to develop a robust, academically rigorous, and practical **Inventory Management System (IMS)** using a pure relational database architecture in MySQL. It automates inventory control, eliminates manual record-keeping errors, enforces relational constraints, and guarantees transactional data consistency during stock replenishment and sales fulfillment.

### Key Academic Objectives:
- **Demonstrate Core Relational Concepts**: Tables, Primary Keys (PK), Foreign Keys (FK), and Domain Constraints.
- **Normalization**: Satisfy First (1NF), Second (2NF), and Third Normal Form (3NF) without artificial complexity.
- **Transactional Stock Updates**: Automated stock increment on Purchase and decrement on Sale with concurrency safeguards and anti-negative stock constraints.
- **SQL Competency Demonstration**: DDL, DML, multi-table INNER/LEFT JOINs, aggregate queries (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`), `GROUP BY`, `HAVING`, subqueries, and database views.
- **Viva Readiness**: Clean, intuitive architecture that a B.Tech student can easily explain and defend before an examiner.

---

## 2. Core Functional Requirements

### 2.1 Entity & Master Data Management (CRUD)
1. **Category Management**:
   - Create, Read, Update, and Delete product categories (e.g., Electronics, Stationery, Hardware).
   - Search categories by name or description.
   - Deletion protection: Cannot delete a category currently referenced by active products.

2. **Product Management**:
   - Manage inventory items with attributes: Name, Category, Unit Price, Stock Quantity, and Reorder Level.
   - Search and filter products by name, category, or stock status.
   - Visual status tagging: Normal Stock vs. Low Stock alert.
   - Restrict negative pricing, negative stock quantities, and negative reorder levels.

3. **Supplier Management**:
   - Maintain supplier directory: Supplier Name, Phone Number, Email, and Physical Address.
   - Search suppliers by name, phone, or email.
   - Reference integrity: Retain suppliers associated with historical purchase records.

4. **Customer Management**:
   - Maintain customer records: Customer Name, Phone Number, Email, and Address.
   - Search customers by name, phone, or email.
   - Reference integrity: Retain customers associated with historical sales records.

### 2.2 Transactional & Stock Management Requirements
5. **Purchase Management (Stock Inflow / Replenishment)**:
   - Record purchases made from registered suppliers.
   - Capture transaction header: `Purchase_ID`, `Supplier_ID`, `Purchase_Date`, `Total_Amount`.
   - Capture line items in `Purchase_Details`: `Product_ID`, `Quantity`, `Unit_Price`.
   - **Stock Inflow Rule**: When a purchase is saved, the associated product's `Stock_Quantity` MUST automatically INCREASE by the purchased quantity:
     $$\text{New Stock} = \text{Current Stock} + \text{Purchased Quantity}$$

6. **Sales Management (Stock Outflow / Customer Orders)**:
   - Record sales made to registered customers.
   - Capture transaction header: `Sale_ID`, `Customer_ID`, `Sale_Date`, `Total_Amount`.
   - Capture line items in `Sale_Details`: `Product_ID`, `Quantity`, `Unit_Price`.
   - **Stock Outflow Rule**: When a sale is confirmed, the associated product's `Stock_Quantity` MUST DECREASE by the sold quantity:
     $$\text{New Stock} = \text{Current Stock} - \text{Sold Quantity}$$
   - **Stock Sufficiency Validation**: The system MUST check available stock before permitting a sale. If $\text{Requested Quantity} > \text{Stock Quantity}$, reject transaction with:
     > *"Insufficient stock available."*
   - Stock quantities must **never** become negative under any circumstance.

7. **Low-Stock Alerting & Reorder Logic**:
   - A product is classified as **Low Stock** whenever:
     $$\text{Stock\_Quantity} \le \text{Reorder\_Level}$$
   - Dedicated Low-Stock Dashboard & Report identifying: Product ID, Product Name, Category, Current Stock, Reorder Level, and Deficit.

### 2.3 Dashboard & Reporting
- Summary KPI Cards: Total Products, Total Categories, Total Suppliers, Total Customers, Total Purchases, Total Sales, Low-Stock Count.
- Calculated live via aggregate SQL queries (no hardcoding).
- Interactive reports showcasing sales history, purchase invoices, and category-wise stock valuation.

---

## 3. Non-Functional & Academic Constraints

| Category | Requirement |
| :--- | :--- |
| **Database Engine** | MySQL Community Server 26.7 with InnoDB engine (enforcing ACID & FKs). |
| **Target OS** | Windows 11 Home (running locally). |
| **Development Tool** | Visual Studio Code (VS Code). |
| **Simplicity** | Clean academic structure; no microservices, no excessive boilerplate. |
| **Security & Config** | Environment variables for DB credentials (`.env`, `.env.example`). No plain credentials in git. |
| **Integrity & Validation** | Client-side validation + Server-side validation + DB Check & Foreign Key constraints. |

---

## 4. Ambiguity Analysis & Design Clarifications

1. **Total Amount Consistency in Headers (`Purchase` / `Sale`)**:
   - *Observation*: `Total_Amount` resides in `Purchase` and `Sale`, while line item costs are `Quantity * Unit_Price` in `Purchase_Details` and `Sale_Details`.
   - *Decision*: In both database transactions and SQL scripts, `Total_Amount` is calculated as $\sum (\text{Quantity} \times \text{Unit\_Price})$ for all items in that order. This mirrors standard real-world relational accounting systems while preserving the prompt's exact 8-table relational schema.
2. **Date Storage**:
   - `Purchase_Date` and `Sale_Date` will default to `CURRENT_TIMESTAMP` or `CURDATE()`, with full support for user-specified dates.
3. **Foreign Key Integrity Rules**:
   - We will implement `ON DELETE RESTRICT` (default InnoDB behavior) on primary entities (Category, Supplier, Customer, Product). This prevents accidental deletion of items that have historical transaction trails, ensuring strict referential integrity.
