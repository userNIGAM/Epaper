import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import StudentKYC from "../models/StudentKYC.js";
import User from "../models/User.js";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
});

function issueSession(user, res) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    const error = new Error("JWT_SECRET must be configured with at least 32 characters.");
    error.status = 503;
    throw error;
  }
  const token = jwt.sign({ sub: user.id }, secret, { expiresIn: "8h", issuer: "student-kyc" });
  res.cookie("kyc_session", token, cookieOptions());
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export async function registerStudent(req, res) {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (name.length < 2 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid name and email address." });
  }
  if (password.length < 12 || password.length > 128) {
    return res.status(400).json({ error: "Password must be between 12 and 128 characters." });
  }
  if (phone && !/^[+0-9()\-\s]{6,30}$/.test(phone)) {
    return res.status(400).json({ error: "Enter a valid contact number." });
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: "Authentication is not configured." });
  }

  const user = new User({
    name,
    email,
    phone,
    role: "student",
    passwordHash: await bcrypt.hash(password, 12),
  });
  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    throw error;
  }
  await StudentKYC.create({ studentId: user.id, status: "Not Started" });
  return res.status(201).json({ user: issueSession(user, res) });
}

async function login(req, res, role) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: "Authentication is not configured." });
  }
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || user.role !== role || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  return res.json({ user: issueSession(user, res) });
}

export function loginStudent(req, res) {
  return login(req, res, "student");
}

export function loginAdmin(req, res) {
  return login(req, res, "admin");
}

export async function logout(_req, res) {
  res.clearCookie("kyc_session", { ...cookieOptions(), maxAge: undefined });
  return res.status(204).end();
}

export function currentUser(req, res) {
  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
    },
  });
}

export async function ensureSeedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password) throw new Error("Set both ADMIN_EMAIL and ADMIN_PASSWORD.");
  if (password.length < 16) throw new Error("ADMIN_PASSWORD must be at least 16 characters.");
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      name: process.env.ADMIN_NAME?.trim().slice(0, 120) || "KYC Administrator",
      email,
      role: "admin",
      passwordHash: await bcrypt.hash(password, 12),
    });
  } else if (existing.role !== "admin") {
    throw new Error("ADMIN_EMAIL is already assigned to a non-admin account.");
  }
}
