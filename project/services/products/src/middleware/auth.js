const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    logger.warn('Missing API key in request', { ip: req.ip });
    return res.status(401).json({
      errors: [{
        status: '401',
        title: 'Unauthorized',
        detail: 'API key is required. Please provide X-API-Key header.'
      }]
    });
  }
  
  const expectedApiKey = process.env.API_KEY;
  if (!expectedApiKey) {
    logger.error('API_KEY environment variable not set');
    return res.status(500).json({
      errors: [{
        status: '500',
        title: 'Internal Server Error',
        detail: 'Server configuration error.'
      }]
    });
  }
  
  if (apiKey !== expectedApiKey) {
    logger.warn('Invalid API key provided', { ip: req.ip });
    return res.status(401).json({
      errors: [{
        status: '401',
        title: 'Unauthorized',
        detail: 'Invalid API key.'
      }]
    });
  }
  
  next();
}

module.exports = authMiddleware;