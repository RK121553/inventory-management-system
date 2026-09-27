// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Sales Transaction Routes
// Supports Multi-Product Sales, Stock Decrement, Anti-Negative Stock Guard, and ACID Transactions
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all sales (with customer info and line-item counts)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sa.Sale_ID,
             sa.Customer_ID,
             cu.Customer_Name,
             cu.Phone AS Customer_Phone,
             sa.Sale_Date,
             sa.Total_Amount,
             COUNT(sd.Sale_Detail_ID) AS Total_Line_Items,
             COALESCE(SUM(sd.Quantity), 0) AS Total_Units_Sold
      FROM Sale sa
      INNER JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
      LEFT JOIN Sale_Details sd ON sa.Sale_ID = sd.Sale_ID
      GROUP BY sa.Sale_ID, sa.Customer_ID, cu.Customer_Name, cu.Phone, sa.Sale_Date, sa.Total_Amount
      ORDER BY sa.Sale_Date DESC, sa.Sale_ID DESC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching sales', error: error.message });
  }
});

// GET single sale by ID with full line items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [headerRows] = await db.query(`
      SELECT sa.Sale_ID,
             sa.Customer_ID,
             cu.Customer_Name,
             cu.Phone AS Customer_Phone,
             cu.Email AS Customer_Email,
             cu.Address AS Customer_Address,
             sa.Sale_Date,
             sa.Total_Amount
      FROM Sale sa
      INNER JOIN Customer cu ON sa.Customer_ID = cu.Customer_ID
      WHERE sa.Sale_ID = ?
    `, [id]);

    if (headerRows.length === 0) {
      return res.status(404).json({ success: false, message: `Sale #${id} not found.` });
    }

    const [detailRows] = await db.query(`
      SELECT sd.Sale_Detail_ID,
             sd.Product_ID,
             p.Product_Name,
             c.Category_Name,
             sd.Quantity,
             sd.Unit_Price,
             (sd.Quantity * sd.Unit_Price) AS Line_Total
      FROM Sale_Details sd
      INNER JOIN Product p ON sd.Product_ID = p.Product_ID
      INNER JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE sd.Sale_ID = ?
      ORDER BY sd.Sale_Detail_ID ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...headerRows[0],
        items: detailRows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching sale details', error: error.message });
  }
});

// POST create a new multi-product Sale
// Transaction Workflow:
// START TRANSACTION
// -> Validate Customer & Line Items
// -> Row-level lock (FOR UPDATE) and verify ALL requested product stocks
// -> IF ANY product has Quantity > Stock_Quantity:
//      ROLLBACK ENTIRE TRANSACTION & Return "Insufficient stock available"
// -> Calculate Total_Amount = SUM(Quantity * Unit_Price)
// -> Insert Sale Header
// -> Insert all Sale_Details
// -> Decrement Stock for each Product: Stock_Quantity -= Quantity
// -> COMMIT (Atomic success)
router.post('/', async (req, res) => {
  const { Customer_ID, Sale_Date, items } = req.body;

  // 1. Validation: Header fields
  if (!Customer_ID) {
    return res.status(400).json({ success: false, message: 'Customer is required.' });
  }

  // 2. Validation: Line items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'A sale invoice must contain at least one product line item in "items" array.'
    });
  }

  // 3. Validation: Format & non-negative numbers
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

    // Verify customer exists
    const [customerCheck] = await connection.query('SELECT Customer_ID, Customer_Name FROM Customer WHERE Customer_ID = ?', [Customer_ID]);
    if (customerCheck.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: `Customer ID ${Customer_ID} does not exist.` });
    }

    // Accumulate total requested quantity per product (handles multi-row duplicate product IDs safely)
    const productRequestMap = new Map();
    for (const item of items) {
      const pId = Number(item.Product_ID);
      const qty = parseInt(item.Quantity, 10);
      const currentReq = productRequestMap.get(pId) || 0;
      productRequestMap.set(pId, currentReq + qty);
    }

    // Verify stock availability for ALL products using SELECT ... FOR UPDATE
    const productInfoMap = new Map();
    for (const [pId, requestedQty] of productRequestMap.entries()) {
      const [prodRows] = await connection.query(
        'SELECT Product_ID, Product_Name, Stock_Quantity, Price FROM Product WHERE Product_ID = ? FOR UPDATE',
        [pId]
      );

      if (prodRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: `Product ID ${pId} does not exist.` });
      }

      const product = prodRows[0];
      // STRICT STOCK SUFFICIENCY CHECK
      if (requestedQty > product.Stock_Quantity) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock available for "${product.Product_Name}" (ID #${product.Product_ID}). Requested: ${requestedQty}, Available: ${product.Stock_Quantity}. Entire sale cancelled.`
        });
      }

      productInfoMap.set(pId, product);
    }

    // Calculate exact Total_Amount = SUM(Quantity * Unit_Price)
    let totalAmount = 0.00;
    const verifiedDetails = [];
    for (const item of items) {
      const qty = parseInt(item.Quantity, 10);
      const price = parseFloat(item.Unit_Price);
      const lineTotal = qty * price;
      totalAmount += lineTotal;

      const product = productInfoMap.get(Number(item.Product_ID));
      verifiedDetails.push({
        Product_ID: item.Product_ID,
        Product_Name: product.Product_Name,
        Previous_Stock: product.Stock_Quantity,
        Quantity: qty,
        Unit_Price: price,
        Line_Total: lineTotal
      });
    }

    // Insert Sale Header
    const saleDate = Sale_Date ? new Date(Sale_Date) : new Date();
    const [headerResult] = await connection.query(
      'INSERT INTO Sale (Customer_ID, Sale_Date, Total_Amount) VALUES (?, ?, ?)',
      [Customer_ID, saleDate, totalAmount.toFixed(2)]
    );
    const saleId = headerResult.insertId;

    // Insert Detail rows and Decrement Stock
    const processedItems = [];
    for (const item of verifiedDetails) {
      const [detailResult] = await connection.query(
        'INSERT INTO Sale_Details (Sale_ID, Product_ID, Quantity, Unit_Price) VALUES (?, ?, ?, ?)',
        [saleId, item.Product_ID, item.Quantity, item.Unit_Price]
      );

      // Decrement stock in Product table
      await connection.query(
        'UPDATE Product SET Stock_Quantity = Stock_Quantity - ? WHERE Product_ID = ?',
        [item.Quantity, item.Product_ID]
      );

      // Fetch fresh updated stock
      const [updatedProd] = await connection.query(
        'SELECT Stock_Quantity, Reorder_Level FROM Product WHERE Product_ID = ?',
        [item.Product_ID]
      );

      processedItems.push({
        Sale_Detail_ID: detailResult.insertId,
        Product_ID: item.Product_ID,
        Product_Name: item.Product_Name,
        Quantity: item.Quantity,
        Unit_Price: item.Unit_Price,
        Line_Total: item.Line_Total,
        Remaining_Stock: updatedProd[0].Stock_Quantity,
        Is_Low_Stock: updatedProd[0].Stock_Quantity <= updatedProd[0].Reorder_Level
      });
    }

    // Commit Transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      success: true,
      message: `Sale invoice #${saleId} completed successfully. Stock updated for ${processedItems.length} products.`,
      data: {
        Sale_ID: saleId,
        Customer_ID,
        Customer_Name: customerCheck[0].Customer_Name,
        Sale_Date: saleDate,
        Total_Amount: parseFloat(totalAmount.toFixed(2)),
        items: processedItems
      }
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({
      success: false,
      message: 'Transaction failed. Sale was rolled back completely.',
      error: error.message
    });
  }
});

module.exports = router;
