// server.js - Main entry point for the Ticket Booking System
require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const queueRoutes = require('./routes/queueRoutes');

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global IP-based rate limiter: max 60 requests per minute per IP
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
  })
);

// Mount route groups
app.use('/', userRoutes);
app.use('/', eventRoutes);
app.use('/', bookingRoutes);
app.use('/', queueRoutes);

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ticket Booking Server running on port ${PORT}`);
});

module.exports = app;
