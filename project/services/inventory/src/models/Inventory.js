const { runQuery, getQuery, allQuery } = require('./database');
const logger = require('../utils/logger');

class Inventory {
  constructor(data) {
    this.product_id = data.product_id;
    this.quantity = data.quantity;
    this.reserved_quantity = data.reserved_quantity || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByProductId(productId) {
    try {
      const query = 'SELECT * FROM inventory WHERE product_id = ?';
      const row = await getQuery(query, [productId]);
      
      if (!row) {
        return null;
      }
      
      return new Inventory(row);
    } catch (error) {
      logger.error('Error finding inventory by product ID:', error);
      throw error;
    }
  }

  static async createOrUpdate(productId, quantity) {
    try {
      const query = `
        INSERT INTO inventory (product_id, quantity, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(product_id) DO UPDATE SET
          quantity = excluded.quantity,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await runQuery(query, [productId, quantity]);
      logger.info(`Inventory updated for product ${productId}: quantity = ${quantity}`);
      
      return await Inventory.findByProductId(productId);
    } catch (error) {
      logger.error('Error creating/updating inventory:', error);
      throw error;
    }
  }

  static async updateQuantity(productId, newQuantity) {
    try {
      const query = `
        UPDATE inventory 
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE product_id = ?
      `;
      
      const result = await runQuery(query, [newQuantity, productId]);
      
      if (result.changes === 0) {
        // If no rows were updated, create a new inventory record
        await Inventory.createOrUpdate(productId, newQuantity);
      }
      
      logger.info(`Inventory quantity updated for product ${productId}: ${newQuantity}`);
      return await Inventory.findByProductId(productId);
    } catch (error) {
      logger.error('Error updating inventory quantity:', error);
      throw error;
    }
  }

  static async decrementQuantity(productId, quantity) {
    try {
      const query = `
        UPDATE inventory 
        SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP 
        WHERE product_id = ? AND quantity >= ?
      `;
      
      const result = await runQuery(query, [quantity, productId, quantity]);
      
      if (result.changes === 0) {
        const currentInventory = await Inventory.findByProductId(productId);
        if (!currentInventory) {
          throw new Error('Product not found in inventory');
        }
        if (currentInventory.quantity < quantity) {
          throw new Error('Insufficient inventory');
        }
        throw new Error('Failed to decrement inventory');
      }
      
      logger.info(`Inventory decremented for product ${productId}: -${quantity}`);
      return await Inventory.findByProductId(productId);
    } catch (error) {
      logger.error('Error decrementing inventory:', error);
      throw error;
    }
  }

  get availableQuantity() {
    return this.quantity - this.reserved_quantity;
  }

  toJSON() {
    return {
      type: 'inventory',
      id: this.product_id,
      attributes: {
        product_id: this.product_id,
        quantity: this.quantity,
        reserved_quantity: this.reserved_quantity,
        available_quantity: this.availableQuantity,
        created_at: this.created_at,
        updated_at: this.updated_at
      }
    };
  }
}

module.exports = Inventory;