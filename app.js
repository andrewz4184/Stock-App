require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

// Routers
const sectorsRouter = require('./routes/sectors');
const stocksRouter  = require('./routes/stocks');

const app = express();

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- API Routes ---
app.use('/api/sectors', sectorsRouter);
app.use('/api/stocks', stocksRouter);

// --- SPA Fallback (serve index.html) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
