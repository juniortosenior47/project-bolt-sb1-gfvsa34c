const express = require('express');
const Joi = require('joi');
const Inventory = require('../models/Inventory');
const Purchase = require('../models/Purchase');
const logger = require('../utils/logger');
const { validateRequest } = require('../middleware/validation');
const { getProductInfo } = require('../services/productService');
const { beginTransaction, commitTransaction, rollbackTransaction } = require('../models/database');

const router = express.Router();

// Validation schemas
const purchaseSchema = Joi.object({
  product_id: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required()
});

// POST /api/purchase - Process a purchase
router.post('/', validateRequest('body', purchaseSchema), async (req, res, next) => {
  try {
    const { product_id, quantity } = req.body;
    
    logger.info(`Processing purchase request: ${quantity} units of product ${product_id}`);
    
    // Start transaction
    await beginTransaction();
    
    try {
      // 1. Verify product exists and get product information
      let productInfo;
      try {
        productInfo = await getProductInfo(product_id);
      } catch (error) {
        if (error.response?.status === 404) {
          await rollbackTransaction();
          return res.status(404).json({
            errors: [{
              status: '404',
              title: 'Product Not Found',
              detail: `Product with ID ${product_id} was not found.`
            }]
          });
        }
        throw error;
      }
      
      // 2. Check inventory availability
      let inventory = await Inventory.findByProductId(product_id);
      
      if (!inventory || inventory.availableQuantity < quantity) {
        await rollbackTransaction();
        
        const availableQty = inventory ? inventory.availableQuantity : 0;
        return res.status(409).json({
          errors: [{
            status: '409',
            title: 'Insufficient Inventory',
            detail: `Requested quantity ${quantity} exceeds available inventory ${availableQty} for product ${product_id}.`
          }]
        });
      }
      
      // 3. Calculate total price
      const unitPrice = productInfo.attributes.price;
      const totalPrice = unitPrice * quantity;
      
      // 4. Update inventory (decrement quantity)
      await Inventory.decrementQuantity(product_id, quantity);
      
      // 5. Create purchase record
      const purchase = await Purchase.create({
        product_id,
        quantity,
        total_price: totalPrice
      });
      
      // 6. Commit transaction
      await commitTransaction();
      
      logger.info(`Purchase completed successfully: ${purchase.id}`);
      
      // Get updated inventory for response
      const updatedInventory = await Inventory.findByProductId(product_id);
      
      res.status(201).json({
        data: purchase.toJSON(),
        included: [
          {
            type: 'products',
            id: productInfo.id,
            attributes: productInfo.attributes
          },
          updatedInventory.toJSON()
        ],
        meta: {
          unit_price: unitPrice,
          total_price: totalPrice,
          remaining_inventory: updatedInventory.availableQuantity
        }
      });
      
    } catch (error) {
      await rollbackTransaction();
      throw error;
    }
    
  } catch (error) {
    // Ensure rollback on any error
    try {
      await rollbackTransaction();
    } catch (rollbackError) {
      logger.error('Error rolling back transaction:', rollbackError);
    }
    next(error);
  }
});

// GET /api/purchase/:id - Get purchase by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const purchase = await Purchase.findById(id);
    
    if (!purchase) {
      return res.status(404).json({
        errors: [{
          status: '404',
          title: 'Purchase Not Found',
          detail: `Purchase with ID ${id} was not found.`
        }]
      });
    }
    
    logger.info(`Purchase retrieved: ${purchase.id}`);
    
    res.json({
      data: purchase.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;