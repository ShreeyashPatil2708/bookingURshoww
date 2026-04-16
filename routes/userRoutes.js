// routes/userRoutes.js - User-related API routes
const express = require('express');
const router = express.Router();
const { registerUser, getUsers } = require('../controllers/userController');

router.post('/register', registerUser);
router.get('/users', getUsers);

module.exports = router;
