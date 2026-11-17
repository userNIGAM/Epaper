import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.kyc_session;
    if (!token) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      return res.status(503).json({ error: "Authentication is not configured." });
    }

    const payload = jwt.verify(token, secret, { issuer: "student-kyc" });
    const user = await User.findById(payload.sub).select("_id email name phone role");
    if (!user) {
      return res.status(401).json({ error: "Your session is no longer valid." });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    return next(error);
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "You are not authorized to perform this action." });
    }
    return next();
  };
}
