const express = require("express");
const path = require("path");
const readline = require("readline");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "credentialsDontPost/.env") });
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(express.urlencoded({ extended: true }));
const PORT = process.argv[2] || 3000;

const client = new MongoClient(process.env.MONGO_CONNECTION_STRING, {
  serverApi: ServerApiVersion.v1,
});

const dbName = "CMSC335DB";
const collectionName = "stockapp";

// --- ROUTES ---

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Add favorite sector form
app.get("/apply", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "apply.html"));
});

// Process adding a favorite
app.post("/processFavorite", async (req, res) => {
  const { sector } = req.body;
  const ts = new Date().toString();
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(collectionName);
    await col.insertOne({ name: sector, addedAt: ts });

    res.send(`
      <h2>Favorited Sector</h2>
      <p><strong>Sector:</strong> ${sector}</p>
      <p><strong>Added At:</strong> ${ts}</p>
      <br /><a href="/">HOME</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding favorite.");
  }
});

// Review one favorite (and show real-time perf)
app.get("/reviewFavorite", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "reviewFavorite.html"));
});

app.post("/processReviewFavorite", async (req, res) => {
  const { sector } = req.body;
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(collectionName);
    const fav = await col.findOne({ name: sector });
    if (!fav) {
      return res.send(`
        <h2>Not Found</h2>
        <p>No favorite sector named <strong>${sector}</strong>.</p>
        <br /><a href="/">HOME</a>
      `);
    }
    // Call Alpha Vantage API for real-time perf
    const resp = await axios.get("https://www.alphavantage.co/query", {
      params: { function: 'SECTOR', apikey: process.env.ALPHA_API_KEY }
    });
    const raw = resp.data['Rank A: Real-Time Performance'] || {};
    const pct = raw[sector] || 'N/A';
    res.send(`
      <h2>Sector Performance</h2>
      <p><strong>${sector}</strong>: ${pct}</p>
      <br /><a href="/">HOME</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching performance.");
  }
});

// List all sectors (API-driven)
app.get("/listSectors", async (req, res) => {
  try {
    const resp = await axios.get("https://www.alphavantage.co/query", {
      params: { function: 'SECTOR', apikey: process.env.ALPHA_API_KEY }
    });
    const raw = resp.data['Rank A: Real-Time Performance'] || {};
    let rows = Object.entries(raw)
      .map(([name, pct]) => `<tr><td>${name}</td><td>${pct}</td></tr>`)
      .join('') || '<tr><td colspan="2">No data</td></tr>';
    res.send(`
      <h2>All Sectors (Real-Time)</h2>
      <table border="1">
        <tr><th>Sector</th><th>Performance</th></tr>
        ${rows}
      </table>
      <br /><a href="/">HOME</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error listing sectors.");
  }
});

// Remove all favorites confirmation
app.get("/adminRemove", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "adminRemove.html"));
});

// Process removal
app.post("/processAdminRemove", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(collectionName);
    const result = await col.deleteMany({});
    res.send(`
      <h2>Removed Favorites</h2>
      <p>Deleted ${result.deletedCount} favorite(s).</p>
      <br /><a href="/">HOME</a>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error clearing favorites.");
  }
});

// Start & graceful shutdown
const server = app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', line => { if (line.trim().toLowerCase()==='stop') server.close(() => process.exit(0)); });
