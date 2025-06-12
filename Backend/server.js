const Order = require('./models/Order');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

const User = require('./models/Users');
const Food = require('./models/Food');

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage });
const bodyParser = require('body-parser');

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Remove existing admin user
    await User.deleteOne({ username: 'admin' });

    // Create a new admin user
    const hashedPassword = await bcrypt.hash('admin123', 10); // default password
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    });
    await admin.save();
    console.log('👑 Default admin user recreated: admin / admin123');
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));




// Register user
app.post('/api/register', async (req, res) => {
  const { username, password, role = 'user' } = req.body;

  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(400).json({ error: 'Username already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({ username, password: hashedPassword, role });
  await newUser.save();

  res.status(201).json({ message: 'User registered' });
});

// Login user
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  // Create JWT token
  const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token, role: user.role || 'user' });
});

// Middleware to verify token for protected routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }
  next();
}

app.get('/api/admin-stats', authenticateToken, isAdmin, (req, res) => {
  res.json({ message: 'Hello Admin, here are your stats.' });
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: `Hello ${req.user.username}, this is protected data.` });
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


let orders = [];

app.get('/api/menu', async (req, res) => {
  try {
    const foodItems = await Food.find();
    res.json(foodItems);
  } catch (error) {
    console.error('Error fetching food items:', error.message);
    res.status(500).json({ error: 'Failed to fetch food items' });
  }
});

// Protect this route - only admin can update food
app.post('/api/food', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  const { name, category, instructions, price } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || !imagePath || !category || !instructions || !price) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newFood = new Food({
      name,
      image: imagePath,
      category,
      instructions,
      price
    });
    await newFood.save();
    res.status(201).json({ message: 'Food item added', food: newFood });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add food item' });
  }
});

// Protect PUT route and require admin role
app.put('/api/food/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  console.log('PUT /api/food/:id body:', req.body, 'file:', req.file);
  const update = {
    name: req.body.name,
    category: req.body.category,
    instructions: req.body.instructions,
    price: req.body.price,
  };
  if (req.file) {
    update.image = `/uploads/${req.file.filename}`;
  }
  const updated = await Food.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!updated) return res.status(404).json({ message: 'Food not found' });
  return res.json(updated);
});

// Protect delete route and require admin role
app.delete('/api/food/:id', authenticateToken, isAdmin, async (req, res) => {
  const foodId = req.params.id;
  try {
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    // Delete image file if it exists
    if (food.image) {
      const imagePath = path.join(__dirname, food.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the food document from DB
    await Food.findByIdAndDelete(foodId);

    res.json({ message: 'Food item and image deleted successfully' });
  } catch (err) {
    console.error('Delete food error:', err);
    res.status(500).json({ error: 'Failed to delete food item' });
  }
});

app.use('/uploads', express.static('uploads'));


// POST: Place an order
app.post('/api/order', authenticateToken, async (req, res) => {
  const { items, customerName } = req.body;

  if (!items || items.length === 0 || !customerName) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  try {
    const newOrder = new Order({ customerName, items });
    await newOrder.save();
    orders.push(newOrder);
    res.status(201).json({ message: 'Order placed!', order: newOrder });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save order' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ time: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST: Update an order status
app.put('/api/order/:id/', authenticateToken, isAdmin, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  try {
    const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order status updated', order: updatedOrder });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET: Get an order by ID
app.get('/api/order/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});




// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
