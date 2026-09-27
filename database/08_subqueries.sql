-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 08: Subqueries (Nested & Correlated Queries)
-- Demonstrating: Scalar Subqueries, Subqueries with IN, NOT IN, EXISTS, 
-- NOT EXISTS, and Correlated Subqueries
-- ============================================================================

USE inventory_management;

-- ----------------------------------------------------------------------------
-- 1. Scalar Subqueries in WHERE Clause
-- ----------------------------------------------------------------------------

-- 1.1 Find all products priced higher than the overall average product price
SELECT Product_ID, 
       Product_Name, 
       Price,
       (SELECT ROUND(AVG(Price), 2) FROM Product) AS Global_Average_Price
FROM Product
WHERE Price > (SELECT AVG(Price) FROM Product)
ORDER BY Price DESC;

-- 1.2 Find the customer who made the single largest sale purchase
SELECT Customer_ID, Customer_Name, Phone, Email 
FROM Customer
WHERE Customer_ID = (
    SELECT Customer_ID 
    FROM Sale 
    ORDER BY Total_Amount DESC 
    LIMIT 1
);


-- ----------------------------------------------------------------------------
-- 2. Subqueries with IN and NOT IN
-- ----------------------------------------------------------------------------

-- 2.1 Find all products that were purchased from supplier 'Apex Infotech Solutions'
SELECT Product_ID, Product_Name, Price, Stock_Quantity
FROM Product
WHERE Product_ID IN (
    SELECT pd.Product_ID
    FROM Purchase_Details pd
    INNER JOIN Purchase pu ON pd.Purchase_ID = pu.Purchase_ID
    INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
    WHERE s.Supplier_Name = 'Apex Infotech Solutions'
);

-- 2.2 Find products that have NEVER been sold in any sales transaction (NOT IN)
SELECT Product_ID, Product_Name, Category_ID, Stock_Quantity
FROM Product
WHERE Product_ID NOT IN (
    SELECT DISTINCT Product_ID 
    FROM Sale_Details
);


-- ----------------------------------------------------------------------------
-- 3. Correlated Subqueries
-- ----------------------------------------------------------------------------

-- 3.1 Find products whose price is strictly above the average price of their OWN category
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

-- 3.2 Correlated EXISTS: Find suppliers who have at least one purchase order
SELECT s.Supplier_ID, s.Supplier_Name, s.Phone
FROM Supplier s
WHERE EXISTS (
    SELECT 1 
    FROM Purchase pu 
    WHERE pu.Supplier_ID = s.Supplier_ID
);

-- 3.3 Correlated NOT EXISTS: Find customers who have NEVER placed any sale order
SELECT cu.Customer_ID, cu.Customer_Name, cu.Phone, cu.Email
FROM Customer cu
WHERE NOT EXISTS (
    SELECT 1 
    FROM Sale sa 
    WHERE sa.Customer_ID = cu.Customer_ID
);


-- ----------------------------------------------------------------------------
-- 4. Derived Table (Subquery in FROM Clause)
-- ----------------------------------------------------------------------------

-- 4.1 Compute the average sales revenue per customer by aggregating first in a subquery
SELECT ROUND(AVG(Customer_Total_Spend), 2) AS Average_Customer_Spend
FROM (
    SELECT Customer_ID, SUM(Total_Amount) AS Customer_Total_Spend
    FROM Sale
    GROUP BY Customer_ID
) AS Customer_Spends;
