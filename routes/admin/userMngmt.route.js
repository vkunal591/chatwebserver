import express from "express";
import {
  registerUser,
  updateBlockStatus,
  deleteUser,
  updateUser,
  updatePassword,
  getUserList,
  getUserById,
  getOnlineUser,
  getOfflineUser,
  searchUserByName,
} from "../../controllers/admin/userMngmt.controller.js";
import { isAdmin } from "../../middleware/isAdmin.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
const router = express.Router();


router.route("/register").post(authMiddleware,isAdmin, registerUser);
router
  .route("/update-block-status/:id")
  .patch(authMiddleware,isAdmin, updateBlockStatus);
router.route("/delete-user/:id").delete(authMiddleware,isAdmin, deleteUser);
router.route("/update-user/:id").patch(authMiddleware,isAdmin, updateUser);
router
  .route("/update-password/:id")
  .patch(authMiddleware,isAdmin, updatePassword);
router.route("/user-list").get(authMiddleware,isAdmin, getUserList);
router.route("/user-byid/:id").get(authMiddleware,isAdmin, getUserById);
router.route("/online-user").get(authMiddleware,isAdmin, getOnlineUser);
router.route("/offline-user").get(authMiddleware,isAdmin, getOfflineUser);
router.route("/search-user").post(authMiddleware,isAdmin, searchUserByName);


export default router;