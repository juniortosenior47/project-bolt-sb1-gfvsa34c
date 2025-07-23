const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/inventory.db');

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        logger.error('Error opening database:', err);
      } else {
        logger.info('Connected to Inventory SQLite database');
      }
    });
  }
  return db;
}

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    
    // Create inventory table
    const createInventoryTable = `
      CREATE TABLE IF NOT EXISTS inventory (
        product_id TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
        reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create purchase history table
    const createPurchaseHistoryTable = `
      CREATE TABLE IF NOT EXISTS purchase_history (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_price REAL NOT NULL,
        purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'completed'
      )
    `;

    database.serialize(() => {
      database.run(createInventoryTable, (err) => {
        if (err) {
          logger.error('Error creating inventory table:', err);
          reject(err);
          return;
        }
      });

      database.run(createPurchaseHistoryTable, (err) => {
        if (err) {
          logger.error('Error creating purchase_history table:', err);
          reject(err);
          return;
        }
        
        logger.info('Inventory database tables initialized successfully');
        resolve();
      });
    });
  });
}

function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Transaction support
function beginTransaction() {
  return runQuery('BEGIN TRANSACTION');
}

function commitTransaction() {
  return runQuery('COMMIT');
}

function rollbackTransaction() {
  return runQuery('ROLLBACK');
}

module.exports = {
  getDatabase,
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};