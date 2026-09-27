-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 09: Database Views
-- Demonstrating: Virtual Tables, Data Abstraction, and Pre-computed Reporting
-- ============================================================================

USE inventory_management;

-- ----------------------------------------------------------------------------
-- 1. View: vw_low_stock_products
-- Purpose: Quick retrieval of products that require urgent reordering
-- Logic: Stock_Quantity <= Reorder_Level
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_low_stock_products AS
SELECT p.Product_ID,
       p.Product_Name,
       c.Category_Name,
       p.Stock_Quantity AS Current_Stock,
       p.Reorder_Level,
       (p.Reorder_Level - p.Stock_Quantity) AS Reorder_Deficit,
       p.Price AS Unit_Price
FROM Product p
INNER JOIN Category c ON p.Category_ID = c.Category_ID
WHERE p.Stock_Quantity <= p.Reorder_Level;


-- ----------------------------------------------------------------------------
-- 2. View: vw_product_inventory_status
-- Purpose: Overview of all products tagged with real-time stock alert status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_inventory_status AS
SELECT p.Product_ID,
       p.Product_Name,
       c.Category_Name,
       p.Price,
       p.Stock_Quantity,
       p.Reorder_Level,
       CASE 
           WHEN p.Stock_Quantity <= p.Reorder_Level THEN 'LOW STOCK ALERT'
           ELSE 'ADEQUATE STOCK'
       END AS Stock_Status
FROM Product p
INNER JOIN Category c ON p.Category_ID = c.Category_ID;


-- ----------------------------------------------------------------------------
-- 3. View: vw_sales_summary
-- Purpose: Executive summary of all sales invoices with customer & item counts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_sales_summary AS
SELECT sa.Sale_ID,
       sa.Customer_ID,
       cu.Customer_Name,
       cu.Phone AS Customer_Phone,
       sa.Sale_Date,
       COUNT(sd.Sale_Detail_ID) AS Total_Line_Items,
       COALESCE(SUM(sd.Quantity), 0) AS Total_Units_Sold,
       sa.Total_Amount AS Invoice_Total
FROM Sale sa
INNER JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
LEFT JOIN Sale_Details sd ON sa.Sale_ID = sd.Sale_ID
GROUP BY sa.Sale_ID, sa.Customer_ID, cu.Customer_Name, cu.Phone, sa.Sale_Date, sa.Total_Amount;


-- ----------------------------------------------------------------------------
-- 4. View: vw_purchase_summary
-- Purpose: Executive summary of all purchase orders with supplier & item counts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_purchase_summary AS
SELECT pu.Purchase_ID,
       pu.Supplier_ID,
       s.Supplier_Name,
       s.Phone AS Supplier_Phone,
       pu.Purchase_Date,
       COUNT(pd.Purchase_Detail_ID) AS Total_Line_Items,
       COALESCE(SUM(pd.Quantity), 0) AS Total_Units_Purchased,
       pu.Total_Amount AS PO_Total
FROM Purchase pu
INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
LEFT JOIN Purchase_Details pd ON pu.Purchase_ID = pd.Purchase_ID
GROUP BY pu.Purchase_ID, pu.Supplier_ID, s.Supplier_Name, s.Phone, pu.Purchase_Date, pu.Total_Amount;


-- ----------------------------------------------------------------------------
-- 5. View: vw_category_stock_valuation
-- Purpose: Category-level inventory capitalization and stock counts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_category_stock_valuation AS
SELECT c.Category_ID,
       c.Category_Name,
       COUNT(p.Product_ID) AS Total_Products,
       COALESCE(SUM(p.Stock_Quantity), 0) AS Total_Units_In_Stock,
       COALESCE(SUM(p.Stock_Quantity * p.Price), 0.00) AS Category_Inventory_Valuation
FROM Category c
LEFT JOIN Product p ON c.Category_ID = p.Category_ID
GROUP BY c.Category_ID, c.Category_Name;
