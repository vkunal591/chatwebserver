import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String,default:"traptipatel12@gmail.com"},
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    },
  ],
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  status: {
    type: String,
    enum: ["online", "offline"],
    default: "offline",
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
});

const User = mongoose.model('User', userSchema);
export default User;