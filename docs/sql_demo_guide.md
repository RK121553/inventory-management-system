# SQL Demonstration Guide for DBMS Viva

**Project Title**: INVENTORY MANAGEMENT  
**Source Scripts**: `database/05_basic_queries.sql` through `database/09_views.sql`  
**Database**: MySQL Community Server 26.7  

This guide provides a curated selection of actual SQL queries implemented in the project. Use these queries when an examiner asks you to demonstrate specific SQL concepts in the MySQL command line or Workbench.

---

### 1. Basic Projection & Filtering (`SELECT` + `WHERE`)
**Script**: `database/05_basic_queries.sql`
```sql
SELECT Product_ID, Product_Name, Stock_Quantity, Reorder_Level
FROM Product
WHERE Stock_Quantity <= Reorder_Level;
```
- **What it does**: Identifies all catalog products whose current stock is at or below their designated replenishment threshold.
- **Expected Result**: 5 rows showing products in low-stock status (e.g., Kingston SSD with stock 4 and reorder level 10).
- **DBMS Concept Demonstrated**: Relational Restriction / Filtering using the `WHERE` clause with a comparison operator (`<=`).

---

### 2. Pattern Matching with Wildcards (`LIKE`)
**Script**: `database/05_basic_queries.sql`
```sql
SELECT Supplier_ID, Supplier_Name, Address
FROM Supplier
WHERE Address LIKE '%Delhi%';
```
- **What it does**: Retrieves all vendors located in New Delhi by matching the substring `'Delhi'` anywhere in the address string.
- **Expected Result**: Supplier #1 (*Apex Infotech Solutions*, Nehru Place, New Delhi).
- **DBMS Concept Demonstrated**: String pattern matching using the SQL wildcard `%`.

---

### 3. Sorting & Pagination (`ORDER BY` + `LIMIT`)
**Script**: `database/05_basic_queries.sql`
```sql
SELECT Product_ID, Product_Name, Price
FROM Product
ORDER BY Price DESC
LIMIT 5;
```
- **What it does**: Sorts all catalog products by price in descending order and projects the top 5 most expensive products.
- **Expected Result**: Lists products starting from Logitech Webcam (₹6,800.00), Kingston SSD (₹5,600.00), etc.
- **DBMS Concept Demonstrated**: Ordering/Sorting (`ORDER BY DESC`) and query result truncation (`LIMIT`).

---

### 4. Multi-Table INNER JOIN (4 Tables)
**Script**: `database/06_join_queries.sql`
```sql
SELECT sa.Sale_ID,
       cu.Customer_Name,
       sa.Sale_Date,
       p.Product_Name,
       sd.Quantity,
       sd.Unit_Price,
       (sd.Quantity * sd.Unit_Price) AS Line_Item_Total
FROM Sale sa
INNER JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
INNER JOIN Sale_Details sd ON sa.Sale_ID = sd.Sale_ID
INNER JOIN Product p ON sd.Product_ID = p.Product_ID
ORDER BY sa.Sale_ID, sd.Sale_Detail_ID;
```
- **What it does**: Assembles a full itemized sales invoice showing customer name, transaction date, product title, quantity, price, and calculated line total.
- **Expected Result**: 11 detail rows linking customer identity to products sold across all 5 historical sales invoices.
- **DBMS Concept Demonstrated**: Multi-table INNER JOIN across 4 normalized relational entities via primary/foreign key pairs.

---

### 5. LEFT OUTER JOIN (Detecting Unmatched Records)
**Script**: `database/06_join_queries.sql`
```sql
SELECT cu.Customer_ID,
       cu.Customer_Name,
       cu.Phone,
       cu.Email
FROM Customer cu
LEFT JOIN Sale sa ON cu.Customer_ID = sa.Customer_ID
WHERE sa.Sale_ID IS NULL;
```
- **What it does**: Identifies registered customers who have **never** placed a single purchase order (inactive customers).
- **Expected Result**: Customer #6 (*Ananya Reddy*, Banjara Hills, Hyderabad).
- **DBMS Concept Demonstrated**: Set difference using `LEFT JOIN` combined with `IS NULL` filtering to find non-participating entities in a 1:M relationship.

---

### 6. Aggregate Functions & `GROUP BY`
**Script**: `database/07_aggregate_queries.sql`
```sql
SELECT c.Category_ID,
       c.Category_Name,
       COUNT(p.Product_ID) AS Number_Of_Products,
       AVG(p.Price) AS Average_Price,
       SUM(p.Stock_Quantity) AS Total_Category_Stock
FROM Category c
LEFT JOIN Product p ON c.Category_ID = p.Category_ID
GROUP BY c.Category_ID, c.Category_Name
ORDER BY Number_Of_Products DESC;
```
- **What it does**: Computes the total number of products, average selling price, and cumulative physical stock count for every product category.
- **Expected Result**: 5 rows summarizing metrics per category (e.g., Computer Peripherals has 3 products, average price ₹3,300.00, and 87 total units in stock).
- **DBMS Concept Demonstrated**: SQL aggregation (`COUNT`, `AVG`, `SUM`) partitioned by non-aggregated attributes using `GROUP BY`.

---

### 7. Group Filtering (`HAVING` Clause)
**Script**: `database/07_aggregate_queries.sql`
```sql
SELECT cu.Customer_Name,
       SUM(sa.Total_Amount) AS Total_Spent
FROM Customer cu
INNER JOIN Sale sa ON cu.Customer_ID = sa.Customer_ID
GROUP BY cu.Customer_ID, cu.Customer_Name
HAVING SUM(sa.Total_Amount) > 5000.00
ORDER BY Total_Spent DESC;
```
- **What it does**: Filters out low-volume buyers and displays only high-value customers who have spent strictly more than ₹5,000.00 across all invoices.
- **Expected Result**: Priya Sundaram (₹24,800.00), Rajesh Sharma (₹7,600.00), Amit Patil (₹6,000.00).
- **DBMS Concept Demonstrated**: Post-aggregation filtering using `HAVING` vs. row-level filtering with `WHERE`.

---

### 8. Scalar Subquery
**Script**: `database/08_subqueries.sql`
```sql
SELECT Product_ID, 
       Product_Name, 
       Price,
       (SELECT ROUND(AVG(Price), 2) FROM Product) AS Global_Average_Price
FROM Product
WHERE Price > (SELECT AVG(Price) FROM Product)
ORDER BY Price DESC;
```
- **What it does**: Computes the global average price across all products and selects only those products priced above that global average.
- **Expected Result**: 5 premium products (Webcam ₹6,800.00, SSD ₹5,600.00, UPS ₹3,600.00, RAM ₹3,400.00, Keyboard ₹2,650.00) against global average ₹2,146.43.
- **DBMS Concept Demonstrated**: Scalar subquery returning a single atomic value used dynamically inside `SELECT` and `WHERE` clauses.

---

### 9. Correlated Subquery
**Script**: `database/08_subqueries.sql`
```sql
SELECT p1.Product_ID,
       p1.Product_Name,
       p1.Category_ID,
       p1.Price,
       ROUND((SELECT AVG(p2.Price) 
              FROM Product p2 
              WHERE p2.Category_ID = p1.Category_ID), 2) AS Category_Avg_Price
FROM Product p1
WHERE p1.Price > (
    SELECT AVG(p2.Price)
    FROM Product p2
    WHERE p2.Category_ID = p1.Category_ID
)
ORDER BY p1.Category_ID, p1.Price DESC;
```
- **What it does**: Compares each product's price against the average price of products within its **own** category.
- **Expected Result**: Returns products that are above average *relative to their own category peers*.
- **DBMS Concept Demonstrated**: Correlated subquery where the inner query depends on outer query candidate row `p1.Category_ID`.

---

### 10. Correlated `EXISTS` Operator
**Script**: `database/08_subqueries.sql`
```sql
SELECT s.Supplier_ID, s.Supplier_Name, s.Phone
FROM Supplier s
WHERE EXISTS (
    SELECT 1 
    FROM Purchase pu 
    WHERE pu.Supplier_ID = s.Supplier_ID
);
```
- **What it does**: Evaluates vendor activity and returns suppliers who have fulfilled at least one purchase order.
- **Expected Result**: 5 active suppliers.
- **DBMS Concept Demonstrated**: Correlated existential quantifier (`EXISTS`) with short-circuit evaluation.

---

### 11. Database Views
**Script**: `database/09_views.sql`
```sql
-- View Definition:
CREATE OR REPLACE VIEW vw_category_stock_valuation AS
SELECT c.Category_ID,
       c.Category_Name,
       COUNT(p.Product_ID) AS Total_Products,
       COALESCE(SUM(p.Stock_Quantity), 0) AS Total_Units_In_Stock,
       COALESCE(SUM(p.Stock_Quantity * p.Price), 0.00) AS Category_Inventory_Valuation
FROM Category c
LEFT JOIN Product p ON c.Category_ID = p.Category_ID
GROUP BY c.Category_ID, c.Category_Name;

-- Querying the View:
SELECT * FROM vw_category_stock_valuation;
```
- **What it does**: Provides a clean virtual table that summarizes inventory capitalization per category without exposing the underlying table calculations.
- **Expected Result**: 5 rows displaying total valuation in INR for each category (e.g., Computer Peripherals: ₹1,89,650.00).
- **DBMS Concept Demonstrated**: Virtual Table / View abstraction, data hiding, and simplified reporting queries.
