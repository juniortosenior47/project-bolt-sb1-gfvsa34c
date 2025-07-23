const express = require('express');
const { getDatabase } = require('../models/database');

const router = express.Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'products-service',
    version: '1.0.0'
  };

  try {
    // Check database connection
    const db = getDatabase();
    await new Promise((resolve, reject) => {
      db.get('SELECT 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    health.database = 'connected';
    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.database = 'disconnected';
    health.error = error.message;
    res.status(503).json(health);
  }
});

module.exports = router;