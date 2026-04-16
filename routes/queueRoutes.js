// routes/queueRoutes.js - Smart queue API routes
const express = require('express');
const router = express.Router();
const { enterQueue, exitQueue, getQueueStatus } = require('../controllers/queueController');

router.post('/enter-queue', enterQueue);
router.post('/exit-queue', exitQueue);
router.get('/queue-status', getQueueStatus);

module.exports = router;
