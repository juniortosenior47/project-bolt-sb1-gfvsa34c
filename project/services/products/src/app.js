const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const logger = require('./utils/logger');
const { initializeDatabase } = require('./models/database');
const productsRoutes = require('./routes/products');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    errors: [{
      status: '429',
      title: 'Too Many Requests',
      detail: 'Rate limit exceeded. Please try again later.'
    }]
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// API Documentation
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check route (no auth required)
app.use('/health', healthRoutes);

// API routes with authentication
app.use('/api/products', authMiddleware, productsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    data: {
      type: 'service-info',
      id: 'products-service',
      attributes: {
        name: 'Products Service',
        version: '1.0.0',
        description: 'Microservice for managing products',
        endpoints: [
          'GET /health - Health check',
          'GET /api-docs - API documentation',
          'GET /api/products - List all products',
          'POST /api/products - Create a product',
          'GET /api/products/:id - Get product by ID'
        ]
      }
    }
  });
});

// Error handling
app.use(errorHandler);

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    errors: [{
      status: '404',
      title: 'Not Found',
      detail: `The requested resource ${req.originalUrl} was not found.`
    }]
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Products service started on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;