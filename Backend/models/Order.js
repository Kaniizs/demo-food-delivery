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
  tableName: {
    type: String,
    required: true,
  },
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
