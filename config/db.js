import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    mongoose.connect(process.env.DB_URL, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
};
