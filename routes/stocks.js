const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/stocks/:symbol/weekly
// Returns an array of { date, open, high, low, close, volume }
router.get('/:symbol/weekly', async (req, res) => {
  const { symbol } = req.params;

  try {
    const resp = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_WEEKLY',
        symbol,                              // e.g. "IBM" or "TSCO.LON"
        apikey: process.env.ALPHA_API_KEY   // ← make sure this is set in .env
      }
    });

    // The JSON comes back under "Weekly Time Series"
    const raw = resp.data['Weekly Time Series'];
    if (!raw) {
      // e.g. API limit hit or bad symbol
      return res.status(502).json({
        error: 'Alpha Vantage error or rate limit reached',
        details: resp.data
      });
    }

    // Transform into an array sorted newest → oldest
    const series = Object.entries(raw)
      .map(([date, vals]) => ({
        date,
        open:  parseFloat(vals['1. open']),
        high:  parseFloat(vals['2. high']),
        low:   parseFloat(vals['3. low']),
        close: parseFloat(vals['4. close']),
        volume: parseInt(vals['5. volume'], 10)
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(series);

  } catch (err) {
    console.error('❌ /api/stocks/:symbol/weekly error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weekly series' });
  }
});

module.exports = router;
