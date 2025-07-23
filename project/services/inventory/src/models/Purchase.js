const { v4: uuidv4 } = require('uuid');
const { runQuery, getQuery, allQuery } = require('./database');
const logger = require('../utils/logger');

class Purchase {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.product_id = data.product_id;
    this.quantity = data.quantity;
    this.total_price = data.total_price;
    this.purchase_date = data.purchase_date;
    this.status = data.status || 'completed';
  }

  static async create(purchaseData) {
    try {
      const purchase = new Purchase(purchaseData);
      
      const query = `
        INSERT INTO purchase_history (id, product_id, quantity, total_price, status)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      await runQuery(query, [
        purchase.id,
        purchase.product_id,
        purchase.quantity,
        purchase.total_price,
        purchase.status
      ]);
      
      logger.info(`Purchase record created: ${purchase.id}`);
      return await Purchase.findById(purchase.id);
    } catch (error) {
      logger.error('Error creating purchase record:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = 'SELECT * FROM purchase_history WHERE id = ?';
      const row = await getQuery(query, [id]);
      
      if (!row) {
        return null;
      }
      
      return new Purchase(row);
    } catch (error) {
      logger.error('Error finding purchase by ID:', error);
      throw error;
    }
  }

  static async findByProductId(productId, limit = 10) {
    try {
      const query = `
        SELECT * FROM purchase_history 
        WHERE product_id = ? 
        ORDER BY purchase_date DESC 
        LIMIT ?
      `;
      
      const rows = await allQuery(query, [productId, limit]);
      return rows.map(row => new Purchase(row));
    } catch (error) {
      logger.error('Error finding purchases by product ID:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      type: 'purchases',
      id: this.id,
      attributes: {
        product_id: this.product_id,
        quantity: this.quantity,
        total_price: this.total_price,
        purchase_date: this.purchase_date,
        status: this.status
      }
    };
  }
}

module.exports = Purchase;