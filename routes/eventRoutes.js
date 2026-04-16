// routes/eventRoutes.js - Event-related API routes
const express = require('express');
const router = express.Router();
const { createEvent, getEvents } = require('../controllers/eventController');

router.post('/create-event', createEvent);
router.get('/events', getEvents);

module.exports = router;
