const logEl = document.getElementById('log');
const usersListEl = document.getElementById('users-list');
const eventsListEl = document.getElementById('events-list');
const queueStatusEl = document.getElementById('queue-status');

const log = (title, payload) => {
  logEl.textContent = `${title}\n${JSON.stringify(payload, null, 2)}`;
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { error: 'Invalid JSON response' };
  }

  if (!response.ok) {
    throw { status: response.status, data };
  }
  return data;
};

const renderUsers = (users) => {
  usersListEl.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.textContent = `#${user.id} — ${user.name} (${user.email})`;
    usersListEl.appendChild(li);
  });
  if (users.length === 0) usersListEl.innerHTML = '<li>No users yet.</li>';
};

const renderEvents = (events) => {
  eventsListEl.innerHTML = '';
  events.forEach((event) => {
    const li = document.createElement('li');
    li.textContent = `#${event.id} — ${event.name} (${event.available_seats}/${event.total_seats} seats left)`;
    eventsListEl.appendChild(li);
  });
  if (events.length === 0) eventsListEl.innerHTML = '<li>No events yet.</li>';
};

const refreshUsers = async () => {
  try {
    const users = await request('/users');
    renderUsers(users);
  } catch (err) {
    log('Failed to fetch users', err);
  }
};

const refreshEvents = async () => {
  try {
    const events = await request('/events');
    renderEvents(events);
  } catch (err) {
    log('Failed to fetch events', err);
  }
};

const refreshQueueStatus = async () => {
  try {
    const status = await request('/queue-status');
    queueStatusEl.textContent = JSON.stringify(status, null, 2);
  } catch (err) {
    queueStatusEl.textContent = JSON.stringify(err, null, 2);
    log('Failed to fetch queue status', err);
  }
};

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();

  try {
    const data = await request('/register', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
    log('User registration success', data);
    e.target.reset();
    await refreshUsers();
  } catch (err) {
    log('User registration failed', err);
  }
});

document.getElementById('event-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('event-name').value.trim();
  const total_seats = Number(document.getElementById('event-seats').value);

  try {
    const data = await request('/create-event', {
      method: 'POST',
      body: JSON.stringify({ name, total_seats }),
    });
    log('Event creation success', data);
    e.target.reset();
    await refreshEvents();
  } catch (err) {
    log('Event creation failed', err);
  }
});

document.getElementById('enter-queue-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user_id = Number(document.getElementById('enter-user-id').value);

  try {
    const data = await request('/enter-queue', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
    log('Enter queue success', data);
    e.target.reset();
    await refreshQueueStatus();
  } catch (err) {
    log('Enter queue failed', err);
  }
});

document.getElementById('exit-queue-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user_id = Number(document.getElementById('exit-user-id').value);

  try {
    const data = await request('/exit-queue', {
      method: 'POST',
      body: JSON.stringify({ user_id }),
    });
    log('Exit queue success', data);
    e.target.reset();
    await refreshQueueStatus();
  } catch (err) {
    log('Exit queue failed', err);
  }
});

document.getElementById('book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user_id = Number(document.getElementById('book-user-id').value);
  const event_id = Number(document.getElementById('book-event-id').value);

  try {
    const data = await request('/book', {
      method: 'POST',
      body: JSON.stringify({ user_id, event_id }),
    });
    log('Booking response', data);
    await refreshEvents();
    await refreshQueueStatus();
  } catch (err) {
    log('Booking failed', err);
  }
});

document.getElementById('queue-status-btn').addEventListener('click', refreshQueueStatus);
document.getElementById('refresh-users').addEventListener('click', refreshUsers);
document.getElementById('refresh-events').addEventListener('click', refreshEvents);

window.addEventListener('DOMContentLoaded', async () => {
  await refreshUsers();
  await refreshEvents();
  await refreshQueueStatus();
});
