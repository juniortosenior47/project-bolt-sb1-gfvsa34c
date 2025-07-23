const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Axios errors (from product service calls)
  if (err.response) {
    const status = err.response.status;
    const message = err.response.data?.errors?.[0]?.detail || 'External service error';
    
    return res.status(status === 404 ? 404 : 502).json({
      errors: [{
        status: status.toString(),
        title: status === 404 ? 'Resource Not Found' : 'External Service Error',
        detail: message
      }]
    });
  }

  // Network errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      errors: [{
        status: '503',
        title: 'Service Unavailable',
        detail: 'External service is temporarily unavailable. Please try again later.'
      }]
    });
  }

  // SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({
      errors: [{
        status: '409',
        title: 'Conflict',
        detail: 'Data constraint violation. This resource may already exist.'
      }]
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      errors: [{
        status: '400',
        title: 'Validation Error',
        detail: err.message
      }]
    });
  }

  // Default error
  res.status(500).json({
    errors: [{
      status: '500',
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred. Please try again later.'
    }]
  });
}

module.exports = errorHandler;