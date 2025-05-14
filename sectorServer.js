const express = require("express");
const path = require("path");
const readline = require("readline");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "credentialsDontPost/.env") });
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

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
  const { name, email, sector } = req.body;
  const ts = new Date().toString();
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(collectionName);
    await col.insertOne({ name, email, sector, addedAt: ts });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Favorited Sector</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <h2>Favorited Sector</h2>
          <div class="content-container">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Sector:</strong> ${sector}</p>
            <p><strong>Added At:</strong> ${ts}</p>
          </div>
          <div class="home-button-container">
            <a href="/" class="button-link">HOME</a>
          </div>
        </body>
      </html>
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

// List all sectors
app.get("/viewSectors", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection(collectionName);
    const sectors = await col.find({}, { projection: { name: 1, email: 1, sector: 1 } }).toArray();

    if (sectors.length === 0) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sectors</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <h2>All Sectors</h2>
          <p>No sectors found in the database.</p>
          <div class="home-button-container">
            <a href="/" class="button-link">HOME</a>
          </div>
        </body>
        </html>
      `);
    }

    const rows = sectors.map(s =>
      `<tr><td>${s.name}</td><td>${s.email}</td><td>${s.sector}</td></tr>`
    ).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sectors</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <h2>All Sectors</h2>
        <table border="1">
          <tr><th>Name</th><th>Email</th><th>Sector</th></tr>
          ${rows}
        </table>
        <div class="home-button-container">
          <a href="/" class="button-link">HOME</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching sectors.");
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
      <!DOCTYPE html>
      <html>
        <head>
          <title>Removed Favorites</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <h2>Removed Favorites</h2>
          <div class="content-container">
            <p>Deleted ${result.deletedCount} favorite(s).</p>
          </div>
          <div class="home-button-container">
            <a href="/" class="button-link">HOME</a>
          </div>
        </body>
      </html>
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