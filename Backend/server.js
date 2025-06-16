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

  // Reset default users on startup
  await User.deleteMany({ role: { $in: ['admin', 'chef', 'waiter'] } });

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = new User({
    username: 'admin',
    password: adminPassword,
    role: 'admin',
  });
  await admin.save();
  console.log('👑 Default admin user recreated: admin / admin123');

  // Create default chef user
  const chefPassword = await bcrypt.hash('chef123', 10);
  const chef = new User({
    username: 'chef',
    password: chefPassword,
    role: 'chef',
  });
  await chef.save();
  console.log('👨‍🍳 Default chef user recreated: chef / chef123');

  // Create default waiter user
  const waiterPassword = await bcrypt.hash('waiter123', 10);
  const waiter = new User({
    username: 'waiter',
    password: waiterPassword,
    role: 'waiter',
  });
  await waiter.save();
  console.log('👨‍💼 Default waiter user recreated: waiter / waiter123');
}).catch(err => console.error('❌ MongoDB connection error:', err));


app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign({ username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'เข้าสู่ระบบล้มเหลว' });
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

// Add new middleware for staff roles
function isStaff(req, res, next) {
  if (!['admin', 'chef', 'waiter'].includes(req.user.role)) {
    return res.status(403).json({ error: 'เฉพาะพนักงานเท่านั้น' });
  }
  next();
}

app.get('/api/users', authenticateToken, isStaff, async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'chef', 'waiter'] } }, '-password');
    const usersWithRoles = users.map(user => ({
      id: user._id,
      username: user.username,
      role: user.role,
      roleDisplay: user.role === 'admin' ? 'ผู้ดูแลระบบ' : 
                  user.role === 'chef' ? 'เชฟ' : 
                  'พนักงานเสิร์ฟ'
    }));
    res.json(usersWithRoles);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});

// Add this endpoint to get current user info
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }, '-password');
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      roleDisplay: user.role === 'admin' ? 'ผู้ดูแลระบบ' : 
                  user.role === 'chef' ? 'เชฟ' : 
                  'พนักงานเสิร์ฟ'
    });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' });
  }
});

// --- Menu Routes ---
app.get('/api/menu', authenticateToken, isStaff, async (req, res) => {
  try {
    const foodItems = await Food.find();
    res.json(foodItems);
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงรายการอาหารได้' });
  }
});

app.post('/api/food', authenticateToken, isStaff, upload.single('image'), async (req, res) => {
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

app.put('/api/food/:id', authenticateToken, isStaff, upload.single('image'), async (req, res) => {
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

app.delete('/api/food/:id', authenticateToken, isStaff, async (req, res) => {
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
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    // Filter orders based on user role
    if (req.user.role === 'admin') {
      // Admin can see all orders
      query = {};
    } else if (req.user.role === 'chef') {
      // Chef can only see orders that are not completed
      query = { status: { $in: ['รอการเตรียม', 'กำลังเตรียม', 'พร้อมเสิร์ฟ'] } };
    } else if (req.user.role === 'waiter') {
      // Waiter can only see orders that are ready to serve
      query = { status: 'พร้อมเสิร์ฟ' };
    } else {
      // Regular users can only see their own orders
      query = { userId: req.user.id };
    }

    const orders = await Order.find(query)
      .populate('userId', 'username')
      .populate('items.foodId', 'name price')
      .sort({ createdAt: -1 });

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

// Add SSE clients store
const clients = new Set();

// Function to send updates to all connected clients
const sendUpdateToClients = (data) => {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

// SSE endpoint for order status updates
app.get('/api/orders/events', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Add this client to the clients set
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  clients.add(newClient);

  // Remove client when connection closes
  req.on('close', () => {
    clients.delete(newClient);
  });
});

// Modify the status update endpoint to handle role-based permissions
app.put('/api/orders/:tableName/status', authenticateToken, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { status } = req.body;
    const userRole = req.user.role;

    // Define valid status transitions for each role
    const validTransitions = {
      chef: {
        from: ["รอการเตรียม", "กำลังเตรียม"],
        to: ["กำลังเตรียม", "พร้อมเสิร์ฟ"]
      },
      waiter: {
        from: ["พร้อมเสิร์ฟ"],
        to: ["เสร็จสิ้น"]
      },
      admin: {
        from: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ"],
        to: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ", "เสร็จสิ้น"]
      }
    };

    // Check if user has permission to update status
    if (!validTransitions[userRole]) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ในการอัพเดทสถานะ' });
    }

    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขโต๊ะ' });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'กรุณาระบุสถานะ' });
    }

    const order = await Order.findOne({ 
      tableName: tableName,
      status: { $in: ["รอการเตรียม", "กำลังเตรียม", "พร้อมเสิร์ฟ", "เสร็จสิ้น"] }
    }).sort({ time: -1 });

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }

    // Check if the status transition is valid for the user's role
    const roleTransitions = validTransitions[userRole];
    
    // Validate the status transition
    const isValidTransition = roleTransitions.from.includes(order.status) && 
                            roleTransitions.to.includes(status) &&
                            (
                              // For chef: can only move forward in the sequence
                              (userRole === 'chef' && 
                               ((order.status === 'รอการเตรียม' && status === 'กำลังเตรียม') ||
                                (order.status === 'กำลังเตรียม' && status === 'พร้อมเสิร์ฟ'))) ||
                              // For waiter: can only move from "พร้อมเสิร์ฟ" to "เสร็จสิ้น"
                              (userRole === 'waiter' && 
                               order.status === 'พร้อมเสิร์ฟ' && 
                               status === 'เสร็จสิ้น') ||
                              // Admin can do any transition
                              userRole === 'admin'
                            );

    if (!isValidTransition) {
      return res.status(403).json({ 
        error: `ไม่สามารถเปลี่ยนสถานะจาก "${order.status}" เป็น "${status}" ได้`,
        currentStatus: order.status,
        allowedTransitions: roleTransitions
      });
    }

    order.status = status;
    await order.save();
    
    // Broadcast the status update to all connected clients
    sendUpdateToClients({
      type: 'status_update',
      tableName,
      status,
      order,
      updatedBy: userRole
    });

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
