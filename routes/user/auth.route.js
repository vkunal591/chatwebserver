import express from "express";
import {
  validateToken,
  loginUser,
  LogoutUser,
} from "../../controllers/user/auth.controller.js";
const router = express.Router();
import { authMiddleware } from "../../middleware/authMiddleware.js";


router.route("/validate-token").get(validateToken);

router.route("/login").post(loginUser);

router.route("/logout").post(authMiddleware,LogoutUser);


export default router;