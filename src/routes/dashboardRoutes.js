// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Dashboard Aggregate Routes
// Fetches live database statistics using SQL aggregates and joins
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/stats', async (req, res) => {
  try {
    // 1. Entity Counts
    const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) AS totalProducts FROM Product');
    const [[{ totalCategories }]] = await db.query('SELECT COUNT(*) AS totalCategories FROM Category');
    const [[{ totalSuppliers }]] = await db.query('SELECT COUNT(*) AS totalSuppliers FROM Supplier');
    const [[{ totalCustomers }]] = await db.query('SELECT COUNT(*) AS totalCustomers FROM Customer');
    const [[{ totalPurchases }]] = await db.query('SELECT COUNT(*) AS totalPurchases FROM Purchase');
    const [[{ totalSales }]] = await db.query('SELECT COUNT(*) AS totalSales FROM Sale');

    // 2. Low-Stock Count (Stock_Quantity <= Reorder_Level)
    const [[{ lowStockCount }]] = await db.query(
      'SELECT COUNT(*) AS lowStockCount FROM Product WHERE Stock_Quantity <= Reorder_Level'
    );

    // 3. Financial & Physical Inventory Aggregations
    const [[inventoryAgg]] = await db.query(`
      SELECT COALESCE(SUM(Stock_Quantity), 0) AS totalStockUnits,
             COALESCE(SUM(Stock_Quantity * Price), 0.00) AS totalInventoryValuation
      FROM Product
    `);

    const [[purchaseAgg]] = await db.query(`
      SELECT COALESCE(SUM(Total_Amount), 0.00) AS totalPurchaseSpend
      FROM Purchase
    `);

    const [[salesAgg]] = await db.query(`
      SELECT COALESCE(SUM(Total_Amount), 0.00) AS totalSalesRevenue
      FROM Sale
    `);

    // 4. Low-Stock Products List
    const [lowStockProducts] = await db.query(`
      SELECT p.Product_ID,
             p.Product_Name,
             c.Category_Name,
             p.Price,
             p.Stock_Quantity,
             p.Reorder_Level,
             (p.Reorder_Level - p.Stock_Quantity) AS Reorder_Deficit
      FROM Product p
      INNER JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE p.Stock_Quantity <= p.Reorder_Level
      ORDER BY Reorder_Deficit DESC
    `);

    // 5. Recent Purchases (Top 5)
    const [recentPurchases] = await db.query(`
      SELECT pu.Purchase_ID,
             s.Supplier_Name,
             pu.Purchase_Date,
             pu.Total_Amount,
             COUNT(pd.Purchase_Detail_ID) AS Total_Items
      FROM Purchase pu
      INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
      LEFT JOIN Purchase_Details pd ON pu.Purchase_ID = pd.Purchase_ID
      GROUP BY pu.Purchase_ID, s.Supplier_Name, pu.Purchase_Date, pu.Total_Amount
      ORDER BY pu.Purchase_Date DESC, pu.Purchase_ID DESC
      LIMIT 5
    `);

    // 6. Recent Sales (Top 5)
    const [recentSales] = await db.query(`
      SELECT sa.Sale_ID,
             cu.Customer_Name,
             sa.Sale_Date,
             sa.Total_Amount,
             COUNT(sd.Sale_Detail_ID) AS Total_Items
      FROM Sale sa
      INNER JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
      LEFT JOIN Sale_Details sd ON sa.Sale_ID = sd.Sale_ID
      GROUP BY sa.Sale_ID, cu.Customer_Name, sa.Sale_Date, sa.Total_Amount
      ORDER BY sa.Sale_Date DESC, sa.Sale_ID DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: Number(totalProducts),
          totalCategories: Number(totalCategories),
          totalSuppliers: Number(totalSuppliers),
          totalCustomers: Number(totalCustomers),
          totalPurchases: Number(totalPurchases),
          totalSales: Number(totalSales),
          lowStockCount: Number(lowStockCount),
          totalStockUnits: Number(inventoryAgg.totalStockUnits),
          totalInventoryValuation: parseFloat(Number(inventoryAgg.totalInventoryValuation).toFixed(2)),
          totalPurchaseSpend: parseFloat(Number(purchaseAgg.totalPurchaseSpend).toFixed(2)),
          totalSalesRevenue: parseFloat(Number(salesAgg.totalSalesRevenue).toFixed(2))
        },
        lowStockProducts,
        recentPurchases,
        recentSales
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching dashboard stats', error: error.message });
  }
});

module.exports = router;
