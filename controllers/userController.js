// controllers/userController.js - Handles user registration and listing
const pool = require('../db');

// POST /register - Create a new user
const registerUser = async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    res.status(201).json({ message: 'User registered', userId: result.insertId });
  } catch (err) {
    // Handle duplicate email constraint violation
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('registerUser error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /users - List all users
const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error('getUsers error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { registerUser, getUsers };
