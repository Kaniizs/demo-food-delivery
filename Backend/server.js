const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/Users');
const Food = require('./models/Food');
const Order = require('./models/Order');

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || !process.env.MONGO_URI) {
  console.error("❌ Missing JWT_SECRET or MONGO_URI in .env file");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Replace your current multer setup with this:
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('✅ MongoDB connected');

  const foodItems = await Food.find();
  const existingImages = new Set(foodItems.map(item => item.image));
  
  const uploadDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadDir)) {
    fs.readdirSync(uploadDir).forEach(file => {
      const filePath = `/uploads/${file}`;
      if (!existingImages.has(filePath)) {
        fs.unlinkSync(path.join(uploadDir, file));
        console.log(`Deleted orphaned image: ${file}`);
      }
    });
  }

  await User.deleteOne({ username: 'admin' });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = new User({
    username: 'admin',
    password: hashedPassword,
    role: 'admin',
  });
  await admin.save();
  console.log('👑 Default admin user recreated: admin / admin123');
}).catch(err => console.error('❌ MongoDB connection error:', err));


app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role || 'user' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Middleware ---
function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied: Admins only' });
  next();
}

// --- Protected Routes ---
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

// --- Menu Routes ---
app.get('/api/menu', async (req, res) => {
  try {
    const foodItems = await Food.find();
    res.json(foodItems);
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ error: 'Failed to fetch food items' });
  }
});

app.post('/api/food', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, instructions, price } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Store relative path in database
    const imagePath = `/uploads/${req.file.filename}`;

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
    console.error('Add food error:', err);
    res.status(500).json({ error: 'Failed to add food item' });
  }
});

app.get('/api/food/:id', async (req, res) => {
  try {
    const foodId = req.params.id;
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ error: 'Food item not found' });
    }
    res.json(food);
  } catch (err) {
    console.error('Get food by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch food item' });
  }
});



app.put('/api/food/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const foodId = req.params.id;
    const { name, category, instructions, price } = req.body;

    // Find existing food
    const existingFood = await Food.findById(foodId);
    if (!existingFood) return res.status(404).json({ error: 'Food item not found' });

    // If a new image is uploaded, delete the old one
    let imagePath = existingFood.image;
    if (req.file) {
      // Delete old image file
      if (imagePath) {
        const oldImagePath = path.join(__dirname, 'uploads', path.basename(imagePath));
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      // Set new image path
      imagePath = `/uploads/${req.file.filename}`;
    }

    // Update fields
    existingFood.name = name;
    existingFood.category = category;
    existingFood.instructions = instructions;
    existingFood.price = price;
    existingFood.image = imagePath;

    const updatedFood = await existingFood.save();
    res.json({ message: 'Food item updated', food: updatedFood });

  } catch (err) {
    console.error('Update food error:', err);
    res.status(500).json({ error: 'Failed to update food item' });
  }
});


app.delete('/api/food/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ error: 'Food item not found' });

    // Delete the associated image file
    if (food.image) {
      const imagePath = path.join(__dirname, food.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food item and image deleted successfully' });
  } catch (err) {
    console.error('Delete food error:', err);
    res.status(500).json({ error: 'Failed to delete food item' });
  }
});

app.use('/uploads', express.static('uploads'));

// --- Order Routes ---
app.post('/api/order', authenticateToken, async (req, res) => {
  try {
    const { items, customerName } = req.body;
    if (!items || items.length === 0 || !customerName) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    const newOrder = new Order({ customerName, items });
    await newOrder.save();
    res.status(201).json({ message: 'Order placed!', order: newOrder });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ time: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.put('/api/order/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order status updated', order: updatedOrder });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.get('/api/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
