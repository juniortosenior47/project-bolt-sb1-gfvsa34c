const express = require('express');
const { getDatabase } = require('../models/database');
const { getProductInfo } = require('../services/productService');

const router = express.Router();

router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'inventory-service',
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

    // Check products service connectivity (optional)
    try {
      await getProductInfo('test-id');
    } catch (error) {
      if (error.response?.status === 404) {
        health.products_service = 'connected';
      } else if (error.code === 'ECONNREFUSED') {
        health.products_service = 'disconnected';
        health.status = 'degraded';
      } else {
        health.products_service = 'error';
      }
    }
    
    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.database = 'disconnected';
    health.error = error.message;
    res.status(503).json(health);
  }
});

module.exports = router;