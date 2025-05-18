const express = require("express");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "credentialsDontPost/.env") });
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const client = new MongoClient(process.env.MONGO_CONNECTION_STRING, {
  serverApi: ServerApiVersion.v1,
});

const dbName = "CMSC335DB";
const favoritesCollection = "stockapp";
const stocksHistoryCollection = "stocks";

// --- ROUTES ---

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Add favorite stock form 
app.get("/apply", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "apply.html"));
});

// Process adding a favorite stock
app.post("/processFavorite", async (req, res) => {
  const { name, email, stock } = req.body;
  const stockSymbol = stock.toUpperCase();
  const ts = new Date().toISOString();

  try {
    // Step 1: Check if stock is valid using Alpha Vantage
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: stockSymbol,
        apikey: process.env.ALPHA_API_KEY
      }
    });

    const quote = response.data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0 || !quote['01. symbol']) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title><link rel="stylesheet" href="/style.css"></head>
        <body>
          <h2>Invalid Stock Symbol</h2>
          <p>The stock symbol <strong>${stockSymbol}</strong> is not valid. Please enter a valid symbol.</p>
          <a href="/apply" class="button-link">Try Again</a>
        </body>
        </html>
      `);
    }

    // Extract more detailed stock info from quote
    const stockData = {
      symbol: quote['01. symbol'],
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      price: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume'], 10),
      latestTradingDay: quote['07. latest trading day'],
      previousClose: parseFloat(quote['08. previous close']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent'],
    };

    // Step 2: Add valid stock with detailed info to MongoDB
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(favoritesCollection);

    // Insert document with user info and full stock data
    await col.insertOne({
      name,
      email: email.toLowerCase(),
      stock: stockSymbol,
      stockData,
      addedAt: ts
    });

    // Send confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Favorited Stock</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <h2>Favorited Stock</h2>
          <div class="content-container">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Stock Symbol:</strong> ${stockSymbol}</p>
            <p><strong>Added At:</strong> ${ts}</p>
            <h3>Stock Details</h3>
            <ul>
              <li>Price: ${stockData.price}</li>
            </ul>
          </div>
          <div class="home-button-container">
            <a href="/" class="button-link">HOME</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing favorite stock.");
  }
});



// Review favorite stocks by email form
app.get("/reviewFavoriteStocks", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reviewFavoriteStocks.html"));
});

// Process review favorite stocks by email and show stocks
app.post("/processReviewFavoriteStocks", async (req, res) => {
  const { email } = req.body;
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(favoritesCollection);
    const stocks = await col.find({ email: email.toLowerCase() }).toArray();

    if (!stocks || stocks.length === 0) {
      return res.send(`
        <h2>No Favorite Stocks Found</h2>
        <p>No favorite stocks found for email: <strong>${email}</strong>.</p>
        <br /><a href="/" class="button-link">HOME</a>
      `);
    }

    // Build rows displaying all stored stock info
    let rows = stocks.map(stock => {
      const d = stock.stockData || {};
      return `
        <tr>
          <td>${stock.stock}</td>
          <td>${new Date(stock.addedAt).toLocaleString()}</td>
          <td>${d.open ?? '-'}</td>
          <td>${d.high ?? '-'}</td>
          <td>${d.low ?? '-'}</td>
          <td>${d.price ?? '-'}</td>
          <td>${d.volume ?? '-'}</td>
          <td>${d.latestTradingDay ?? '-'}</td>
          <td>${d.previousClose ?? '-'}</td>
          <td>${d.change ?? '-'}</td>
          <td>${d.changePercent ?? '-'}</td>
        </tr>
      `;
    }).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Your Favorite Stocks</title>
        <link rel="stylesheet" href="/style.css">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 8px; border: 1px solid #ddd; text-align: center; }
          th { background-color: #f4f4f4; }
        </style>
      </head>
      <body>
        <h2>Favorite Stocks for ${email}</h2>
        <table>
          <thead>
            <tr>
              <th>Stock Symbol</th>
              <th>Date Added</th>
              <th>Open</th>
              <th>High</th>
              <th>Low</th>
              <th>Price</th>
              <th>Volume</th>
              <th>Latest Trading Day</th>
              <th>Previous Close</th>
              <th>Change</th>
              <th>Change Percent</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <br>
        <a href="/" class="button-link">HOME</a>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching favorite stocks.");
  }
});


// Stock search form
app.get('/stockSearch', (req, res) => {
  res.sendFile(path.join(__dirname, "views", "stockSearch.html"));
});

// Process stock info from Alpha Vantage API
app.post('/stockInfo', async (req, res) => {
  const stockSymbol = req.body.stockSelected.toUpperCase();

  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: stockSymbol,
        apikey: process.env.ALPHA_API_KEY
      }
    });

    const quote = response.data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      return res.send(`
        <h1>No data found for "${stockSymbol}". Try a valid ticker symbol.</h1>
        <br><a href="/stockSearch">Try Again</a>
      `);
    }

    // Save search history to MongoDB
    await client.connect();
    const db = client.db(dbName);
    await db.collection(stocksHistoryCollection).insertOne({
      symbol: stockSymbol,
      searchedAt: new Date()
    });

    res.send(`
      <html>
        <body style="text-align:center; font-family: Arial;">
          <h1><strong>${quote['01. symbol']} Stock Info</strong></h1>
          <h2>Open: $${quote['02. open']}</h2>
          <h2>High: $${quote['03. high']}</h2>
          <h2>Low: $${quote['04. low']}</h2>
          <h2>Price: $${quote['05. price']}</h2>
          <h2>Previous Close: $${quote['08. previous close']}</h2>
          <h2>Change: ${quote['09. change']} (${quote['10. change percent']})</h2>
          <h2>Last Trading Day: ${quote['07. latest trading day']}</h2>
          <br><a href="/stockSearch">Search Another</a>
          <br><a href="/">Return Home</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.send(`
      <h1>Error fetching stock data. Please try again later.</h1>
      <br><a href="/stockSearch">Try Again</a>
    `);
  }
});

// View stock search history
app.get('/viewStocks', async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const stocks = await db.collection(stocksHistoryCollection).find().sort({ searchedAt: -1 }).toArray();

    let rows = stocks.map(stock => `
      <tr>
        <td>${stock.symbol}</td>
        <td>${new Date(stock.searchedAt).toLocaleString()}</td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Stock Search History</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <h2>Stock Search History</h2>
        ${stocks.length === 0 ? '<p>No stocks searched yet.</p>' : `
        <table border="1">
          <tr><th>Stock Symbol</th><th>Date Searched</th></tr>
          ${rows}
        </table>`}
        <br>
        <a href="/" class="button-link">HOME</a>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching stock search history.");
  }
});

// Remove a specific favorite stock for a specific email form
app.get("/remove", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "remove.html"));
});

// Process removal of a specific favorite stock for a specific email
app.post("/remove", async (req, res) => {
  const { email, stock } = req.body;

  if (!email || !stock) {
    return res.status(400).send(`
      <h2>Error</h2>
      <p>Both email and stock symbol are required to remove a favorite stock.</p>
      <a href="/remove">Try Again</a>
    `);
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(favoritesCollection);

    const result = await col.deleteMany({ 
      email: email.toLowerCase(), 
      stock: stock.toUpperCase()
    });

    if (result.deletedCount === 0) {
      return res.send(`
        <h2>Not Found</h2>
        <p>No favorite stock <strong>${stock.toUpperCase()}</strong> found for email <strong>${email}</strong>.</p>
        <a href="/remove">Try Again</a>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Removed Favorite Stock</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <h2>Removed Favorite Stock</h2>
          <p>Deleted favorite stock <strong>${stock.toUpperCase()}</strong> for email: <strong>${email}</strong>.</p>
          <br>
          <a href="/" class="button-link">HOME</a>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(`
      <h2>Error removing favorite stock</h2>
      <p>Something went wrong. Please try again later.</p>
      <a href="/remove">Try Again</a>
    `);
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
