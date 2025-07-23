const { v4: uuidv4 } = require('uuid');
const { runQuery, getQuery, allQuery } = require('./database');
const logger = require('../utils/logger');

class Product {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name;
    this.price = data.price;
    this.description = data.description || null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(productData) {
    try {
      const product = new Product(productData);
      
      const query = `
        INSERT INTO products (id, name, price, description)
        VALUES (?, ?, ?, ?)
      `;
      
      await runQuery(query, [product.id, product.name, product.price, product.description]);
      
      logger.info(`Product created with ID: ${product.id}`);
      return await Product.findById(product.id);
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = 'SELECT * FROM products WHERE id = ?';
      const row = await getQuery(query, [id]);
      
      if (!row) {
        return null;
      }
      
      return new Product(row);
    } catch (error) {
      logger.error('Error finding product by ID:', error);
      throw error;
    }
  }

  static async findAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM products 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const rows = await allQuery(query, [limit, offset]);
      return rows.map(row => new Product(row));
    } catch (error) {
      logger.error('Error finding all products:', error);
      throw error;
    }
  }

  static async count() {
    try {
      const query = 'SELECT COUNT(*) as count FROM products';
      const result = await getQuery(query);
      return result.count;
    } catch (error) {
      logger.error('Error counting products:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      type: 'products',
      id: this.id,
      attributes: {
        name: this.name,
        price: this.price,
        description: this.description,
        created_at: this.created_at,
        updated_at: this.updated_at
      }
    };
  }
}

module.exports = Product;