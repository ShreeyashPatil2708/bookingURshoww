// controllers/queueController.js - In-memory smart queue management
const { startBookingSession } = require('./bookingController');

// In-memory queue state
let queue = [];                // Waiting list of user_ids (FIFO)
let activeUsers = new Set();   // Users currently allowed to book
const MAX_ACTIVE_USERS = 5;    // Maximum concurrent active booking users

/**
 * POST /enter-queue
 * Adds a user to the virtual booking queue.
 *
 * - If there is capacity, the user is immediately allowed to book (ACTIVE).
 * - Otherwise, the user is placed in the waiting queue (WAITING).
 *
 * Request body: { user_id }
 */
const enterQueue = (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Prevent a user from joining the queue twice
  if (activeUsers.has(user_id) || queue.includes(user_id)) {
    return res.status(409).json({ error: 'User is already in the queue or active.' });
  }

  if (activeUsers.size < MAX_ACTIVE_USERS) {
    // Slot available — allow the user to book immediately
    activeUsers.add(user_id);
    console.log(`User ${user_id} allowed to book. Active users: ${activeUsers.size}/${MAX_ACTIVE_USERS}`);

    // Start the 2-minute booking session timer for this user
    startBookingSession(user_id);

    return res.json({
      message: 'Allowed to book',
      status: 'ACTIVE',
    });
  } else {
    // No slot available — add to the waiting queue
    queue.push(user_id);
    const position = queue.length;
    console.log(`User ${user_id} added to queue at position ${position}. Queue length: ${queue.length}`);

    return res.json({
      message: 'In Queue',
      position,
      status: 'WAITING',
    });
  }
};

/**
 * POST /exit-queue
 * Called when an active user finishes (or abandons) their booking session.
 *
 * - Validates that the calling user was actually active.
 * - Decrements activeUsers and removes them from the active set.
 * - If there are users waiting in the queue, promotes the next one (FIFO).
 *
 * Request body: { user_id }
 */
const exitQueue = (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  // Only active users should be able to call exit
  if (!activeUsers.has(user_id)) {
    return res.status(400).json({ error: 'User is not currently active in the booking queue.' });
  }

  activeUsers.delete(user_id);

  console.log(`User ${user_id} exited. Active users: ${activeUsers.size}/${MAX_ACTIVE_USERS}`);

  if (queue.length > 0) {
    // Promote the next user from the waiting queue (FIFO removal)
    const nextUser = queue.shift();
    activeUsers.add(nextUser);

    // Start the booking session timer for the newly promoted user
    startBookingSession(nextUser);

    console.log(`Next user allowed: ${nextUser}. Active users: ${activeUsers.size}/${MAX_ACTIVE_USERS}`);

    return res.json({
      message: 'Exit successful. Next user promoted.',
      nextUser,
      activeUsers: activeUsers.size,
      queueLength: queue.length,
    });
  }

  return res.json({
    message: 'Exit successful.',
    activeUsers: activeUsers.size,
    queueLength: queue.length,
  });
};

/**
 * GET /queue-status
 * Returns the current queue state (useful for debugging/monitoring).
 */
const getQueueStatus = (req, res) => {
  res.json({
    activeUsers: activeUsers.size,
    maxActiveUsers: MAX_ACTIVE_USERS,
    queueLength: queue.length,
    activeUserList: Array.from(activeUsers),
    waitingUsers: queue,
    waitingQueue: queue,
  });
};

module.exports = { enterQueue, exitQueue, getQueueStatus };
