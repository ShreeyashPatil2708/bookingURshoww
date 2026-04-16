# bookingURshoww

Scalable Ticket Booking System with Smart Queue Management — Node.js + Express + MySQL.

## Features

- Concurrency-safe seat booking using MySQL transactions (`SELECT ... FOR UPDATE`)
- Virtual FIFO queue with a configurable max-active-users limit (BookMyShow-style)
- 2-minute booking session timeout per active user
- Per-user rate limiting (5 attempts / minute)
- Clean MVC project structure (routes / controllers / db)

## Project Structure

```
├── server.js               # Express app entry point
├── db.js                   # MySQL connection pool
├── schema.sql              # Database schema
├── routes/
│   ├── userRoutes.js
│   ├── eventRoutes.js
│   ├── bookingRoutes.js
│   └── queueRoutes.js
└── controllers/
    ├── userController.js
    ├── eventController.js
    ├── bookingController.js
    └── queueController.js
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

Start MySQL and run:

```bash
mysql -u root -p < schema.sql
```

### 3. Configure environment variables (optional)

Create a `.env` file (or export variables):

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=ticket_booking
PORT=3000
```

### 4. Start the server

```bash
npm start
# or for hot-reload during development:
npm run dev
```

---

## API Reference

### Users

| Method | Endpoint    | Body                        | Description       |
|--------|-------------|-----------------------------|-------------------|
| POST   | /register   | `{ name, email }`           | Register a user   |
| GET    | /users      | —                           | List all users    |

### Events

| Method | Endpoint       | Body                          | Description       |
|--------|----------------|-------------------------------|-------------------|
| POST   | /create-event  | `{ name, total_seats }`       | Create an event   |
| GET    | /events        | —                             | List all events   |

### Booking

| Method | Endpoint | Body                       | Description                          |
|--------|----------|----------------------------|--------------------------------------|
| POST   | /book    | `{ user_id, event_id }`   | Book a seat (transaction-safe)       |

### Queue Management

| Method | Endpoint       | Body           | Description                               |
|--------|----------------|----------------|-------------------------------------------|
| POST   | /enter-queue   | `{ user_id }` | Join the booking queue                    |
| POST   | /exit-queue    | `{ user_id }` | Leave the queue / release your slot       |
| GET    | /queue-status  | —              | View current queue state (debug/monitor)  |

---

## Booking Flow

1. **Enter queue** → `POST /enter-queue` with `user_id`
   - Returns `ACTIVE` (proceed to book) or `WAITING` (wait your turn)
2. **Book seat** → `POST /book` with `user_id` + `event_id` *(only when ACTIVE)*
3. **Exit queue** → `POST /exit-queue` when done (promotes the next waiting user)
