const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  instructions: { type: String, required: true },
  price: { type: Number, required: true }
});

module.exports = mongoose.model('Food', foodSchema);