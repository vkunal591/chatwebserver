
import Message from "../../models/Message.js";
import User from "../../models/User.js";


export const addFriend=async (req, res) => {
  const { friendUsername } = req.body;
  console.log("start========",friendUsername);
  
  try {
    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ error: "User not found" });
    const user = await User.findById(req.user.id);

    if (!Array.isArray(user.friends)) {
      user.friends = [];
    }

    if (user.friends.includes(friend._id.toString())) {
      return res.status(400).json({ error: "Already friends" });
    }
    
    user.friends.push(friend._id);
    friend.friends.push(user._id);

    await friend.save();
    await user.save();
    res.json({ message: "Friend added", friend });
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: "Server error" });
  }
}

export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "friends",
      "username status",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: user.friends || [],
    });
  } catch (error) {
    console.error("Get friends error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      data: [],
    });
  }
};

export const getFriendById=async (req, res) => {
  try {
  

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.friendId },
        { sender: req.params.friendId, receiver: req.user.id },
      ],
    }).sort({ timestamp: 1 });
   
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}

export const uploadMedia=async(req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.json({
    url: fileUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
  });
}

export const searchFriendByName = async () => {
  try {
    const {name} = req.query;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const user = await User.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    
    const friend = await User.find({
      _id: { $in: user.friends },
      username: { $regex: name, $options: 'i' }
    }).select("username _id");
    
    return res.status(200).json({ message: "Friend fetched", data: friend });
  } catch (error) {
    console.log(error);   
  }
}