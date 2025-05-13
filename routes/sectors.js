const express = require('express');
const axios = require('axios');
const FavoriteSector = require('../models/FavoriteSector');

const router = express.Router();
const ALPHA_URL = 'https://www.alphavantage.co/query';

router.get('/', async (req, res) => {
  try {
    const resp = await axios.get(ALPHA_URL, {
      params: {
        function: 'SECTOR',
        apikey: process.env.ALPHA_API_KEY
      }
    });
    // Alpha returns multiple “Rank X” objects; we’ll use real-time:
    const raw = resp.data['Rank A: Real-Time Performance'];
    // Convert { "Energy": "0.23%", ... } → [{ name, performance }]
    const data = Object.entries(raw).map(([name, pct]) => ({
      name,
      performance: parseFloat(pct.replace('%',''))
    }));
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sector data' });
  }
});

// GET favorite sectors
router.get('/favorites', async (req, res) => {
  const favs = await FavoriteSector.find().sort('name');
  res.json(favs);
});

// POST add a sector to favorites
router.post('/favorites', async (req, res) => {
  const { name } = req.body;
  try {
    const exists = await FavoriteSector.findOne({ name });
    if (!exists) {
      const fav = new FavoriteSector({ name });
      await fav.save();
      return res.status(201).json(fav);
    }
    res.status(200).json(exists);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE a sector from favorites
router.delete('/favorites/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await FavoriteSector.deleteOne({ name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
