const axios = require('axios');
const logger = require('../utils/logger');

const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3001';
const PRODUCTS_API_KEY = process.env.PRODUCTS_API_KEY;
const TIMEOUT = 5000; // 5 seconds
const RETRY_ATTEMPTS = 3;

// Create axios instance with default config
const productServiceClient = axios.create({
  baseURL: PRODUCTS_SERVICE_URL,
  timeout: TIMEOUT,
  headers: {
    'X-API-Key': PRODUCTS_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Retry function for failed requests
async function retryRequest(requestFn, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await requestFn();
    } catch (error) {
      logger.warn(`Request attempt ${i + 1} failed:`, error.message);
      
      if (i === attempts - 1) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

async function getProductInfo(productId) {
  return await retryRequest(async () => {
    logger.info(`Fetching product info for: ${productId}`);
    
    const response = await productServiceClient.get(`/api/products/${productId}`);
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response format from products service');
    }
    
    logger.info(`Product info retrieved for: ${productId}`);
    return response.data.data;
  });
}

async function getAllProducts(limit = 50, offset = 0) {
  return await retryRequest(async () => {
    logger.info('Fetching all products');
    
    const response = await productServiceClient.get('/api/products', {
      params: { limit, offset }
    });
    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response format from products service');
    }
    
    logger.info(`Retrieved ${response.data.data.length} products`);
    return response.data;
  });
}

module.exports = {
  getProductInfo,
  getAllProducts
};