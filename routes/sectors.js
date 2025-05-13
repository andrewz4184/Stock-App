// routes/sectors.js
const express = require('express');
const axios   = require('axios');
const FavoriteSector = require('../models/FavoriteSector');

const router = express.Router();
const ALPHA_URL = 'https://www.alphavantage.co/query';

// GET all sector perf (real-time)
router.get('/', async (req, res) => {
  try {
    const resp = await axios.get(ALPHA_URL, {
      params: {
        function: 'SECTOR',
        apikey: process.env.ALPHA_API_KEY
      }
    });

    // Alpha returns multiple "Rank X: ..." objects; we pick real-time
    const raw = resp.data['Rank A: Real-Time Performance'];
    if (!raw) {
      return res.status(502).json({
        error: 'Alpha Vantage SECTOR data unavailable (rate-limit or bad key)',
        details: resp.data
      });
    }

    // Transform into [{ name, performance }]
    const data = Object.entries(raw).map(([name, pct]) => ({
      name,
      performance: parseFloat(pct.replace('%', ''))
    }));

    res.json(data);
  } catch (err) {
    console.error('❌ GET /api/sectors failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch sector performance' });
  }
});

// GET favorites
router.get('/favorites', async (req, res) => {
  try {
    const favs = await FavoriteSector.find().sort('name');
    res.json(favs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// POST add favorite
router.post('/favorites', async (req, res) => {
  const { name } = req.body;
  try {
    const exists = await FavoriteSector.findOne({ name });
    if (!exists) {
      const fav = await new FavoriteSector({ name }).save();
      return res.status(201).json(fav);
    }
    res.json(exists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE remove favorite
router.delete('/favorites/:name', async (req, res) => {
  try {
    await FavoriteSector.deleteOne({ name: req.params.name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;