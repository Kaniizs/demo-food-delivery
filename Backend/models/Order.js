const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerName: String,
  items: [
    {
      id: String,
      name: String,
      price: Number,
      quantity: Number,
      additionalInfo: String
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
    default: 'รอการเตรียมอาหาร',
  }
});

module.exports = mongoose.model('Order', orderSchema);
