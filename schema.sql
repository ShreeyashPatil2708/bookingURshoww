-- schema.sql - Database schema for the Ticket Booking System
-- Run this script once to set up the MySQL database

CREATE DATABASE IF NOT EXISTS ticket_booking;
USE ticket_booking;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id    INT          NOT NULL AUTO_INCREMENT,
  name  VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id               INT          NOT NULL AUTO_INCREMENT,
  name             VARCHAR(200) NOT NULL,
  total_seats      INT          NOT NULL,
  available_seats  INT          NOT NULL,
  PRIMARY KEY (id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id           INT       NOT NULL AUTO_INCREMENT,
  user_id      INT       NOT NULL,
  event_id     INT       NOT NULL,
  seats_booked INT       NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
