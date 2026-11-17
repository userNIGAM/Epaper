import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate, requireRole } from "../middleware/auth.js";
import { documentUpload } from "../middleware/upload.js";
import {
  deleteMyDocument,
  downloadMyDocument,
  getMyGeneratedDocuments,
  getMyKyc,
  saveMyKyc,
  submitMyKyc,
  uploadMyDocument,
} from "../controllers/kycController.js";

const router = Router();
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many document uploads. Try again later." },
});

router.use(authenticate, requireRole("student"));
router.get("/me", getMyKyc);
router.post("/", saveMyKyc);
router.put("/me", saveMyKyc);
router.post("/documents/upload", uploadLimiter, documentUpload.single("file"), uploadMyDocument);
router.delete("/documents/:documentId", deleteMyDocument);
router.get("/documents/:documentId/download", downloadMyDocument);
router.post("/submit", submitMyKyc);
router.get("/generated-documents", getMyGeneratedDocuments);

export default router;
