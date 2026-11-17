import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { destroyPrivateAsset, downloadPrivateAsset, uploadPrivateAsset } from "../config/cloudinary.js";
import GeneratedDocument from "../models/GeneratedDocument.js";
import StudentKYC from "../models/StudentKYC.js";
import {
  completionFor,
  getOrCreateKyc,
  requireEditable,
  sanitizeKycPayload,
  submissionMissing,
  validateKycPayload,
} from "../services/kycService.js";
import { validateDocumentBuffer } from "../middleware/upload.js";

const allowedDocumentTypes = new Set([
  "citizenship_front",
  "citizenship_back",
  "birth_certificate",
  "profile_photo",
  "education_transcript",
  "education_character",
  "education_provisional",
  "education_migration",
]);
const imageTypes = new Set(["image/jpeg", "image/png"]);

function publicDocument(doc) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    educationId: doc.educationId,
    originalName: doc.originalName,
    bytes: doc.bytes,
    uploadedAt: doc.uploadedAt,
    status: doc.status,
    comments: doc.comments,
  };
}

function publicKyc(kyc) {
  return {
    id: kyc.id,
    personal: kyc.personal,
    citizenship: kyc.citizenship,
    birthCertificate: kyc.birthCertificate,
    education: kyc.education,
    documents: kyc.documents.map(publicDocument),
    status: kyc.status,
    submittedAt: kyc.submittedAt,
    verifiedAt: kyc.verifiedAt,
    feedback: kyc.feedback,
    completion: completionFor(kyc),
    createdAt: kyc.createdAt,
    updatedAt: kyc.updatedAt,
  };
}

function inlineFilename(name) {
  return path.basename(name).replace(/[\r\n"\\]/g, "_").slice(0, 160);
}

export async function getMyKyc(req, res) {
  const kyc = await getOrCreateKyc(req.user.id);
  return res.json({ kyc: publicKyc(kyc) });
}

export async function saveMyKyc(req, res) {
  const kyc = await getOrCreateKyc(req.user.id);
  requireEditable(kyc);
  const payload = validateKycPayload(sanitizeKycPayload(req.body));
  const recordIds = payload.education.map((record) => record.recordId);
  if (new Set(recordIds).size !== recordIds.length) {
    return res.status(400).json({ error: "Education records must have unique identifiers." });
  }
  kyc.personal = payload.personal;
  kyc.citizenship = payload.citizenship;
  kyc.birthCertificate = payload.birthCertificate;
  kyc.education = payload.education;
  if (kyc.status === "Not Started") kyc.status = "Draft";
  kyc.history.push({ action: "Draft saved", status: kyc.status, actorId: req.user.id });
  await kyc.save();
  return res.json({ kyc: publicKyc(kyc) });
}

export async function uploadMyDocument(req, res) {
  const file = validateDocumentBuffer(req.file);
  const type = typeof req.body?.type === "string" ? req.body.type : "";
  const educationId = typeof req.body?.educationId === "string" ? req.body.educationId.slice(0, 80) : "";
  if (!allowedDocumentTypes.has(type)) {
    return res.status(400).json({ error: "Choose a supported KYC document type." });
  }
  if (type === "profile_photo" && !imageTypes.has(file.mimetype)) {
    return res.status(400).json({ error: "The student photograph must be a JPG or PNG image." });
  }
  if (type.startsWith("education_") && !educationId) {
    return res.status(400).json({ error: "Choose the education record for this document." });
  }

  const kyc = await getOrCreateKyc(req.user.id);
  requireEditable(kyc);
  if (type.startsWith("education_") && !kyc.education.some((record) => record.recordId === educationId)) {
    return res.status(400).json({ error: "Save the education record before uploading its documents." });
  }
  if (kyc.documents.length >= 50) {
    return res.status(413).json({ error: "This profile has reached the 50-document limit." });
  }

  const result = await uploadPrivateAsset(file.buffer, {
    folder: `student-kyc/${req.user.id}`,
    public_id: randomUUID(),
  });
  kyc.documents.push({
    type,
    educationId,
    originalName: inlineFilename(file.originalname),
    publicId: result.public_id,
    format: result.format,
    resourceType: result.resource_type,
    bytes: result.bytes,
    status: "pending",
  });
  await kyc.save();
  return res.status(201).json({
    document: publicDocument(kyc.documents.at(-1)),
    completion: completionFor(kyc),
  });
}

export async function deleteMyDocument(req, res) {
  if (!mongoose.isValidObjectId(req.params.documentId)) {
    return res.status(400).json({ error: "Invalid document identifier." });
  }
  const kyc = await StudentKYC.findOne({ studentId: req.user.id });
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  requireEditable(kyc);
  const document = kyc.documents.id(req.params.documentId);
  if (!document) return res.status(404).json({ error: "Document was not found." });
  await destroyPrivateAsset(document.publicId, document.resourceType);
  document.deleteOne();
  await kyc.save();
  return res.json({ completion: completionFor(kyc) });
}

export async function downloadMyDocument(req, res) {
  if (!mongoose.isValidObjectId(req.params.documentId)) {
    return res.status(400).json({ error: "Invalid document identifier." });
  }
  const [kyc, generated] = await Promise.all([
    StudentKYC.findOne({ studentId: req.user.id }),
    GeneratedDocument.findOne({ studentId: req.user.id, _id: req.params.documentId }),
  ]);
  const document = kyc?.documents.id(req.params.documentId) || generated;
  if (!document) return res.status(404).json({ error: "Document was not found." });

  const buffer = await downloadPrivateAsset(document.publicId, document.format, document.resourceType);
  const contentType =
    document.format === "pdf"
      ? "application/pdf"
      : document.format === "png"
        ? "image/png"
        : "image/jpeg";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", buffer.length);
  const disposition = req.query.download === "1" ? "attachment" : "inline";
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${inlineFilename(document.originalName || "document.pdf")}"`,
  );
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(buffer);
}

export async function submitMyKyc(req, res) {
  const kyc = await getOrCreateKyc(req.user.id);
  requireEditable(kyc);
  const missing = submissionMissing(kyc);
  if (missing.length) {
    return res.status(422).json({ error: "Complete the required information and documents before submitting.", missing });
  }

  kyc.status = "Submitted";
  kyc.submittedAt = new Date();
  kyc.feedback = [];
  kyc.history.push({ action: "Submitted for review", status: kyc.status, actorId: req.user.id });
  await kyc.save();
  return res.json({ kyc: publicKyc(kyc) });
}

export async function getMyGeneratedDocuments(req, res) {
  const documents = await GeneratedDocument.find({ studentId: req.user.id })
    .select("type label createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ documents });
}
