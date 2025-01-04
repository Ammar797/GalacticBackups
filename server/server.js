const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { tokenMetricsService } = require('./database.js');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000; 
const server = createServer(app);
const wss = new WebSocket.Server({ server });
const sentTransactions = new Set();
const clients = new Set();
let lastKnownTransaction = null;

// Helper function to deduplicate transactions
async function deduplicateTransactions() {
  try {
    const { transactions } = await tokenMetricsService.getTransactions(10000); // Changed to larger limit
    const uniqueTransactions = new Map();
    
    transactions.forEach(tx => {  // Removed .data
      if (!uniqueTransactions.has(tx.hash)) {
        uniqueTransactions.set(tx.hash, tx);
      }
    });
    
    return Array.from(uniqueTransactions.values());
  } catch (error) {
    console.error('Error deduplicating transactions:', error);
    return [];
  }
}

// Transaction checking function
const checkNewTransactions = async () => {
  try {
    const { transactions } = await tokenMetricsService.getTransactions(10);
    
    if (transactions && transactions.length > 0) {
      const newTransactions = transactions.filter(tx => {
        if (sentTransactions.has(tx.hash)) {
          return false;
        }
        
        if (lastKnownTransaction && 
            new Date(tx.timestamp) <= new Date(lastKnownTransaction.timestamp)) {
          return false;
        }
        
        return true;
      });

      if (newTransactions.length > 0) {
        console.log(`Found ${newTransactions.length} new transactions`);
        lastKnownTransaction = transactions[0];
        
        for (const tx of newTransactions) {
          sentTransactions.add(tx.hash);
          // Make sure timestamp is properly formatted before broadcasting
          const formattedTx = {
            ...tx,
            timestamp: new Date(tx.timestamp).toISOString(),
            amount: parseFloat(tx.amount.toString())
          };
          await broadcastUpdate(formattedTx);
        }
      }
    }
  } catch (error) {
    console.error('Error checking new transactions:', error);
  }
};

// WebSocket connection handling
wss.on('connection', async (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);

  try {
    const transactions = await deduplicateTransactions();
    
    if (transactions.length > 0) {
      transactions.forEach(tx => sentTransactions.add(tx.hash));
      
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'initial',
          data: transactions,
          total: transactions.length,
          batchSize: transactions.length
        }));
      }
    }
  } catch (error) {
    console.error('Error sending initial data:', error);
  }

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
});

// Broadcast updates
const broadcastUpdate = async (transaction) => {
  try {
    const total = await tokenMetricsService.getRealTransactionCount();
    
    // Ensure timestamp is properly formatted
    const formattedTransaction = {
      ...transaction,
      timestamp: new Date(transaction.timestamp).toISOString(),
      amount: parseFloat(transaction.amount.toString())
    };
    
    const message = JSON.stringify({
      type: 'update',
      data: formattedTransaction,
      total: total
    });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('Error sending to client:', err);
          clients.delete(client);
        }
      }
    }
  } catch (error) {
    console.error('Error in broadcastUpdate:', error);
  }
};

// API routes
app.use(cors());
app.use(express.json());

app.get('/api/transactions', async (req, res) => {
  try {
    let { offset = 0, limit = 1000 } = req.query;
    offset = parseInt(offset);
    limit = parseInt(limit);
    
    // Get total count
    const total = await tokenMetricsService.getRealTransactionCount();
    
    // Get transactions for this batch
    const { transactions } = await tokenMetricsService.getTransactions(limit, offset);
    
    res.json({
      transactions,
      total,
      hasMore: offset + transactions.length < total
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    wsClients: clients.size,
    processedTransactions: sentTransactions.size
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    details: err.message
  });
});

// Cleanup explanation:
// The cleanup function is crucial for graceful server shutdown.
// It performs several important tasks:
// 1. Properly closes all WebSocket connections to prevent hanging connections
// 2. Ensures the HTTP server is properly shut down
// 3. Prevents any memory leaks or hanging processes
const cleanup = async () => {
  console.log('Starting server cleanup...');
  
  // Close all WebSocket connections gracefully
  for (const client of clients) {
    try {
      client.close();
    } catch (err) {
      console.error('Error closing client connection:', err);
    }
  }
  
  // Close the HTTP server
  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });
};

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setInterval(checkNewTransactions, 5000);
});

// Handle termination signals
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup();
});

const path = require('path');

// Serve React app from the 'dist/' folder
app.use(express.static(path.resolve(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
});
