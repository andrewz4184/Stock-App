const mongoose = require('mongoose');

const FavoriteSectorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('FavoriteSector', FavoriteSectorSchema);
