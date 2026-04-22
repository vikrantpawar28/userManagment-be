require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

const path = require('path');

const app = express();
connectDB();

app.use(express.json());
app.use(cookieParser());

// Request Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 30 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}));

app.use(cors({
  origin: true, // Allow all origins for testing
  credentials: true
}));

app.use('/api/auth', require('./user/userRoutes'));
app.use('/api/wallet', require('./wallet/walletRoutes'));
app.use('/api/users', require('./user/userRoutes'));

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState }));


app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);

// module.exports = app;