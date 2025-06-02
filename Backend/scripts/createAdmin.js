
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/Users'); 
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Connection error:', err));

async function createAdmin() {
  const username = 'admin';
  const password = 'adminpassword'; // Choose a strong password

  const existing = await User.findOne({ username });
  if (existing) {
    console.log('Admin already exists.');
    return mongoose.disconnect();
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminUser = new User({
    username,
    password: hashedPassword,
    role: 'admin',
  });

  await adminUser.save();
  console.log('Admin user created!');
  mongoose.disconnect();
}

createAdmin();
