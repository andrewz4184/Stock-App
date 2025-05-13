require('dotenv').config({ path: './credentialsDontPost/.env' });
const express = require('express');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');

// Routers
const sectorsRouter = require('./routes/sectors');
const stocksRouter  = require('./routes/stocks');

const app = express();
const PORT = process.argv[2] || process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB Setup ---
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.9ho2uur.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri);
const dbName = process.env.MONGO_DB_NAME;
const favoriteCollectionName = process.env.MONGO_COLLECTION || 'favoriteSectors';

// --- Start Server & Connect to DB ---
let server;
async function start() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    app.locals.db = db;
    app.locals.favorites = db.collection(favoriteCollectionName);

    // --- API Routes ---
    app.use('/api/sectors', sectorsRouter);
    app.use('/api/stocks', stocksRouter);

    // --- SPA Fallback ---
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log("Type 'stop' to shutdown the server.");
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}

start();

// --- Graceful Shutdown ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => {
  if (input.trim().toLowerCase() === 'stop') {
    console.log('🛑 Shutting down server...');
    server.close(() => {
      client.close(false, () => {
        console.log('🔒 MongoDB connection closed.');
        process.exit(0);
      });
    });
  }
});