const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  price: Joi.number().positive().required(),
  description: Joi.string().max(1000).optional()
});

const querySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

// GET /api/products - List all products
router.get('/', validateRequest('query', querySchema), async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    
    const products = await Product.findAll(limit, offset);
    const total = await Product.count();
    
    logger.info(`Retrieved ${products.length} products`);
    
    res.json({
      data: products.map(product => product.toJSON()),
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: offset + limit < total
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Create a new product
router.post('/', validateRequest('body', createProductSchema), async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    
    logger.info(`Product created successfully: ${product.id}`);
    
    res.status(201).json({
      data: product.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({
        errors: [{
          status: '404',
          title: 'Product Not Found',
          detail: `Product with ID ${id} was not found.`
        }]
      });
    }
    
    logger.info(`Product retrieved: ${product.id}`);
    
    res.json({
      data: product.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;