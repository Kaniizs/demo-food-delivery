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
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || !process.env.MONGO_URI) {
  console.error("❌ Missing JWT_SECRET or MONGO_URI in .env file");
  process.exit(1);
}

// Define uploads directory path early
const uploadDir = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
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

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log('✅ MongoDB connected');

  // Reset admin user on startup
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
    if (!username || !password) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'การลงทะเบียนล้มเหลว' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

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
  if (!token) return res.status(401).json({ error: 'ไม่พบโทเค็น' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'โทเค็นไม่ถูกต้อง' });
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
  next();
}

// --- Protected Routes ---
app.get('/api/admin-stats', authenticateToken, isAdmin, (req, res) => {
  res.json({ message: 'สวัสดีผู้ดูแลระบบ นี่คือสถิติของคุณ' });
});

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: `สวัสดี ${req.user.username} นี่คือข้อมูลที่ได้รับการป้องกัน` });
});

app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});

// --- Menu Routes ---
app.get('/api/menu', async (req, res) => {
  try {
    const foodItems = await Food.find();
    res.json(foodItems);
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงรายการอาหารได้' });
  }
});

app.post('/api/food', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, category, instructions, price } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาอัพโหลดรูปภาพ' });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    const newFood = new Food({
      name,
      image: imagePath,
      category,
      instructions,
      price
    });

    await newFood.save();
    res.status(201).json({ message: 'เพิ่มรายการอาหารสำเร็จ', food: newFood });
  } catch (err) {
    console.error('Add food error:', err);
    res.status(500).json({ error: 'ไม่สามารถเพิ่มรายการอาหารได้' });
  }
});

app.get('/api/food/:id', async (req, res) => {
  try {
    const foodId = req.params.id;
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ error: 'ไม่พบรายการอาหาร' });
    }
    res.json(food);
  } catch (err) {
    console.error('Get food by ID error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลรายการอาหารได้' });
  }
});

app.put('/api/food/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const foodId = req.params.id;
    const { name, category, instructions, price } = req.body;

    const existingFood = await Food.findById(foodId);
    if (!existingFood) return res.status(404).json({ error: 'ไม่พบรายการอาหาร' });

    let imagePath = existingFood.image;
    if (req.file) {
      if (imagePath) {
        const oldImagePath = path.join(__dirname, 'uploads', path.basename(imagePath));
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      imagePath = `/uploads/${req.file.filename}`;
    }

    existingFood.name = name;
    existingFood.category = category;
    existingFood.instructions = instructions;
    existingFood.price = price;
    existingFood.image = imagePath;

    const updatedFood = await existingFood.save();
    res.json({ message: 'อัพเดทรายการอาหารสำเร็จ', food: updatedFood });

  } catch (err) {
    console.error('Update food error:', err);
    res.status(500).json({ error: 'ไม่สามารถอัพเดทรายการอาหารได้' });
  }
});

app.delete('/api/food/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ error: 'ไม่พบรายการอาหาร' });

    if (food.image) {
      const imagePath = path.join(__dirname, food.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Food.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบรายการอาหารและรูปภาพสำเร็จ' });
  } catch (err) {
    console.error('Delete food error:', err);
    res.status(500).json({ error: 'ไม่สามารถลบรายการอาหารได้' });
  }
});

// --- Order Routes ---
app.post('/api/orders', async (req, res) => {
  try {
    const { items, tableName } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุรายการอาหาร' });
    }

    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขโต๊ะ' });
    }

    // Validate each item in the order
    for (const item of items) {
      if (!item.id || !item.name || !item.price || !item.quantity) {
        return res.status(400).json({ error: 'ข้อมูลรายการอาหารไม่ครบถ้วน' });
      }
      if (item.quantity < 1) {
        return res.status(400).json({ error: 'จำนวนอาหารต้องมากกว่า 0' });
      }
    }

    // Check if there's an existing order for this table
    let existingOrder = await Order.findOne({ 
      tableName: tableName,
      status: { $in: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ"] }
    });

    if (existingOrder) {
      // Combine quantities for same menu items
      const existingItems = existingOrder.items;
      const newItems = items;

      // Create a map of existing items by their id
      const itemMap = new Map();
      existingItems.forEach(item => {
        itemMap.set(item.id, item);
      });

      // Update quantities for existing items or add new items
      newItems.forEach(newItem => {
        if (itemMap.has(newItem.id)) {
          // If item exists, update quantity
          const existingItem = itemMap.get(newItem.id);
          existingItem.quantity += newItem.quantity;
        } else {
          // If item is new, add it to the order
          existingItems.push(newItem);
        }
      });

      await existingOrder.save();
      res.json({ message: 'เพิ่มรายการอาหารสำเร็จ!', order: existingOrder });
    } else {
      // Create new order if no existing order found
      const newOrder = new Order({ 
        tableName, 
        items, 
        status: "รอการเตรียม",
        time: new Date()
      });
      await newOrder.save();
      res.status(201).json({ message: 'สั่งอาหารสำเร็จ!', order: newOrder });
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'ไม่สามารถบันทึกคำสั่งซื้อได้' });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ time: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลคำสั่งซื้อได้' });
  }
});

app.get('/api/orders/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;

    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขโต๊ะ' });
    }

    const order = await Order.findOne({ 
      tableName: tableName,
      status: { $in: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ"] }
    }).sort({ time: -1 });

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    res.json(order);
  }
  catch (err) {
    console.error('Get order by table name error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลคำสั่งซื้อได้' });
  }
});

app.put('/api/orders/:tableName/status', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { status } = req.body;

    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขโต๊ะ' });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุสถานะ' });
    }

    // Validate status values
    const validStatuses = ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ", "เสร็จสิ้น"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const order = await Order.findOne({ 
      tableName: tableName,
      status: { $in: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ", "เสร็จสิ้น"] }
    }).sort({ time: -1 });

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }

    order.status = status;
    await order.save();
    
    res.json({ 
      message: 'อัพเดทสถานะคำสั่งซื้อสำเร็จ', 
      order 
    });
  }
  catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'ไม่สามารถอัพเดทสถานะคำสั่งซื้อได้' });
  }
});

app.delete('/api/orders/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;

    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขโต๊ะ' });
    }

    const order = await Order.findOneAndDelete({ 
      tableName: tableName,
      status: { $in: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ"] }
    });

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    res.json({ message: 'ลบคำสั่งซื้อสำเร็จ', order });
  }
  catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'ไม่สามารถลบคำสั่งซื้อได้' });
  }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 เซิร์ฟเวอร์ทำงานที่ http://localhost:${PORT}`);
});
