-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 05: Basic SQL Queries
-- Demonstrating: SELECT, WHERE, ORDER BY, DISTINCT, Pattern Matching (LIKE),
-- Logical Operators (AND, OR, NOT), Range Filtering (BETWEEN), and Set Membership (IN)
-- ============================================================================

USE inventory_management;

-- ----------------------------------------------------------------------------
-- 1. Simple Table Scans & Column Projection
-- ----------------------------------------------------------------------------
-- 1.1 Retrieve all products with all attributes
SELECT * FROM Product;

-- 1.2 Retrieve only Product Name, Price, and Stock Quantity
SELECT Product_Name, Price, Stock_Quantity 
FROM Product;

-- 1.3 Retrieve distinct customer email domains / distinct categories present in products
SELECT DISTINCT Category_ID 
FROM Product;


-- ----------------------------------------------------------------------------
-- 2. Filtering with WHERE Clause & Comparison Operators
-- ----------------------------------------------------------------------------
-- 2.1 Retrieve products priced above Rs. 2,000
SELECT Product_ID, Product_Name, Price 
FROM Product 
WHERE Price > 2000.00;

-- 2.2 Retrieve products currently at or below their reorder level (Low Stock)
SELECT Product_ID, Product_Name, Stock_Quantity, Reorder_Level 
FROM Product 
WHERE Stock_Quantity <= Reorder_Level;

-- 2.3 Retrieve products within a specific price range using BETWEEN
SELECT Product_ID, Product_Name, Price 
FROM Product 
WHERE Price BETWEEN 500.00 AND 3000.00;

-- 2.4 Retrieve products belonging to specific categories (e.g. Category 1 or 2) using IN
SELECT Product_ID, Product_Name, Category_ID, Price 
FROM Product 
WHERE Category_ID IN (1, 2);


-- ----------------------------------------------------------------------------
-- 3. Pattern Matching (LIKE with Wildcards)
-- ----------------------------------------------------------------------------
-- 3.1 Find suppliers located in Delhi using LIKE
SELECT Supplier_ID, Supplier_Name, Address 
FROM Supplier 
WHERE Address LIKE '%Delhi%';

-- 3.2 Find products that contain 'USB' anywhere in the title
SELECT Product_ID, Product_Name 
FROM Product 
WHERE Product_Name LIKE '%USB%';

-- 3.3 Find customers whose email domain ends with '.in'
SELECT Customer_ID, Customer_Name, Email 
FROM Customer 
WHERE Email LIKE '%.in';


-- ----------------------------------------------------------------------------
-- 4. Sorting & Limiting (ORDER BY, LIMIT)
-- ----------------------------------------------------------------------------
-- 4.1 Retrieve all products sorted by Price descending (Highest to Lowest)
SELECT Product_ID, Product_Name, Price 
FROM Product 
ORDER BY Price DESC;

-- 4.2 Retrieve top 5 highest stocked products
SELECT Product_ID, Product_Name, Stock_Quantity 
FROM Product 
ORDER BY Stock_Quantity DESC 
LIMIT 5;

-- 4.3 Retrieve customers ordered alphabetically by name
SELECT Customer_ID, Customer_Name, Phone, Email 
FROM Customer 
ORDER BY Customer_Name ASC;
