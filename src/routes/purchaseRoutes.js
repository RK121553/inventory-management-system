// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Purchase Transaction Routes
// Supports Multi-Product Purchases, Stock Increment, and ACID Transactions
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all purchases (with supplier info and line-item counts)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pu.Purchase_ID,
             pu.Supplier_ID,
             s.Supplier_Name,
             s.Phone AS Supplier_Phone,
             pu.Purchase_Date,
             pu.Total_Amount,
             COUNT(pd.Purchase_Detail_ID) AS Total_Line_Items,
             COALESCE(SUM(pd.Quantity), 0) AS Total_Units_Purchased
      FROM Purchase pu
      INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
      LEFT JOIN Purchase_Details pd ON pu.Purchase_ID = pd.Purchase_ID
      GROUP BY pu.Purchase_ID, pu.Supplier_ID, s.Supplier_Name, s.Phone, pu.Purchase_Date, pu.Total_Amount
      ORDER BY pu.Purchase_Date DESC, pu.Purchase_ID DESC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching purchases', error: error.message });
  }
});

// GET single purchase by ID with full line items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [headerRows] = await db.query(`
      SELECT pu.Purchase_ID,
             pu.Supplier_ID,
             s.Supplier_Name,
             s.Phone AS Supplier_Phone,
             s.Email AS Supplier_Email,
             s.Address AS Supplier_Address,
             pu.Purchase_Date,
             pu.Total_Amount
      FROM Purchase pu
      INNER JOIN Supplier s ON pu.Supplier_ID = s.Supplier_ID
      WHERE pu.Purchase_ID = ?
    `, [id]);

    if (headerRows.length === 0) {
      return res.status(404).json({ success: false, message: `Purchase #${id} not found.` });
    }

    const [detailRows] = await db.query(`
      SELECT pd.Purchase_Detail_ID,
             pd.Product_ID,
             p.Product_Name,
             c.Category_Name,
             pd.Quantity,
             pd.Unit_Price,
             (pd.Quantity * pd.Unit_Price) AS Line_Total
      FROM Purchase_Details pd
      INNER JOIN Product p ON pd.Product_ID = p.Product_ID
      INNER JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE pd.Purchase_ID = ?
      ORDER BY pd.Purchase_Detail_ID ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...headerRows[0],
        items: detailRows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching purchase details', error: error.message });
  }
});

// POST create a new multi-product Purchase
// Transaction Workflow:
// START TRANSACTION
// -> Validate Supplier & Products
// -> Calculate Total_Amount = SUM(Quantity * Unit_Price)
// -> Insert Purchase Header
// -> Insert all Purchase_Details
// -> Increment Stock for each Product: Stock_Quantity += Quantity
// -> COMMIT (or ROLLBACK on any failure)
router.post('/', async (req, res) => {
  const { Supplier_ID, Purchase_Date, items } = req.body;

  // 1. Validation: Header fields
  if (!Supplier_ID) {
    return res.status(400).json({ success: false, message: 'Supplier is required.' });
  }

  // 2. Validation: Line items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'A purchase order must contain at least one product line item in "items" array.'
    });
  }

  // 3. Validation: Line items format & values
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.Product_ID) {
      return res.status(400).json({ success: false, message: `Line item #${i + 1}: Product ID is required.` });
    }
    const qty = parseInt(item.Quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `Line item #${i + 1}: Quantity must be an integer greater than 0.` });
    }
    const price = parseFloat(item.Unit_Price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: `Line item #${i + 1}: Unit Price must be a non-negative number.` });
    }
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Verify supplier exists
    const [supplierCheck] = await connection.query('SELECT Supplier_ID, Supplier_Name FROM Supplier WHERE Supplier_ID = ?', [Supplier_ID]);
    if (supplierCheck.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: `Supplier ID ${Supplier_ID} does not exist.` });
    }

    // Verify all products exist and calculate exact total
    let totalAmount = 0.00;
    const verifiedItems = [];

    for (const item of items) {
      const qty = parseInt(item.Quantity, 10);
      const price = parseFloat(item.Unit_Price);
      const lineTotal = qty * price;
      totalAmount += lineTotal;

      const [prodCheck] = await connection.query(
        'SELECT Product_ID, Product_Name, Stock_Quantity FROM Product WHERE Product_ID = ?',
        [item.Product_ID]
      );

      if (prodCheck.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: `Product ID ${item.Product_ID} does not exist.` });
      }

      verifiedItems.push({
        Product_ID: item.Product_ID,
        Product_Name: prodCheck[0].Product_Name,
        Previous_Stock: prodCheck[0].Stock_Quantity,
        Quantity: qty,
        Unit_Price: price,
        Line_Total: lineTotal
      });
    }

    // Insert Purchase Header
    const purchaseDate = Purchase_Date ? new Date(Purchase_Date) : new Date();
    const [headerResult] = await connection.query(
      'INSERT INTO Purchase (Supplier_ID, Purchase_Date, Total_Amount) VALUES (?, ?, ?)',
      [Supplier_ID, purchaseDate, totalAmount.toFixed(2)]
    );
    const purchaseId = headerResult.insertId;

    // Insert Detail rows and Update Stock
    const processedItems = [];
    for (const item of verifiedItems) {
      const [detailResult] = await connection.query(
        'INSERT INTO Purchase_Details (Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?)',
        [purchaseId, item.Product_ID, item.Quantity, item.Unit_Price]
      );

      // Increase stock in Product table
      await connection.query(
        'UPDATE Product SET Stock_Quantity = Stock_Quantity + ? WHERE Product_ID = ?',
        [item.Quantity, item.Product_ID]
      );

      processedItems.push({
        Purchase_Detail_ID: detailResult.insertId,
        Product_ID: item.Product_ID,
        Product_Name: item.Product_Name,
        Quantity: item.Quantity,
        Unit_Price: item.Unit_Price,
        Line_Total: item.Line_Total,
        New_Stock: item.Previous_Stock + item.Quantity
      });
    }

    // Commit Transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: `Purchase order #${purchaseId} recorded successfully. Stock updated for ${processedItems.length} products.`,
      data: {
        Purchase_ID: purchaseId,
        Supplier_ID,
        Supplier_Name: supplierCheck[0].Supplier_Name,
        Purchase_Date: purchaseDate,
        Total_Amount: parseFloat(totalAmount.toFixed(2)),
        items: processedItems
      }
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({
      success: false,
      message: 'Transaction failed. Purchase was rolled back completely.',
      error: error.message
    });
  }
});

module.exports = router;
