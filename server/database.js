const dotenv = require('dotenv');

dotenv.config();

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

if (!process.env.SOLSCAN_API_KEY || !process.env.TOKEN_ADDRESS) {
  throw new Error('SOLSCAN_API_KEY and TOKEN_ADDRESS environment variables are required');
}

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const API_RETRY_DELAY = 1000;
const TRANSACTION_FETCH_DELAY = 500;

class TokenMetricsService {
  static instance;
  lastProcessedTimestamp = null;
  totalTransactions = 0;
  processedHashes = new Set();
  isInitialized = false;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://pro-api.solscan.io/v2.0',
      headers: {
        'Accept': 'application/json',
        'token': process.env.SOLSCAN_API_KEY.trim() 
      },
      timeout: 10000 // 10 second timeout
    });
  }

  static getInstance() {
    if (!TokenMetricsService.instance) {
      TokenMetricsService.instance = new TokenMetricsService();
    }
    return TokenMetricsService.instance;
  }

  async getRealTransactionCount() {
    try {
      return await prisma.transaction.count();
    } catch (error) {
      console.error('Error getting transaction count:', error);
      return 0;
    }
  }

  async initializeCounter() {
    try {
      const lastTx = await prisma.transaction.findFirst({
        orderBy: { timestamp: 'desc' }
      });

      if (lastTx) {
        this.lastProcessedTimestamp = lastTx.timestamp;
        
        const processedTransactions = await prisma.transaction.findMany({
          select: { hash: true }
        });
        
        this.processedHashes = new Set(processedTransactions.map(tx => tx.hash));
      }

      this.totalTransactions = await this.getRealTransactionCount();
      console.log(`Total transactions: ${this.totalTransactions}`);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing counter:', error);
      throw error;
    }
  }

  // In your tokenMetricsService.js or database.js
async getTransactions(limit = 1000, offset = 0) {
  try {
    const transactions = await prisma.transaction.findMany({
      skip: offset,
      take: limit,
      orderBy: { timestamp: 'desc' }
    });

    const total = await this.getRealTransactionCount();

    return {
      transactions: transactions.map(tx => ({
        ...tx,
        timestamp: new Date(tx.timestamp).toISOString(),
        amount: parseFloat(tx.amount.toString())
      })),
      total
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

  async deduplicateTransactions() {
    try {
      // Get all transactions
      const transactions = await prisma.transaction.findMany({
        select: {
          id: true,
          hash: true,
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
  
      // Find duplicate hashes
      const hashCount = {};
      const duplicateIds = [];
  
      transactions.forEach(tx => {
        hashCount[tx.hash] = (hashCount[tx.hash] || 0) + 1;
        if (hashCount[tx.hash] > 1) {
          duplicateIds.push(tx.id);
        }
      });
  
      // Delete duplicates if found
      if (duplicateIds.length > 0) {
        await prisma.transaction.deleteMany({
          where: {
            id: {
              in: duplicateIds
            }
          }
        });
        console.log(`Removed ${duplicateIds.length} duplicate transactions`);
      }
    } catch (error) {
      console.error('Error deduplicating transactions:', error);
    }
  }

  async fetchAndStoreTransactions() {
    try {
      if (!this.isInitialized) {
        await this.initializeCounter();
      }

      const { data } = await this.api.get('/token/transfer', {
        params: { address: TOKEN_ADDRESS }
      });

      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from Solscan API');
      }

      const uniqueTransactions = new Map();

      data.data.forEach(tx => {
        try {
          if (this.processedHashes.has(tx.trans_id)) return;
          
          const amount = tx.amount / Math.pow(10, tx.token_decimals);
          if (isNaN(amount) || amount <= 0) {
            console.warn(`Invalid amount for transaction ${tx.trans_id}`);
            return;
          }

          const transaction = {
            hash: tx.trans_id,
            timestamp: new Date(tx.block_time * 1000),
            amount,
            createdAt: new Date(),
            fromAddress: tx.from_address,
            toAddress: tx.to_address
          };
          
          uniqueTransactions.set(tx.trans_id, transaction);
          this.processedHashes.add(tx.trans_id);
        } catch (err) {
          console.error(`Error processing transaction ${tx.trans_id}:`, err);
        }
      });

      const transactions = Array.from(uniqueTransactions.values())
        .sort((a, b) => a.timestamp - b.timestamp);

      if (transactions.length > 0) {
        const maxId = await prisma.transaction.aggregate({ _max: { id: true } });
        const startId = (maxId._max.id || 0) + 1;

        await prisma.transaction.createMany({
          data: transactions.map((tx, index) => ({
            ...tx,
            id: startId + index
          })),
          skipDuplicates: true
        });

        this.lastProcessedTimestamp = transactions[transactions.length - 1].timestamp;
        this.totalTransactions += transactions.length;
        console.log(`Total transactions: ${this.totalTransactions}`);
      }
      
      setTimeout(() => this.fetchAndStoreTransactions(), TRANSACTION_FETCH_DELAY);
    } catch (error) {
      console.error('API Error:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.data);
      }
      setTimeout(() => this.fetchAndStoreTransactions(), API_RETRY_DELAY);
    }
  }

  async startMonitoring() {
    try {
      await this.initializeCounter();
      this.fetchAndStoreTransactions();
    } catch (error) {
      console.error('Error starting monitoring:', error);
      process.exit(1);
    }
  }

  async cleanup() {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

const tokenMetricsService = TokenMetricsService.getInstance();

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('Cleaning up...');
  await tokenMetricsService.cleanup();
  process.exit();
});

process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await tokenMetricsService.cleanup();
  process.exit(1);
});

// Start the service
tokenMetricsService.startMonitoring().catch(error => {
  console.error('Failed to start monitoring:', error);
  process.exit(1);
});

module.exports = { tokenMetricsService };