import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { authenticate, requireRole } from "../middleware/auth.js";
import { documentUpload, fontUpload } from "../middleware/upload.js";
import {
  addInternalNote,
  downloadCitizenshipTemplate,
  downloadGeneratedDocument,
  downloadKycDocument,
  generateCitizenshipDraft,
  getCitizenshipTemplate,
  getKycProfile,
  listKyc,
  requestCorrection,
  reviewDocument,
  setKycStatus,
  updateCitizenshipTemplate,
  uploadCitizenshipFont,
  uploadCitizenshipTemplate,
  verifyKyc,
} from "../controllers/adminKycController.js";

const router = Router();
router.param("kycId", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid KYC profile identifier." });
    return;
  }
  next();
});
router.param("documentId", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid document identifier." });
    return;
  }
  next();
});
router.use(authenticate, requireRole("admin"));
const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sensitive KYC actions. Try again later." },
});
router.get("/", listKyc);
router.get("/citizenship-template", getCitizenshipTemplate);
router.get("/citizenship-template/asset", downloadCitizenshipTemplate);
router.post("/citizenship-template", adminActionLimiter, documentUpload.single("file"), uploadCitizenshipTemplate);
router.post("/citizenship-template/font", adminActionLimiter, fontUpload.single("file"), uploadCitizenshipFont);
router.put("/citizenship-template", updateCitizenshipTemplate);
router.get("/:kycId", getKycProfile);
router.get("/:kycId/generated-documents/:documentId/download", downloadGeneratedDocument);
router.get("/:kycId/documents/:documentId/download", downloadKycDocument);
router.patch("/:kycId/documents/:documentId/review", reviewDocument);
router.patch("/:kycId/status", setKycStatus);
router.post("/:kycId/request-correction", adminActionLimiter, requestCorrection);
router.post("/:kycId/notes", addInternalNote);
router.post("/:kycId/verify", adminActionLimiter, verifyKyc);
router.post("/:kycId/generate-citizenship-draft", adminActionLimiter, generateCitizenshipDraft);

export default router;
