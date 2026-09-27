# Comprehensive DBMS Viva Questions & Answers

**Project Title**: INVENTORY MANAGEMENT  
**Academic Degree**: B.Tech CSE (Database Management Systems)  
**Database**: MySQL Community Server 26.7 (InnoDB Engine)  

---

### Section A: Project Basics
**Q1: What is the purpose of this project?**  
**A:** To build an automated, relational DBMS-based inventory management system that tracks catalog products, manages supplier procurements, processes customer sales, automatically increments and decrements stock levels, flags low-stock items, and prevents data inconsistencies using ACID transactions and foreign keys.

**Q2: Why did you choose MySQL for this project?**  
**A:** MySQL is a production-grade, open-source Relational Database Management System (RDBMS). It provides full ACID transaction support through its InnoDB storage engine, supports declarative integrity constraints (PRIMARY KEY, FOREIGN KEY, CHECK), and offers high query execution performance for joins and aggregations.

**Q3: Why does the system use exactly 8 tables?**  
**A:** The 8 tables represent the core entities and relationships needed for inventory operations:
1. `Category` (Classifications)
2. `Product` (Catalog items & stock)
3. `Supplier` (Procurement vendors)
4. `Customer` (Buyers)
5. `Purchase` (Procurement order headers)
6. `Purchase_Details` (Procurement line items)
7. `Sale` (Sales invoice headers)
8. `Sale_Details` (Sales line items)  
This design decomposes Many-to-Many relationships into 1:M relationships and avoids both over-engineering and data redundancy.

---

### Section B: DBMS Fundamentals
**Q4: What is a DBMS and why is it preferred over a file-processing system?**  
**A:** A DBMS (Database Management System) is software that manages data storage, retrieval, and manipulation. Compared to traditional file systems, a DBMS eliminates data redundancy, guarantees data consistency through constraints, provides concurrent transaction control, supports recovery, and offers declarative querying using SQL.

---

### Section C: Relational Model
**Q5: What is the Relational Model?**  
**A:** Formulated by E.F. Codd, the relational model represents data in the form of relations (tables), where each row represents a tuple (record) and each column represents an attribute. Relationships between tables are established using shared key values (Primary Key to Foreign Key).

---

### Section D & E: Primary Keys & Foreign Keys
**Q6: What is a Primary Key? Give examples from your project.**  
**A:** A Primary Key is a column (or set of columns) that uniquely identifies each row in a table. It cannot contain NULL values.  
*Examples in our project*: `Category_ID` in `Category`, `Product_ID` in `Product`, `Purchase_ID` in `Purchase`.

**Q7: What is a Foreign Key? Give examples from your project.**  
**A:** A Foreign Key is an attribute in one table that references the Primary Key of another table, establishing a link between them and enforcing referential integrity.  
*Examples in our project*:
- `Product.Category_ID` references `Category(Category_ID)`
- `Purchase.Supplier_ID` references `Supplier(Supplier_ID)`
- `Purchase_Details.Product_ID` references `Product(Product_ID)`
- `Sale.Customer_ID` references `Customer(Customer_ID)`

**Q8: Why can't `Supplier_ID` simply be added to the `Product` table?**  
**A:** A product is an abstract catalog item (e.g., Cat6 Ethernet Cable). Over time, the business can purchase the same product from multiple different suppliers depending on price and availability. If `Supplier_ID` were in `Product`, a product could only ever have one supplier, or changing the supplier would overwrite historical procurement facts. Storing supplier association in `Purchase` $\to$ `Purchase_Details` preserves true commercial reality and normalization.

---

### Section F: Database Constraints
**Q9: What constraints did you implement in MySQL?**  
**A:**
1. **PRIMARY KEY**: Uniqueness and NOT NULL for entity identification.
2. **FOREIGN KEY**: Referential integrity (`ON DELETE RESTRICT` on master tables, `ON DELETE CASCADE` on details).
3. **NOT NULL**: Ensures essential fields (names, prices, dates) are never empty.
4. **UNIQUE**: Prevents duplicate category names (`UNIQUE(Category_Name)`).
5. **CHECK Constraints**: Enforces domain integrity:
   - `Price >= 0`, `Stock_Quantity >= 0`, `Reorder_Level >= 0` in `Product`
   - `Quantity > 0`, `Unit_Price >= 0` in `Purchase_Details` and `Sale_Details`
   - `Total_Amount >= 0` in `Purchase` and `Sale`

**Q10: What happens if someone tries to delete a Category that currently has products?**  
**A:** The operation fails with MySQL Error 1451 (`Cannot delete or update a parent row: a foreign key constraint fails`) because the foreign key was created with `ON DELETE RESTRICT`. Our application intercepts this and returns a friendly message explaining that products currently belong to that category.

---

### Section G, H, I, J: Normalization (1NF, 2NF, 3NF)
**Q11: What is Normalization?**  
**A:** Normalization is the process of structuring relational tables to reduce data redundancy and eliminate insertion, update, and deletion anomalies.

**Q12: How does your database satisfy First Normal Form (1NF)?**  
**A:**
1. All column values are atomic (single values like price, phone, email; no comma-separated lists).
2. Every table has a Primary Key.
3. No repeating columns (instead of having `Product1`, `Product2` inside a Purchase row, we created the child table `Purchase_Details`).

**Q13: How does your database satisfy Second Normal Form (2NF)?**  
**A:** It is in 1NF and contains no partial functional dependencies. In `Product`, `Supplier`, `Customer`, etc., primary keys are single columns, so partial dependencies cannot exist. In `Purchase_Details`, `Quantity` and historical `Unit_Price` depend on the specific line item, not partially on the parent order.

**Q14: How does your database satisfy Third Normal Form (3NF)?**  
**A:** It is in 2NF and contains no transitive dependencies (no non-key attribute depends on another non-key attribute). For example, `Category_Name` is stored only in `Category`, not in `Product`. `Supplier_Name` is stored only in `Supplier`, not in `Purchase`.

**Q15: Why is `Category_ID` NOT stored in `Purchase`?**  
**A:** A purchase contains products, and products already belong to categories. Storing `Category_ID` in `Purchase` would create a transitive dependency and redundant data. Furthermore, a single purchase order can procure items across multiple categories simultaneously.

---

### Section K & L: SQL Basics (SELECT, WHERE, ORDER BY)
**Q16: What is the purpose of the WHERE clause?**  
**A:** It filters rows based on a specified boolean condition before any grouping or aggregation takes place (e.g., `WHERE Price > 2000`).

**Q17: What is the difference between WHERE and ORDER BY?**  
**A:** `WHERE` determines which rows are selected from the table. `ORDER BY` determines the sorting sequence (ascending `ASC` or descending `DESC`) of the final selected rows.

---

### Section M, N, O: JOIN Operations
**Q18: What is the difference between an INNER JOIN and a LEFT JOIN?**  
**A:**
- **INNER JOIN**: Returns only rows where there is a matching key in both tables (e.g., products that have an assigned category).
- **LEFT JOIN (or LEFT OUTER JOIN)**: Returns all rows from the left table and matched rows from the right table. If no match exists, NULL values are returned for right table columns (e.g., listing all registered customers, including those who have never placed a sale order).

**Q19: Give an example of a multi-table JOIN in your project.**  
**A:** To display a complete sales receipt, we join 4 tables:
```sql
SELECT sa.Sale_ID, cu.Customer_Name, p.Product_Name, sd.Quantity, sd.Unit_Price
FROM Sale sa
JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
JOIN Sale_Details sd ON sa.Sale_ID = sd.Sale_ID
JOIN Product p ON sd.Product_ID = p.Product_ID;
```

---

### Section P & Q: GROUP BY & HAVING
**Q20: What is the difference between WHERE and HAVING?**  
**A:**
- `WHERE` filters individual rows **before** grouping and cannot use aggregate functions.
- `HAVING` filters aggregated groups **after** the `GROUP BY` clause is evaluated (e.g., `HAVING COUNT(Product_ID) > 2` or `HAVING SUM(Total_Amount) > 5000`).

---

### Section R: Aggregate Functions
**Q21: What aggregate functions did you use, and what do they calculate?**  
**A:**
- `COUNT()`: Counts the number of rows or non-null values.
- `SUM()`: Calculates the total sum of numerical values (e.g., total sales revenue).
- `AVG()`: Calculates the arithmetic mean (e.g., average product price).
- `MIN()`: Finds the smallest value (e.g., cheapest product).
- `MAX()`: Finds the largest value (e.g., highest single purchase order).

---

### Section S, T, U: Subqueries, Correlated Subqueries, and EXISTS
**Q22: What is a Subquery?**  
**A:** A query nested inside another SQL statement (in `SELECT`, `FROM`, or `WHERE`). Example: Finding products priced higher than the global average:
```sql
SELECT Product_Name, Price FROM Product WHERE Price > (SELECT AVG(Price) FROM Product);
```

**Q23: What is a Correlated Subquery?**  
**A:** A subquery that references columns from the outer query. It executes repeatedly, once for every candidate row evaluated by the outer query.  
*Example in our project*: Finding products whose price is strictly higher than the average price of products in their *own* category:
```sql
SELECT p1.Product_Name, p1.Price FROM Product p1
WHERE p1.Price > (SELECT AVG(p2.Price) FROM Product p2 WHERE p2.Category_ID = p1.Category_ID);
```

**Q24: What is the purpose of EXISTS and NOT EXISTS?**  
**A:** They test for the existence of rows in a subquery. `EXISTS` returns `TRUE` as soon as the first matching row is found (efficient short-circuiting). Example: Finding customers who have `NOT EXISTS` in `Sale` identifies inactive customers.

---

### Section V: Database Views
**Q25: What is a Database View, and why did you use views?**  
**A:** A View is a virtual table defined by a stored SQL query. It does not store physical data itself (unless materialized) but provides data abstraction, simplifies complex multi-table joins for application developers, and enhances security.  
*Example in our project*: `vw_low_stock_products` encapsulates the `WHERE Stock_Quantity <= Reorder_Level` query so the application can select from it directly.

---

### Section W, X, Y, Z: Transactions & ACID Properties
**Q26: What are ACID properties? How does this project demonstrate them?**  
**A:**
- **Atomicity**: The entire transaction succeeds or fails as a unit. In multi-product sales, either all line items are recorded and stock decremented, or if one item is out of stock, `ROLLBACK` cancels everything.
- **Consistency**: The database transitions from one valid state to another, strictly obeying all CHECK constraints (`Stock_Quantity >= 0`) and foreign keys.
- **Isolation**: Concurrent transactions cannot interfere with each other. We use row-level locking (`SELECT ... FOR UPDATE`) in MySQL InnoDB.
- **Durability**: Once `COMMIT` is executed, the changes are permanently written to non-volatile storage and survive system restarts.

**Q27: What is the difference between COMMIT and ROLLBACK?**  
**A:**
- `COMMIT`: Saves all operations in the current transaction permanently to the database.
- `ROLLBACK`: Aborts the transaction and undoes all modifications made since `START TRANSACTION`, restoring the database to its pre-transaction state.

---

### Section AA, AB, AC: Stock Management & Multi-Product Operations
**Q28: How does stock replenishment work during a Purchase?**  
**A:** Inside an ACID transaction:
1. Insert row in `Purchase` header.
2. For every item in the purchase:
   - Insert row in `Purchase_Details`.
   - Execute `UPDATE Product SET Stock_Quantity = Stock_Quantity + Quantity WHERE Product_ID = ?`.
3. Set `Total_Amount = SUM(Quantity * Unit_Price)`.
4. `COMMIT`.

**Q29: What happens if a customer attempts to purchase more units than available in stock?**  
**A:** The backend executes `SELECT Stock_Quantity FROM Product WHERE Product_ID = ? FOR UPDATE`. If requested quantity exceeds available stock:
1. The transaction triggers `ROLLBACK`.
2. Returns HTTP 400 with: *"Insufficient stock available for [Product]. Entire sale cancelled."*
3. MySQL retains zero orphan headers, zero detail rows, and no stock is deducted for any product in that order.

---

### Section AD, AE, AF: Backend & Application Architecture
**Q30: How does the web application communicate with MySQL?**  
**A:**
1. The browser UI sends an asynchronous JSON request using `fetch()`.
2. The Node.js Express server routes the request to the appropriate controller.
3. The controller uses the `mysql2/promise` connection pool to execute parameterized SQL queries against MySQL Community Server 26.7.
4. MySQL processes the query/transaction and returns the result set.
5. Express sends an HTTP JSON response back to the browser.
6. Vanilla JavaScript updates the DOM dynamically without reloading the page.

**Q31: Why are parameterized queries used?**  
**A:** Parameterized queries (using `?` placeholders) ensure that user inputs are treated strictly as data, never as executable SQL instructions, completely preventing **SQL Injection attacks**.
