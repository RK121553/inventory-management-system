-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 06: Join SQL Queries
-- Demonstrating: INNER JOIN, LEFT OUTER JOIN, and Multi-Table Joins
-- ============================================================================

USE inventory_management;

-- ----------------------------------------------------------------------------
-- 1. Two-Table INNER JOINs
-- ----------------------------------------------------------------------------

-- 1.1 List all products alongside their corresponding category name
SELECT p.Product_ID, 
       p.Product_Name, 
       c.Category_Name, 
       p.Price, 
       p.Stock_Quantity
FROM Product p
INNER JOIN Category c ON p.Category_ID = c.Category_ID
ORDER BY c.Category_Name, p.Product_Name;

-- 1.2 List all purchases with supplier name and contact phone
SELECT pu.Purchase_ID, 
       s.Supplier_Name, 
       s.Phone AS Supplier_Phone, 
       pu.Purchase_Date, 
       pu.Total_Amount
FROM Purchase pu
INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
ORDER BY pu.Purchase_Date DESC;

-- 1.3 List all sales with customer name and contact phone
SELECT sa.Sale_ID, 
       cu.Customer_Name, 
       cu.Phone AS Customer_Phone, 
       sa.Sale_Date, 
       sa.Total_Amount
FROM Sale sa
INNER JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
ORDER BY sa.Sale_Date DESC;


-- ----------------------------------------------------------------------------
-- 2. Multi-Table INNER JOINs (3 & 4 Tables)
-- ----------------------------------------------------------------------------

-- 2.1 Complete Purchase Invoice Breakdown:
-- Supplier -> Purchase -> Purchase_Details -> Product
SELECT pu.Purchase_ID,
       s.Supplier_Name,
       pu.Purchase_Date,
       p.Product_Name,
       pd.Quantity,
       pd.Unit_Price,
       (pd.Quantity * pd.Unit_Price) AS Line_Item_Total
FROM Purchase pu
INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
INNER JOIN Purchase_Details pd ON pu.Purchase_ID = pd.Purchase_ID
INNER JOIN Product p ON pd.Product_ID = p.Product_ID
ORDER BY pu.Purchase_ID, pd.Purchase_Detail_ID;

-- 2.2 Complete Sales Receipt Breakdown:
-- Customer -> Sale -> Sale_Details -> Product
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


-- ----------------------------------------------------------------------------
-- 3. LEFT OUTER JOINs (Identifying Matches & Unmatched Entities)
-- ----------------------------------------------------------------------------

-- 3.1 All categories and any products belonging to them
-- (Ensures categories with zero products still show up)
SELECT c.Category_ID,
       c.Category_Name,
       p.Product_ID,
       p.Product_Name,
       p.Stock_Quantity
FROM Category c
LEFT JOIN Product p ON c.Category_ID = p.Category_ID
ORDER BY c.Category_ID;

-- 3.2 Find all products and their sold quantities, including products never sold
SELECT p.Product_ID,
       p.Product_Name,
       p.Stock_Quantity,
       COALESCE(SUM(sd.Quantity), 0) AS Total_Units_Sold
FROM Product p
LEFT JOIN Sale_Details sd ON p.Product_ID = sd.Product_ID
GROUP BY p.Product_ID, p.Product_Name, p.Stock_Quantity
ORDER BY Total_Units_Sold DESC;

-- 3.3 Find registered customers who have NOT yet placed any sales order (Unmatched Left Join)
SELECT cu.Customer_ID,
       cu.Customer_Name,
       cu.Phone,
       cu.Email
FROM Customer cu
LEFT JOIN Sale sa ON cu.Customer_ID = sa.Customer_ID
WHERE sa.Sale_ID IS NULL;
