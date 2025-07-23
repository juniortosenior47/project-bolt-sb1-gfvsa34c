const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

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