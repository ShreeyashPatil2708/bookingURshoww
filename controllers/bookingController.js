// controllers/bookingController.js - Handles ticket booking with transaction safety
const pool = require('../db');

// Booking session timeout in milliseconds (2 minutes)
const BOOKING_TIMEOUT_MS = 2 * 60 * 1000;

// In-memory store for active booking sessions { userId: timestamp }
const bookingSessions = {};

// Rate limiting: track recent booking attempts per user { userId: [timestamps] }
const rateLimitMap = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX = 5; // max 5 booking attempts per minute per user

/**
 * Check if a user has exceeded the rate limit.
 * Returns true if rate limited, false otherwise.
 */
const isRateLimited = (userId) => {
  const now = Date.now();
  if (!rateLimitMap[userId]) {
    rateLimitMap[userId] = [];
  }
  // Remove timestamps outside the current window
  rateLimitMap[userId] = rateLimitMap[userId].filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (rateLimitMap[userId].length >= RATE_LIMIT_MAX) {
    return true;
  }
  rateLimitMap[userId].push(now);
  return false;
};

/**
 * POST /book
 * Books a seat for a user in an event using a MySQL transaction with
 * SELECT ... FOR UPDATE to prevent race conditions.
 *
 * Request body: { user_id, event_id }
 */
const bookTicket = async (req, res) => {
  const { user_id, event_id } = req.body;

  if (!user_id || !event_id) {
    return res.status(400).json({ error: 'user_id and event_id are required' });
  }

  // --- Queue session check ---
  // Users must have entered the queue (via POST /enter-queue) before booking
  if (!bookingSessions[user_id]) {
    return res.status(403).json({
      error: 'No active booking session. Please call POST /enter-queue first.',
    });
  }

  // --- Booking session timeout check ---
  const elapsed = Date.now() - bookingSessions[user_id];
  if (elapsed > BOOKING_TIMEOUT_MS) {
    delete bookingSessions[user_id];
    return res.status(403).json({
      error: 'Booking session expired. Please re-enter the queue.',
    });
  }

  // --- Rate limiting check ---
  if (isRateLimited(user_id)) {
    return res.status(429).json({ error: 'Too many booking attempts. Please wait.' });
  }

  // Acquire a dedicated connection for the transaction (after all validation passes)
  let conn;
  try {
    conn = await pool.getConnection();

    // BEGIN TRANSACTION
    await conn.beginTransaction();

    // Lock the event row to prevent concurrent seat updates (SELECT ... FOR UPDATE)
    const [rows] = await conn.query(
      'SELECT available_seats FROM events WHERE id = ? FOR UPDATE',
      [event_id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Event not found' });
    }

    const { available_seats } = rows[0];

    if (available_seats > 0) {
      // Decrement available seats
      await conn.query(
        'UPDATE events SET available_seats = available_seats - 1 WHERE id = ?',
        [event_id]
      );

      // Record the booking
      await conn.query(
        'INSERT INTO bookings (user_id, event_id, seats_booked) VALUES (?, ?, 1)',
        [user_id, event_id]
      );

      // COMMIT TRANSACTION
      await conn.commit();
      conn.release();

      // Clear the booking session after a successful booking
      delete bookingSessions[user_id];

      console.log(`Booking confirmed: user ${user_id} booked a seat for event ${event_id}`);
      return res.status(201).json({ message: 'Booking Confirmed' });
    } else {
      // No seats available — rollback and inform the client
      await conn.rollback();
      conn.release();

      console.log(`Booking failed (sold out): user ${user_id}, event ${event_id}`);
      return res.status(200).json({ message: 'Sold Out' });
    }
  } catch (err) {
    // Rollback on any unexpected error
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    console.error('bookTicket error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Registers a booking session for a user (called after entering the queue).
 * Used by the queue controller to start the 2-minute session timer.
 */
const startBookingSession = (userId) => {
  bookingSessions[userId] = Date.now();
  console.log(`Booking session started for user ${userId}. Expires in 2 minutes.`);

  // Automatically expire the session after the timeout
  setTimeout(() => {
    if (bookingSessions[userId]) {
      delete bookingSessions[userId];
      console.log(`Booking session expired for user ${userId}`);
    }
  }, BOOKING_TIMEOUT_MS);
};

module.exports = { bookTicket, startBookingSession };
