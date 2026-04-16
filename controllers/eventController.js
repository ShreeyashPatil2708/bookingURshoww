// controllers/eventController.js - Handles event creation and listing
const pool = require('../db');

// POST /create-event - Create a new event with seat capacity
const createEvent = async (req, res) => {
  const { name, total_seats } = req.body;

  if (!name || total_seats == null) {
    return res.status(400).json({ error: 'name and total_seats are required' });
  }

  if (!Number.isInteger(total_seats) || total_seats <= 0) {
    return res.status(400).json({ error: 'total_seats must be a positive integer' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO events (name, total_seats, available_seats) VALUES (?, ?, ?)',
      [name, total_seats, total_seats]
    );
    res.status(201).json({ message: 'Event created', eventId: result.insertId });
  } catch (err) {
    console.error('createEvent error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /events - List all events
const getEvents = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events');
    res.json(rows);
  } catch (err) {
    console.error('getEvents error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createEvent, getEvents };
