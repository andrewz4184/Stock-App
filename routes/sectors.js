// routes/sectors.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const ALPHA_URL = 'https://www.alphavantage.co/query';

// GET all sector performance (real-time)
router.get('/', async (req, res) => {
  try {
    const resp = await axios.get(ALPHA_URL, {
      params: {
        function: 'SECTOR',
        apikey: process.env.ALPHA_API_KEY
      }
    });

    const raw = resp.data['Rank A: Real-Time Performance'];
    if (!raw) {
      return res.status(502).json({
        error: 'Alpha Vantage SECTOR data unavailable (rate-limit or bad key)',
        details: resp.data
      });
    }

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

// GET favorite sectors
router.get('/favorites', async (req, res) => {
  try {
    const collection = req.app.locals.favorites;
    const favs = await collection.find({}).sort({ name: 1 }).toArray();
    res.json(favs);
  } catch (err) {
    console.error('❌ GET /api/sectors/favorites failed:', err.message);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

// POST add a sector to favorites
router.post('/favorites', async (req, res) => {
  const { name } = req.body;
  try {
    const collection = req.app.locals.favorites;
    const exists = await collection.findOne({ name });
    if (exists) {
      return res.json(exists);
    }
    const result = await collection.insertOne({ name });
    const newFav = { _id: result.insertedId, name };
    res.status(201).json(newFav);
  } catch (err) {
    console.error('❌ POST /api/sectors/favorites failed:', err.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE remove favorite sector
router.delete('/favorites/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const collection = req.app.locals.favorites;
    await collection.deleteOne({ name });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ DELETE /api/sectors/favorites/:name failed:', err.message);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;