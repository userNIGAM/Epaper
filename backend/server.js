import "./config/loadEnv.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import connectDb from "./config/connectDb.js";
import { ensureSeedAdmin } from "./controllers/authController.js";
import { guardRequestOrigin } from "./middleware/originGuard.js";
import adminKycRoutes from "./routes/adminKycRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";

const app = express();
const origins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: { directives: { frameAncestors: ["'self'", ...origins] } },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xFrameOptions: false,
  }),
);
app.use(guardRequestOrigin(origins));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/", (_req, res) => res.json({ service: "Student KYC API", status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/admin/kyc", adminKycRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "API endpoint was not found." }));
app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  if (error?.name === "MulterError" && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Each document must be no larger than 10 MB." });
  }
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message =
    status < 500
      ? error.message
      : "The request could not be completed. Please try again later.";
  if (status >= 500) console.error("KYC request failed:", error?.message || "Unknown error");
  return res.status(status).json({ error: message });
});

async function start() {
  await connectDb();
  await ensureSeedAdmin();
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Backend startup failed:", error.message);
  process.exitCode = 1;
});
