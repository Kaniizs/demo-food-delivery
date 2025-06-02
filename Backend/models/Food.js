const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    name: String,
    image: String,
    category: String,
    instructions: String,
    price: Number,
});

module.exports = mongoose.model('Food', foodSchema);

