import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import Message from "./models/Message.js";
// const { decode } = require("punycode");
// const { log } = require("console");
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/user/auth.route.js"
import chatRoutes from "./routes/user/chat.route.js";
import userManagementRoute from "./routes/admin/userMngmt.route.js";

dotenv.config({
  path:'./.env'
})


const app = express();
const server = http.createServer(app);
const io =new Server(server, {
  cors: {
    origin: [
      "*",
      "http://localhost:3000",
      "http://192.168.195.2:3000",
      "https://chatwebserver-tau.vercel.app",
    ],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use('/api', userRoutes);
app.use('/api', chatRoutes);
app.use("/api", userManagementRoute);
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



server.listen(5000, async () => {
  connectDB();
  console.log("Server running on port 5000")
});
