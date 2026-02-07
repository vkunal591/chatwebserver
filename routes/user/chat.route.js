
import express from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js"
import {
  addFriend,
  getFriends,
  getFriendById,
  uploadMedia,
  searchFriendByName,
} from "../../controllers/user/chat.controller.js";
const router = express.Router();

router.route("/friends").post(authMiddleware, addFriend);

router.route("/friends").get(authMiddleware, getFriends);

router.route("/messages/:friendId").get(authMiddleware, getFriendById);

router
  .route("/upload")
  .post(authMiddleware, upload.single("file"), uploadMedia);

    router.route("/filter-friend").get(authMiddleware, searchFriendByName);
  
export default router;