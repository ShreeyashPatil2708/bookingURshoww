// db.js - MySQL database connection using mysql2 (promise-based)
const mysql = require('mysql2/promise');

// Create a connection pool for efficient connection reuse
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ticket_booking',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
