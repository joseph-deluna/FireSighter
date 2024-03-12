// routes/authRoutes.js

const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simple check for username and password
  if (username === "admin" && password === "admin") {
    // Successfully authenticated
    const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    // Authentication failed
    res.status(401).json({ message: 'Authentication failed' });
  }
});

module.exports = router;
