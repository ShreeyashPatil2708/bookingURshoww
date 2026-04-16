const page = document.body.dataset.page;
const logEl = document.getElementById('log');
const BASE_URL = window.BASE_URL;

const log = (title, payload) => {
  if (!logEl) return;
  logEl.textContent = `${title}\n${JSON.stringify(payload, null, 2)}`;
};

const request = async (url, options = {}) => {
  const hasBody = options.body !== undefined;

  const config = {
    method: options.method || (hasBody ? 'POST' : 'GET'),
    headers: {
      ...(hasBody && { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${url}`, config);

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: 'Invalid JSON response' };
  }

  if (!response.ok) throw { status: response.status, data };

  return data;
};

const renderTextList = (el, entries, fallback) => {
  if (!el) return;
  el.replaceChildren();
  if (!entries.length) {
    const item = document.createElement('li');
    item.textContent = fallback;
    el.appendChild(item);
    return;
  }
  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = entry;
    el.appendChild(li);
  });
};

const renderEvents = (events, targetId = 'events-list') => {
  const el = document.getElementById(targetId);
  const entries = events.map(
    (event) => `#${event.id} — ${event.name} (${event.available_seats}/${event.total_seats} seats left)`
  );
  renderTextList(el, entries, 'No events yet.');
};

const renderUsers = (users, targetId = 'users-list') => {
  const el = document.getElementById(targetId);
  const entries = users.map((user) => `#${user.id} — ${user.name} (${user.email})`);
  renderTextList(el, entries, 'No users yet.');
};

const refreshQueueStatus = async (targetId = 'queue-status') => {
  const queueEl = document.getElementById(targetId);
  if (!queueEl) return null;
  try {
    const status = await request('/queue-status');
    queueEl.textContent = JSON.stringify(status, null, 2);
    return status;
  } catch (err) {
    queueEl.textContent = JSON.stringify(err, null, 2);
    log('Failed to fetch queue status', err);
    return null;
  }
};

const getWaitingUsers = (queueStatus) => {
  if (Array.isArray(queueStatus?.waitingUsers)) return queueStatus.waitingUsers;
  if (Array.isArray(queueStatus?.waitingQueue)) return queueStatus.waitingQueue;
  return [];
};

const initUsersPage = () => {
  const form = document.getElementById('register-form');
  const refreshBtn = document.getElementById('refresh-users');

  const refreshUsers = async () => {
    try {
      const users = await request('/users');
      renderUsers(users);
    } catch (err) {
      log('Failed to fetch users', err);
    }
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    try {
      const data = await request('/register', { method: 'POST', body: JSON.stringify({ name, email }) });
      log('User registration success', data);
      e.target.reset();
      await refreshUsers();
    } catch (err) {
      log('User registration failed', err);
    }
  });

  refreshBtn?.addEventListener('click', refreshUsers);
  refreshUsers();
};

const initEventsPage = () => {
  const form = document.getElementById('event-form');
  const refreshBtn = document.getElementById('refresh-events');

  const refreshEvents = async () => {
    try {
      const events = await request('/events');
      renderEvents(events);
    } catch (err) {
      log('Failed to fetch events', err);
    }
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('event-name').value.trim();
    const total_seats = Number(document.getElementById('event-seats').value);
    try {
      const data = await request('/create-event', { method: 'POST', body: JSON.stringify({ name, total_seats }) });
      log('Event creation success', data);
      e.target.reset();
      await refreshEvents();
    } catch (err) {
      log('Event creation failed', err);
    }
  });

  refreshBtn?.addEventListener('click', refreshEvents);
  refreshEvents();
};

const initQueuePage = () => {
  const enterForm = document.getElementById('enter-queue-form');
  const exitForm = document.getElementById('exit-queue-form');
  const statusBtn = document.getElementById('queue-status-btn');

  enterForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_id = Number(document.getElementById('enter-user-id').value);
    try {
      const data = await request('/enter-queue', { method: 'POST', body: JSON.stringify({ user_id }) });
      log('Enter queue success', data);
      e.target.reset();
      await refreshQueueStatus();
    } catch (err) {
      log('Enter queue failed', err);
    }
  });

  exitForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_id = Number(document.getElementById('exit-user-id').value);
    try {
      const data = await request('/exit-queue', { method: 'POST', body: JSON.stringify({ user_id }) });
      log('Exit queue success', data);
      e.target.reset();
      await refreshQueueStatus();
    } catch (err) {
      log('Exit queue failed', err);
    }
  });

  statusBtn?.addEventListener('click', () => refreshQueueStatus());
  refreshQueueStatus();
};

const initBookingPage = () => {
  const form = document.getElementById('book-form');
  const userIdInput = document.getElementById('book-user-id');
  const refreshEventsBtn = document.getElementById('refresh-events');
  const queueBtn = document.getElementById('queue-status-btn');
  const queueInsightEl = document.getElementById('booking-queue-insight');
  let latestQueueStatus = null;

  const renderQueueInsight = () => {
    if (!queueInsightEl) return;
    const userId = Number(userIdInput?.value);
    if (!userId || !latestQueueStatus) {
      queueInsightEl.textContent = 'Enter your User ID and refresh queue to see people behind you.';
      return;
    }

    const waitingUsers = getWaitingUsers(latestQueueStatus).map((id) => Number(id));
    const activeUsers = Array.isArray(latestQueueStatus.activeUserList) ? latestQueueStatus.activeUserList : [];
    const waitingIndex = waitingUsers.indexOf(userId);

    if (waitingIndex !== -1) {
      const peopleAfterYou = waitingUsers.length - waitingIndex - 1;
      queueInsightEl.textContent = `${peopleAfterYou} people are in queue after you.`;
      return;
    }

    if (activeUsers.map((id) => Number(id)).includes(userId)) {
      queueInsightEl.textContent = `${waitingUsers.length} people are currently in queue after you.`;
      return;
    }

    queueInsightEl.textContent = 'You are not currently in queue.';
  };

  const refreshBookingQueueStatus = async () => {
    latestQueueStatus = await refreshQueueStatus();
    renderQueueInsight();
  };

  const refreshEvents = async () => {
    try {
      const events = await request('/events');
      renderEvents(events);
    } catch (err) {
      log('Failed to fetch events', err);
    }
  };

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_id = Number(document.getElementById('book-user-id').value);
    const event_id = Number(document.getElementById('book-event-id').value);
    try {
      const data = await request('/book', { method: 'POST', body: JSON.stringify({ user_id, event_id }) });
      log('Booking response', data);
      e.target.reset();
      await refreshEvents();
      await refreshBookingQueueStatus();
    } catch (err) {
      log('Booking failed', err);
    }
  });

  refreshEventsBtn?.addEventListener('click', refreshEvents);
  queueBtn?.addEventListener('click', refreshBookingQueueStatus);
  userIdInput?.addEventListener('input', renderQueueInsight);

  refreshEvents();
  refreshBookingQueueStatus();
};

const initDashboardPage = () => {
  const usersCountEl = document.getElementById('users-count');
  const eventsCountEl = document.getElementById('events-count');
  const seatsEl = document.getElementById('available-seats');
  const waitingEl = document.getElementById('queue-waiting');
  const refreshBtn = document.getElementById('refresh-dashboard');

  const refreshDashboard = async () => {
    try {
      const [users, events, queue] = await Promise.all([request('/users'), request('/events'), request('/queue-status')]);
      renderUsers(users.slice(-5).reverse(), 'dashboard-users');
      renderEvents(events.slice(-5).reverse(), 'dashboard-events');
      usersCountEl.textContent = users.length;
      eventsCountEl.textContent = events.length;
      seatsEl.textContent = events.reduce((sum, event) => sum + Number(event.available_seats || 0), 0);
      waitingEl.textContent = getWaitingUsers(queue).length;
      log('Dashboard refreshed', { users: users.length, events: events.length });
    } catch (err) {
      log('Dashboard refresh failed', err);
    }
  };

  refreshBtn?.addEventListener('click', refreshDashboard);
  refreshDashboard();
};

window.addEventListener('DOMContentLoaded', () => {
  if (page === 'users') initUsersPage();
  if (page === 'events') initEventsPage();
  if (page === 'queue') initQueuePage();
  if (page === 'booking') initBookingPage();
  if (page === 'dashboard') initDashboardPage();
});
