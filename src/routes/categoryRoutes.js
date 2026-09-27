// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Category Routes & CRUD Operations
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all categories with product counts
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.Category_ID, 
             c.Category_Name, 
             c.Description,
             COUNT(p.Product_ID) AS Product_Count
      FROM Category c
      LEFT JOIN Product p ON c.Category_ID = p.Category_ID
      GROUP BY c.Category_ID, c.Category_Name, c.Description
      ORDER BY c.Category_ID ASC
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching categories', error: error.message });
  }
});

// GET single category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM Category WHERE Category_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Category with ID ${id} not found.` });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching category', error: error.message });
  }
});

// POST create category
router.post('/', async (req, res) => {
  try {
    const { Category_Name, Description } = req.body;
    if (!Category_Name || !Category_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Category Name is required.' });
    }

    // Check for duplicate name
    const [existing] = await db.query('SELECT Category_ID FROM Category WHERE LOWER(Category_Name) = LOWER(?)', [Category_Name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Category '${Category_Name}' already exists.` });
    }

    const [result] = await db.query(
      'INSERT INTO Category (Category_Name, Description) VALUES (?, ?)',
      [Category_Name.trim(), Description ? Description.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: { Category_ID: result.insertId, Category_Name: Category_Name.trim(), Description }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating category', error: error.message });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Category_Name, Description } = req.body;

    if (!Category_Name || !Category_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Category Name is required.' });
    }

    const [existing] = await db.query('SELECT Category_ID FROM Category WHERE Category_ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Category with ID ${id} not found.` });
    }

    // Check duplicate name on another category
    const [duplicate] = await db.query(
      'SELECT Category_ID FROM Category WHERE LOWER(Category_Name) = LOWER(?) AND Category_ID != ?',
      [Category_Name.trim(), id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({ success: false, message: `Another category named '${Category_Name}' already exists.` });
    }

    await db.query(
      'UPDATE Category SET Category_Name = ?, Description = ? WHERE Category_ID = ?',
      [Category_Name.trim(), Description ? Description.trim() : null, id]
    );

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: { Category_ID: Number(id), Category_Name: Category_Name.trim(), Description }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating category', error: error.message });
  }
});

// DELETE category (Protected via Referential Integrity Check)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const [category] = await db.query('SELECT * FROM Category WHERE Category_ID = ?', [id]);
    if (category.length === 0) {
      return res.status(404).json({ success: false, message: `Category with ID ${id} not found.` });
    }

    // Check for child products
    const [products] = await db.query('SELECT Product_ID, Product_Name FROM Product WHERE Category_ID = ?', [id]);
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${products.length} products currently belong to it (e.g., "${products[0].Product_Name}"). Please delete or reassign them first.`
      });
    }

    await db.query('DELETE FROM Category WHERE Category_ID = ?', [id]);
    res.json({ success: true, message: `Category "${category[0].Category_Name}" deleted successfully.` });
  } catch (error) {
    // If foreign key constraint is triggered directly by MySQL
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category because it is referenced by existing products.'
      });
    }
    res.status(500).json({ success: false, message: 'Error deleting category', error: error.message });
  }
});

module.exports = router;
