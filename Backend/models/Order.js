const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: String,
  items: [
    {
      id: String,
      name: String,
      price: Number,
      quantity: Number,
    }
  ],
  time: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'waiting to prepare',
  }
});

module.exports = mongoose.model('Order', orderSchema);
