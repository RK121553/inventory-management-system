// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Product Routes & CRUD Operations
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all products (with Category Name, Low Stock indicator, and search/filter)
router.get('/', async (req, res) => {
  try {
    const { search, category_id, low_stock } = req.query;
    let sql = `
      SELECT p.Product_ID,
             p.Product_Name,
             p.Category_ID,
             c.Category_Name,
             p.Price,
             p.Stock_Quantity,
             p.Reorder_Level,
             (p.Stock_Quantity <= p.Reorder_Level) AS Is_Low_Stock,
             GREATEST(0, p.Reorder_Level - p.Stock_Quantity) AS Reorder_Deficit
      FROM Product p
      INNER JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (p.Product_Name LIKE ? OR c.Category_Name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category_id) {
      sql += ' AND p.Category_ID = ?';
      params.push(category_id);
    }

    if (low_stock === 'true') {
      sql += ' AND p.Stock_Quantity <= p.Reorder_Level';
    }

    sql += ' ORDER BY p.Product_ID ASC';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching products', error: error.message });
  }
});

// GET low-stock products only
router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await db.query(`
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
      ORDER BY Reorder_Deficit DESC, p.Stock_Quantity ASC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching low stock products', error: error.message });
  }
});

// GET single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT p.Product_ID,
             p.Product_Name,
             p.Category_ID,
             c.Category_Name,
             p.Price,
             p.Stock_Quantity,
             p.Reorder_Level,
             (p.Stock_Quantity <= p.Reorder_Level) AS Is_Low_Stock
      FROM Product p
      INNER JOIN Category c ON p.Category_ID = c.Category_ID
      WHERE p.Product_ID = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Product with ID ${id} not found.` });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching product', error: error.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    const { Product_Name, Category_ID, Price, Stock_Quantity, Reorder_Level } = req.body;

    if (!Product_Name || !Product_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Product Name is required.' });
    }
    if (!Category_ID) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const numPrice = parseFloat(Price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
    }

    const numStock = parseInt(Stock_Quantity, 10);
    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock Quantity must be a non-negative integer.' });
    }

    const numReorder = parseInt(Reorder_Level, 10);
    if (isNaN(numReorder) || numReorder < 0) {
      return res.status(400).json({ success: false, message: 'Reorder Level must be a non-negative integer.' });
    }

    // Check if category exists
    const [cat] = await db.query('SELECT Category_ID FROM Category WHERE Category_ID = ?', [Category_ID]);
    if (cat.length === 0) {
      return res.status(400).json({ success: false, message: `Invalid Category ID ${Category_ID}. Category does not exist.` });
    }

    const [result] = await db.query(
      'INSERT INTO Product (Product_Name, Category_ID, Price, Stock_Quantity, Reorder_Level) VALUES (?, ?, ?, ?, ?)',
      [Product_Name.trim(), Category_ID, numPrice, numStock, numReorder]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: {
        Product_ID: result.insertId,
        Product_Name: Product_Name.trim(),
        Category_ID,
        Price: numPrice,
        Stock_Quantity: numStock,
        Reorder_Level: numReorder
      }
    });
  } catch (error) {
    if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ success: false, message: 'Database check constraint failed: values must be non-negative.' });
    }
    res.status(500).json({ success: false, message: 'Error creating product', error: error.message });
  }
});

// PUT update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Product_Name, Category_ID, Price, Stock_Quantity, Reorder_Level } = req.body;

    if (!Product_Name || !Product_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Product Name is required.' });
    }
    if (!Category_ID) {
      return res.status(400).json({ success: false, message: 'Category is required.' });
    }

    const numPrice = parseFloat(Price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a valid non-negative number.' });
    }

    const numStock = parseInt(Stock_Quantity, 10);
    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock Quantity must be a non-negative integer.' });
    }

    const numReorder = parseInt(Reorder_Level, 10);
    if (isNaN(numReorder) || numReorder < 0) {
      return res.status(400).json({ success: false, message: 'Reorder Level must be a non-negative integer.' });
    }

    // Verify product exists
    const [existing] = await db.query('SELECT Product_ID FROM Product WHERE Product_ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Product with ID ${id} not found.` });
    }

    // Verify category exists
    const [cat] = await db.query('SELECT Category_ID FROM Category WHERE Category_ID = ?', [Category_ID]);
    if (cat.length === 0) {
      return res.status(400).json({ success: false, message: `Category ID ${Category_ID} does not exist.` });
    }

    await db.query(
      'UPDATE Product SET Product_Name = ?, Category_ID = ?, Price = ?, Stock_Quantity = ?, Reorder_Level = ? WHERE Product_ID = ?',
      [Product_Name.trim(), Category_ID, numPrice, numStock, numReorder, id]
    );

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: {
        Product_ID: Number(id),
        Product_Name: Product_Name.trim(),
        Category_ID,
        Price: numPrice,
        Stock_Quantity: numStock,
        Reorder_Level: numReorder
      }
    });
  } catch (error) {
    if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ success: false, message: 'Check constraint violated: stock and price must be non-negative.' });
    }
    res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
  }
});

// DELETE product (Protected via Referential Integrity Check)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await db.query('SELECT Product_Name FROM Product WHERE Product_ID = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ success: false, message: `Product with ID ${id} not found.` });
    }

    // Check purchase details
    const [purchases] = await db.query('SELECT Purchase_Detail_ID FROM Purchase_Details WHERE Product_ID = ? LIMIT 1', [id]);
    if (purchases.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product "${product[0].Product_Name}" because it is part of historical purchase transactions.`
      });
    }

    // Check sale details
    const [sales] = await db.query('SELECT Sale_Detail_ID FROM Sale_Details WHERE Product_ID = ? LIMIT 1', [id]);
    if (sales.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product "${product[0].Product_Name}" because it is part of historical sales transactions.`
      });
    }

    await db.query('DELETE FROM Product WHERE Product_ID = ?', [id]);
    res.json({ success: true, message: `Product "${product[0].Product_Name}" deleted successfully.` });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product because it is referenced in transactions.'
      });
    }
    res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
  }
});

module.exports = router;
