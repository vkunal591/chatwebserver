import User from "../../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"

export const validateToken= async (req, res) => {
  const authHeader = req.header("Authorization");
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).json({ valid: false, message: "No token provided" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // same key used during login
    console.log(decoded);
    const user = await User.findById(decoded.id).select("_id username");
    console.log(user);
    // if (!req.user) return res.status(401).json({ error: "User not found" });

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
}

export const loginUser= async (req, res) => {
  const { username, password } = req.body;
  try {
 
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    if (user.isBlocked === true) {
      return res.status(400).json({ error: "User blocked" });
    }
    user.status = "online";
    await user.save();
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
   return res.json({
     token,
     user: {
       id: user._id,
       username: user.username,
       role: user.role, 
     },
   });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}

export const LogoutUser = async (req, res) => {
  try {
     const user = await User.findOne({ _id:req.user.id });
     if (!user) {
       return res.status(400).json({ error: "Unauthorized" });
     }
     user.status = "offline";
     await user.save();
    return res.json({ message:"logout user successfully!" });
  } catch (error) {
      return res.status(500).json({ error: "Server error" });
  }
}