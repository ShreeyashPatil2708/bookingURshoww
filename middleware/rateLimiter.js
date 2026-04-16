// middleware/rateLimiter.js - Simple in-memory rate limiter middleware
// Limits requests per IP address to prevent abuse on all API routes.

const requestCounts = {}; // { ip: [timestamps] }
const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 60;     // max 60 requests per minute per IP

/**
 * Express middleware that rate-limits by remote IP address.
 * Returns HTTP 429 when the limit is exceeded.
 */
const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  if (!requestCounts[ip]) {
    requestCounts[ip] = [];
  }

  // Slide the window: remove timestamps older than WINDOW_MS
  requestCounts[ip] = requestCounts[ip].filter((ts) => now - ts < WINDOW_MS);

  if (requestCounts[ip].length >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  requestCounts[ip].push(now);
  next();
};

module.exports = rateLimiter;
