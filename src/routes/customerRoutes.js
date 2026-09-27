// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Customer Routes & CRUD Operations
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all customers (with order count and total spend)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT cu.Customer_ID,
             cu.Customer_Name,
             cu.Phone,
             cu.Email,
             cu.Address,
             COUNT(sa.Sale_ID) AS Total_Sales,
             COALESCE(SUM(sa.Total_Amount), 0.00) AS Total_Spent
      FROM Customer cu
      LEFT JOIN Sale sa ON cu.Customer_ID = sa.Customer_ID
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (cu.Customer_Name LIKE ? OR cu.Phone LIKE ? OR cu.Email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' GROUP BY cu.Customer_ID, cu.Customer_Name, cu.Phone, cu.Email, cu.Address ORDER BY cu.Customer_ID ASC';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching customers', error: error.message });
  }
});

// GET single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM Customer WHERE Customer_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Customer with ID ${id} not found.` });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching customer', error: error.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const { Customer_Name, Phone, Email, Address } = req.body;

    if (!Customer_Name || !Customer_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer Name is required.' });
    }
    if (!Phone || !Phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const [result] = await db.query(
      'INSERT INTO Customer (Customer_Name, Phone, Email, Address) VALUES (?, ?, ?, ?)',
      [Customer_Name.trim(), Phone.trim(), Email ? Email.trim() : null, Address ? Address.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: {
        Customer_ID: result.insertId,
        Customer_Name: Customer_Name.trim(),
        Phone: Phone.trim(),
        Email: Email ? Email.trim() : null,
        Address: Address ? Address.trim() : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating customer', error: error.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Customer_Name, Phone, Email, Address } = req.body;

    if (!Customer_Name || !Customer_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer Name is required.' });
    }
    if (!Phone || !Phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const [existing] = await db.query('SELECT Customer_ID FROM Customer WHERE Customer_ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Customer with ID ${id} not found.` });
    }

    await db.query(
      'UPDATE Customer SET Customer_Name = ?, Phone = ?, Email = ?, Address = ? WHERE Customer_ID = ?',
      [Customer_Name.trim(), Phone.trim(), Email ? Email.trim() : null, Address ? Address.trim() : null, id]
    );

    res.json({
      success: true,
      message: 'Customer updated successfully.',
      data: {
        Customer_ID: Number(id),
        Customer_Name: Customer_Name.trim(),
        Phone: Phone.trim(),
        Email: Email ? Email.trim() : null,
        Address: Address ? Address.trim() : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating customer', error: error.message });
  }
});

// DELETE customer (Protected)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [customer] = await db.query('SELECT Customer_Name FROM Customer WHERE Customer_ID = ?', [id]);
    if (customer.length === 0) {
      return res.status(404).json({ success: false, message: `Customer with ID ${id} not found.` });
    }

    // Check if customer has sales
    const [sales] = await db.query('SELECT Sale_ID FROM Sale WHERE Customer_ID = ? LIMIT 1', [id]);
    if (sales.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer "${customer[0].Customer_Name}" because historical sales invoices reference them.`
      });
    }

    await db.query('DELETE FROM Customer WHERE Customer_ID = ?', [id]);
    res.json({ success: true, message: `Customer "${customer[0].Customer_Name}" deleted successfully.` });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer because it is referenced in sales invoices.'
      });
    }
    res.status(500).json({ success: false, message: 'Error deleting customer', error: error.message });
  }
});

module.exports = router;
