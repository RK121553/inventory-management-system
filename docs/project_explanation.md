# Spoken Project Explanation (2-to-3 Minutes)
### For Academic DBMS Viva & Project Defense

> **Context**: Use this script when the examiner asks: *"Please explain your project,"* or *"Give me a brief overview of what you have built."*

---

### Spoken Script

"Good morning/afternoon, Sir/Madam.

My academic DBMS project is titled **INVENTORY MANAGEMENT SYSTEM**. 

### 1. The Problem & Objective
In many traditional businesses, inventory is recorded manually on paper or unstructured spreadsheets. This causes mathematical errors, phantom inventory, negative stock values, and lack of accountability. 

The objective of our project is to build an automated, relational database management system using **MySQL Community Server 26.7** that guarantees data consistency, prevents stockouts, automates replenishment and fulfillment, and strictly enforces relational integrity.

### 2. Technology Stack & Architecture
We implemented a clean **3-tier client-server architecture**:
- **Database Layer**: **MySQL 26.7** using the **InnoDB** storage engine for full ACID transaction compliance, foreign keys, and row-level locking.
- **Backend Application Layer**: **Node.js with Express.js** and **`mysql2/promise`**, providing a modular REST API with parameterized queries to completely eliminate SQL injection.
- **Presentation Layer**: A responsive Single Page Application built with **HTML5, CSS3, Bootstrap 5**, and **Vanilla JavaScript** using the native Fetch API.

### 3. Relational Database Design & Normalization
Our database consists of exactly **8 core normalized tables**:
1. `Category`
2. `Product`
3. `Supplier`
4. `Customer`
5. `Purchase`
6. `Purchase_Details`
7. `Sale`
8. `Sale_Details`

The schema satisfies **Third Normal Form (3NF)**:
- We decomposed Many-to-Many relationships into 1:M relationships using `Purchase_Details` and `Sale_Details`.
- There are no repeating groups (1NF), no partial key dependencies (2NF), and zero transitive dependencies (3NF).
- Noticeably, `Supplier_ID` is **not** placed in `Product` because products are catalog items that can be procured from different suppliers over time; supplier association belongs strictly in purchase transactions.
- We enforced relational integrity using **`ON DELETE RESTRICT`** on master tables to protect against accidental orphan record deletion, and **CHECK constraints** to guarantee prices and stock quantities are never negative.

### 4. Stock Management & ACID Transactions
Stock is tracked centrally in `Product.Stock_Quantity`:
- **When a Purchase is committed**: An ACID transaction inserts the header, inserts all line items into `Purchase_Details`, and automatically **increments** stock for every purchased product.
- **When a Sale is processed**: The system applies row-level locking with `SELECT ... FOR UPDATE` and checks whether $\text{Requested Quantity} \le \text{Stock\_Quantity}$ for **every** product in that order.
- **Critical Rollback Guarantee**: If even one product has insufficient stock, the **entire sale transaction is rolled back atomically**. Product stock is not partially reduced, zero orphan headers or details remain in MySQL, and the user receives a clear warning.
- When $\text{Stock\_Quantity} \le \text{Reorder\_Level}$, the product is automatically flagged on our **Low Stock Alert** dashboard.

### 5. SQL Functionality & Verification
Our project demonstrates practical SQL competency:
- Multi-table **INNER JOINs** and **LEFT OUTER JOINs** to find active sales and inactive customers.
- Aggregate queries with **`GROUP BY`** and **`HAVING`**.
- Scalar and **correlated subqueries**, as well as **`EXISTS`** and **`NOT EXISTS`**.
- Database **Views** such as `vw_low_stock_products` and `vw_category_stock_valuation`.

### 6. Testing & Results
We verified the complete system with an automated End-to-End integration suite covering **54 distinct test cases**—all 54 passed with zero defects. The frontend, backend, and MySQL database work seamlessly together.

Thank you, Sir/Madam. I would be pleased to demonstrate the live application or show specific SQL queries."
