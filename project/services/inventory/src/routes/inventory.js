const express = require('express');
const Joi = require('joi');
const Inventory = require('../models/Inventory');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');
const { getProductInfo } = require('../services/productService');

const router = express.Router();

// Validation schemas
const updateInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).required()
});

// GET /api/inventory/:productId - Get inventory for a product
router.get('/:productId', async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Get inventory information
    let inventory = await Inventory.findByProductId(productId);
    
    // If inventory doesn't exist, create with 0 quantity
    if (!inventory) {
      inventory = await Inventory.createOrUpdate(productId, 0);
    }
    
    // Get product information from Products service
    let productInfo = null;
    try {
      productInfo = await getProductInfo(productId);
    } catch (error) {
      logger.warn(`Could not fetch product info for ${productId}:`, error.message);
    }
    
    const response = {
      data: inventory.toJSON()
    };
    
    // Include product information if available
    if (productInfo) {
      response.included = [{
        type: 'products',
        id: productInfo.id,
        attributes: productInfo.attributes
      }];
    }
    
    logger.info(`Inventory retrieved for product: ${productId}`);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/inventory/:productId - Update inventory quantity
router.put('/:productId', validateRequest('body', updateInventorySchema), async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    // Verify product exists
    try {
      await getProductInfo(productId);
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          errors: [{
            status: '404',
            title: 'Product Not Found',
            detail: `Product with ID ${productId} was not found.`
          }]
        });
      }
      throw error;
    }
    
    const inventory = await Inventory.updateQuantity(productId, quantity);
    
    logger.info(`Inventory updated for product ${productId}: ${quantity}`);
    
    res.json({
      data: inventory.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;