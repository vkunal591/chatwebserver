const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const User = require("./models/User");
const Message = require("./models/Message");
const multer = require('multer')
const path = require('path')
const fs = require("fs");
require("dotenv").config();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  },
});


const upload = multer({ storage });
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const DB_URL = process.env.DB_URL || "supersecretkey";


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['*', "http://localhost:3000", "http://192.168.224.2:3000",],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));


mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Middleware to verify JWT
const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, "secretkey");
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ Validate Token API
app.get("/api/validate-token", async (req, res) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ valid: false, message: "No token provided" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, "secretkey"); // same key used during login
    const user = await User.findById(decoded.id).select("_id username");
    if (!req.user) return res.status(401).json({ error: "User not found" });

    if (!user) {
      return res.status(404).json({ valid: false, message: "User not found" });
    }

    return res.json({
      valid: true,
      message: "Token is valid",
      user,
    });
  } catch (error) {
    // Token is invalid or expired
    return res.status(401).json({
      valid: false,
      message: "Invalid or expired token",
    });
  }
});


// Routes
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Username taken" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, "secretkey", { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/friends", authMiddleware, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ error: "User not found" });
    if (req.user.friends.includes(friend._id)) {
      return res.status(400).json({ error: "Already friends" });
    }
    req.user.friends.push(friend._id);
    await req.user.save();
    res.json({ message: "Friend added", friend });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/friends", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "username"
    );
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/messages/:friendId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.friendId },
        { sender: req.params.friendId, receiver: req.user._id },
      ],
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});




app.post("/api/upload", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: "No file uploaded" });

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.json({
    url: fileUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
  });
});


const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // --- Chat Messaging ---
  socket.on("sendMessage", async (msg) => {
    try {
      const {
        sender,
        receiver,
        content = "",
        mediaUrl = null,
        fileName = null,
        fileType = null,
        type = content ? "text" : "media",
      } = msg;

      const message = new Message({
        sender,
        receiver,
        content,
        mediaUrl,
        fileName,
        fileType,
        type,
      });

      await message.save();

      // Emit message to both sender and receiver
      const receiverSocket = onlineUsers.get(receiver);
      if (receiverSocket) io.to(receiverSocket).emit("receiveMessage", message);
      io.to(onlineUsers.get(sender)).emit("receiveMessage", message);
    } catch (error) {
      console.error("Message save error:", error);
    }
  });


  // --- Typing Indicator ---
  socket.on("typing", ({ to, from }) => {
    io.to(onlineUsers.get(to)).emit("typing", { from });
  });

  socket.on("stopTyping", ({ to, from }) => {
    io.to(onlineUsers.get(to)).emit("stopTyping", { from });
  });

  // --- WebRTC Call Signaling ---
  socket.on("callUser", ({ to, signal, from, type }) => {
    io.to(onlineUsers.get(to)).emit("incomingCall", { from, signal, type });
  });

  socket.on("answerCall", ({ to, signal }) => {
    io.to(onlineUsers.get(to)).emit("callAnswered", signal);
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(onlineUsers.get(to)).emit("iceCandidate", candidate);
  });

  socket.on("endCall", ({ to }) => {
    io.to(onlineUsers.get(to)).emit("callEnded");
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    }
    console.log("User disconnected:", socket.id);
  });
});




server.listen(5000, () => console.log("Server running on port 5000"));
