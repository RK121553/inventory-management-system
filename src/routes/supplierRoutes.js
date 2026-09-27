// ============================================================================
// Academic DBMS Project: INVENTORY MANAGEMENT
// Supplier Routes & CRUD Operations
// ============================================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET all suppliers (with order count and total purchase value)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT s.Supplier_ID,
             s.Supplier_Name,
             s.Phone,
             s.Email,
             s.Address,
             COUNT(pu.Purchase_ID) AS Total_Purchases,
             COALESCE(SUM(pu.Total_Amount), 0.00) AS Total_Supplied_Amount
      FROM Supplier s
      LEFT JOIN Purchase pu ON s.Supplier_ID = pu.Supplier_ID
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (s.Supplier_Name LIKE ? OR s.Phone LIKE ? OR s.Email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' GROUP BY s.Supplier_ID, s.Supplier_Name, s.Phone, s.Email, s.Address ORDER BY s.Supplier_ID ASC';

    const [rows] = await db.query(sql, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database error fetching suppliers', error: error.message });
  }
});

// GET single supplier by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM Supplier WHERE Supplier_ID = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Supplier with ID ${id} not found.` });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching supplier', error: error.message });
  }
});

// POST create supplier
router.post('/', async (req, res) => {
  try {
    const { Supplier_Name, Phone, Email, Address } = req.body;

    if (!Supplier_Name || !Supplier_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier Name is required.' });
    }
    if (!Phone || !Phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const [result] = await db.query(
      'INSERT INTO Supplier (Supplier_Name, Phone, Email, Address) VALUES (?, ?, ?, ?)',
      [Supplier_Name.trim(), Phone.trim(), Email ? Email.trim() : null, Address ? Address.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      data: {
        Supplier_ID: result.insertId,
        Supplier_Name: Supplier_Name.trim(),
        Phone: Phone.trim(),
        Email: Email ? Email.trim() : null,
        Address: Address ? Address.trim() : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating supplier', error: error.message });
  }
});

// PUT update supplier
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Supplier_Name, Phone, Email, Address } = req.body;

    if (!Supplier_Name || !Supplier_Name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier Name is required.' });
    }
    if (!Phone || !Phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const [existing] = await db.query('SELECT Supplier_ID FROM Supplier WHERE Supplier_ID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Supplier with ID ${id} not found.` });
    }

    await db.query(
      'UPDATE Supplier SET Supplier_Name = ?, Phone = ?, Email = ?, Address = ? WHERE Supplier_ID = ?',
      [Supplier_Name.trim(), Phone.trim(), Email ? Email.trim() : null, Address ? Address.trim() : null, id]
    );

    res.json({
      success: true,
      message: 'Supplier updated successfully.',
      data: {
        Supplier_ID: Number(id),
        Supplier_Name: Supplier_Name.trim(),
        Phone: Phone.trim(),
        Email: Email ? Email.trim() : null,
        Address: Address ? Address.trim() : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating supplier', error: error.message });
  }
});

// DELETE supplier (Protected)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [supplier] = await db.query('SELECT Supplier_Name FROM Supplier WHERE Supplier_ID = ?', [id]);
    if (supplier.length === 0) {
      return res.status(404).json({ success: false, message: `Supplier with ID ${id} not found.` });
    }

    // Check if supplier has purchases
    const [purchases] = await db.query('SELECT Purchase_ID FROM Purchase WHERE Supplier_ID = ? LIMIT 1', [id]);
    if (purchases.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier "${supplier[0].Supplier_Name}" because historical purchase orders reference them.`
      });
    }

    await db.query('DELETE FROM Supplier WHERE Supplier_ID = ?', [id]);
    res.json({ success: true, message: `Supplier "${supplier[0].Supplier_Name}" deleted successfully.` });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier because it is referenced in purchase orders.'
      });
    }
    res.status(500).json({ success: false, message: 'Error deleting supplier', error: error.message });
  }
});

module.exports = router;
