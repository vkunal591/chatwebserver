import User from "../../models/User.js";
import bcrypt from "bcryptjs";


export const registerUser = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Please fill all required fields" });
  }
  console.log("user data",{ username, password });
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: "Username taken" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      email: req.body.email ?? "traptipatel12@gmail.com",
      status: req.body.status ?? "offline",
      isBlocked: req.body.isBlocked ?? false,
    });
    console.log("user ",user);
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (error) {
    res.status(500).json({ error: error ?? "Server error" });
  }
};

export const updateBlockStatus = async (req, res) => {
  try {
    const userID = req.params.id;
    if (!userID) {
      res.status(400).json({ message: "User ID required" });
    }
    const user = await User.findOne({ _id: userID });
    if (!user) {
      res.status(400).json({ message: "User not found" });
    }
   
    const { isBlocked } = req.body;

      await User.findByIdAndUpdate(
        { _id: userID },
        { isBlocked },
        { new: true },
      );
    await user.save();

    res.status(200).json({ message: "Block status Updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: error ?? "Server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userID = req.params.id;
    if (!userID) {
     return res.status(400).json({ message: "User ID required" });
    }
    const isUserDeleted = await User.findOneAndDelete({ _id: userID });
    if (!isUserDeleted) {
     return res.status(400).json({ message: "User deletion error" });
    }
  return res.status(200).json({ message: "User deleted successfully!" });
  } catch (error) {
  return res.status(500).json({ error: error ?? "Server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userID = req.params.id;
    if (!userID) {
      return res.status(400).json({ message: "User ID required" });
    }
    const user = await User.findOne({ _id: userID });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    user.email = req.body.email ?? user.email;
    await user.save();
    return res.status(200).json({ message: "User updated successfully!",data:user });
  } catch (error) {
    return res.status(500).json({ error: error ?? "Server error" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const userID = req.params.id;
    const { password } = req.body;
     if (!password) {
       res.status(400).json({ message: "Missing password" });
     }
        if (!userID) {
          res.status(400).json({ message: "User ID required" });
        }
        const user = await User.findOne({ _id: userID });
        if (!user) {
          res.status(400).json({ message: "User not found" });
    }
    const hashedPass = await bcrypt.hash(password, 10);
    user.password = hashedPass;
    await user.save();
        res.status(200).json({ message: "User password updated successfully!" });
  } catch (error) {
        res.status(500).json({ error: error ?? "Server error" });
  }
}

export const getUserList = async (req, res) => {
  try {
     const userList = await User.find({role:"user"});
     if (!userList || userList.length==0) {
      return res.status(400).json({ message: "Admin not found or user list empty" });
    }   
    console.log(userList);
    
     return res
       .status(200)
       .json({ message: "User list fetched successfully!", data: userList });
  } catch (error) {
    return res.status(500).json({ error: error ?? "Server error" });
  }
}

export const getUserById = async (req, res) => {
  try {
    const userID = req.params.id;
    if (!userID) {
      res.status(400).json({ message: "User ID required" });
    }
    const user = await User.findOne({ _id: userID });
    if (!user) {
      res.status(400).json({ message: "User not found" });
    }
    res
      .status(200)
      .json({ message: "User get by Id successfully!", data: user });
  } catch (error) {
    res.status(500).json({ error: error ?? "Server error" });
  }
};

export const getOnlineUser = async (req, res) => {
  try {
    const userList = await User.find({ createdBy: req.user.id,status:"online" });
    if (!userList || userList.length == 0) {
      res.status(400).json({ message: "Admin not found or user list empty" });
    }
    res
      .status(200)
      .json({ message: "Online User list fetched successfully!", data: userList });
  } catch (error) {
    res.status(500).json({ error: error ?? "Server error" });
  }
}

export const getOfflineUser = async (req, res) => {
  try {
    const userList = await User.find({
      createdBy: req.user.id,
      status: "offline",
    });
    if (!userList || userList.length == 0) {
      res.status(400).json({ message: "Admin not found or user list empty" });
    }
    res
      .status(200)
      .json({
        message: "Offline User list fetched successfully!",
        data: userList,
      });
  } catch (error) {
    res.status(500).json({ error: error ?? "Server error" });
  }
};

export const searchUserByName = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username || !username.trim()) {
      return res.status(400).json({
        error: "Search value is required",
      });
    }

    const users = await User.find({
      // createdBy: req.user.id,
      username: { $regex: username, $options: "i" },
    });

    if (users.length === 0) {
      return res.status(404).json({
        error: "No users found",
      });
    }

    return res.status(200).json({
      message: "Users found successfully",
      data: users,
    });
  } catch (error) {
    console.error("Search user error:", error);
    return res.status(500).json({
      error: "Server error",
    });
  }
};  




