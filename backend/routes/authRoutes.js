import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth.js";
import {
  currentUser,
  loginAdmin,
  loginStudent,
  logout,
  registerStudent,
} from "../controllers/authController.js";

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
});

router.post("/register", loginLimiter, registerStudent);
router.post("/student/login", loginLimiter, loginStudent);
router.post("/admin/login", loginLimiter, loginAdmin);
router.post("/logout", logout);
router.get("/me", authenticate, currentUser);

export default router;
