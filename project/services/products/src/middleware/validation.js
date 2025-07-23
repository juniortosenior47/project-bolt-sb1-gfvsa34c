const logger = require('../utils/logger');

function validateRequest(source, schema) {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        status: '400',
        title: 'Validation Error',
        detail: detail.message,
        source: {
          pointer: detail.path.join('.')
        }
      }));
      
      logger.warn('Validation failed', { errors, data });
      
      return res.status(400).json({ errors });
    }
    
    // Update request with validated/default values
    req[source] = value;
    next();
  };
}

module.exports = { validateRequest };