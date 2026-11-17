import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { destroyPrivateAsset, downloadPrivateAsset, uploadPrivateAsset } from "../config/cloudinary.js";
import CitizenshipTemplate from "../models/CitizenshipTemplate.js";
import GeneratedDocument from "../models/GeneratedDocument.js";
import StudentKYC from "../models/StudentKYC.js";
import User from "../models/User.js";
import { completionFor } from "../services/kycService.js";
import { submissionMissing } from "../services/kycService.js";
import { validateDocumentBuffer, validateFontBuffer } from "../middleware/upload.js";

const allowedTemplateFields = new Set([
  "holderName",
  "dateOfBirth",
  "fatherName",
  "motherName",
  "grandfatherName",
  "address",
  "citizenshipNumber",
  "issueDate",
  "issueDistrict",
]);

function publicDocument(doc) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    educationId: doc.educationId,
    originalName: doc.originalName,
    bytes: doc.bytes,
    uploadedAt: doc.uploadedAt,
    status: doc.status,
    reviewerId: doc.reviewerId,
    comments: doc.comments,
  };
}

function publicKyc(kyc) {
  return {
    id: kyc.id,
    student: kyc.studentId
      ? {
          id: kyc.studentId.id,
          name: kyc.studentId.name,
          email: kyc.studentId.email,
          phone: kyc.studentId.phone,
        }
      : null,
    personal: kyc.personal,
    citizenship: kyc.citizenship,
    birthCertificate: kyc.birthCertificate,
    education: kyc.education,
    documents: kyc.documents.map(publicDocument),
    status: kyc.status,
    submittedAt: kyc.submittedAt,
    verifiedAt: kyc.verifiedAt,
    verifiedBy: kyc.verifiedBy,
    feedback: kyc.feedback,
    internalNotes: kyc.internalNotes,
    history: kyc.history,
    completion: completionFor(kyc),
    createdAt: kyc.createdAt,
    updatedAt: kyc.updatedAt,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inlineFilename(name) {
  return path.basename(name).replace(/[\r\n"\\]/g, "_").slice(0, 160);
}

function validateTemplateFields(fields) {
  if (!Array.isArray(fields) || fields.length > allowedTemplateFields.size) {
    const error = new Error("Provide valid field position settings.");
    error.status = 400;
    throw error;
  }
  const keys = new Set();
  return fields.map((field) => {
    if (
      !allowedTemplateFields.has(field?.key) ||
      keys.has(field.key) ||
      typeof field.label !== "string" ||
      !Number.isFinite(field.x) ||
      !Number.isFinite(field.y) ||
      !Number.isFinite(field.fontSize) ||
      !["left", "center", "right"].includes(field.alignment)
    ) {
      const error = new Error("One or more template field settings are invalid.");
      error.status = 400;
      throw error;
    }
    keys.add(field.key);
    return {
      key: field.key,
      label: field.label.trim().slice(0, 80),
      x: field.x,
      y: field.y,
      fontSize: field.fontSize,
      alignment: field.alignment,
    };
  });
}

function validatePhoto(photo) {
  const values = [photo?.x, photo?.y, photo?.width, photo?.height];
  if (
    values.some((value) => !Number.isFinite(value)) ||
    photo.x < 0 ||
    photo.x > 100 ||
    photo.y < 0 ||
    photo.y > 100 ||
    photo.width < 1 ||
    photo.width > 100 ||
    photo.height < 1 ||
    photo.height > 100 ||
    photo.x + photo.width > 100 ||
    photo.y + photo.height > 100
  ) {
    const error = new Error("Photo position and dimensions must be percentages within the template.");
    error.status = 400;
    throw error;
  }
  return { x: photo.x, y: photo.y, width: photo.width, height: photo.height };
}

export async function listKyc(req, res) {
  const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
  const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const statuses = ["Not Started", "Draft", "Submitted", "Under Review", "Correction Required", "Verified", "Rejected"];
  if (status && !statuses.includes(status)) {
    return res.status(400).json({ error: "Choose a valid KYC status filter." });
  }
  if (status) filter.status = status;

  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const users = await User.find({
      role: "student",
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).select("_id");
    filter.$or = [
      { "personal.fullName": regex },
      { "citizenship.number": regex },
      { studentId: { $in: users.map((user) => user._id) } },
    ];
  }

  const [records, total] = await Promise.all([
    StudentKYC.find(filter)
      .populate("studentId", "name email phone")
      .select("studentId personal citizenship status submittedAt verifiedAt updatedAt documents")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StudentKYC.countDocuments(filter),
  ]);
  return res.json({
    records: records.map((record) => ({
      id: record._id.toString(),
      student: record.studentId,
      name: record.personal?.fullName || record.studentId?.name || "Student",
      citizenshipNumber: record.citizenship?.number || "",
      status: record.status,
      documentCount: record.documents?.length || 0,
      submittedAt: record.submittedAt,
      verifiedAt: record.verifiedAt,
      updatedAt: record.updatedAt,
    })),
    page,
    limit,
    total,
  });
}

export async function getKycProfile(req, res) {
  if (!mongoose.isValidObjectId(req.params.kycId)) {
    return res.status(400).json({ error: "Invalid KYC profile identifier." });
  }
  const kyc = await StudentKYC.findById(req.params.kycId)
    .populate("studentId", "name email phone")
    .populate("verifiedBy", "name email")
    .populate("documents.reviewerId", "name email")
    .populate("internalNotes.authorId", "name email")
    .populate("history.actorId", "name email");
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  const generatedDocuments = await GeneratedDocument.find({ kycId: kyc.id })
    .select("type label createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ kyc: publicKyc(kyc), generatedDocuments });
}

export async function downloadKycDocument(req, res) {
  if (!mongoose.isValidObjectId(req.params.kycId) || !mongoose.isValidObjectId(req.params.documentId)) {
    return res.status(400).json({ error: "Invalid document identifier." });
  }
  const kyc = await StudentKYC.findById(req.params.kycId);
  const document = kyc?.documents.id(req.params.documentId);
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
  res.setHeader("Content-Disposition", `${disposition}; filename="${inlineFilename(document.originalName)}"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(buffer);
}

export async function downloadGeneratedDocument(req, res) {
  if (!mongoose.isValidObjectId(req.params.kycId) || !mongoose.isValidObjectId(req.params.documentId)) {
    return res.status(400).json({ error: "Invalid document identifier." });
  }
  const document = await GeneratedDocument.findOne({
    _id: req.params.documentId,
    kycId: req.params.kycId,
  });
  if (!document) return res.status(404).json({ error: "Generated document was not found." });
  const buffer = await downloadPrivateAsset(document.publicId, document.format, document.resourceType);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", buffer.length);
  const disposition = req.query.download === "1" ? "attachment" : "inline";
  res.setHeader("Content-Disposition", `${disposition}; filename="citizenship-sample-draft.pdf"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(buffer);
}

export async function reviewDocument(req, res) {
  if (!mongoose.isValidObjectId(req.params.kycId) || !mongoose.isValidObjectId(req.params.documentId)) {
    return res.status(400).json({ error: "Invalid document identifier." });
  }
  const { status, comments } = req.body || {};
  if (!["approved", "rejected"].includes(status) || typeof comments !== "string" || comments.length > 1000) {
    return res.status(400).json({ error: "Choose an approval decision and provide valid reviewer comments." });
  }
  const kyc = await StudentKYC.findById(req.params.kycId);
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  if (kyc.status === "Verified") {
    return res.status(409).json({ error: "Verified KYC profiles cannot be changed through document review." });
  }
  const document = kyc.documents.id(req.params.documentId);
  if (!document) return res.status(404).json({ error: "Document was not found." });
  document.status = status;
  document.comments = comments.trim();
  document.reviewerId = req.user.id;
  kyc.history.push({
    action: `Document ${status}`,
    status: kyc.status,
    comment: comments.trim(),
    actorId: req.user.id,
  });
  await kyc.save();
  return res.json({ document: publicDocument(document) });
}

export async function setKycStatus(req, res) {
  const { status, comment } = req.body || {};
  if (!["Under Review", "Rejected"].includes(status) || typeof comment !== "string" || comment.length > 1000) {
    return res.status(400).json({ error: "Choose a valid KYC status and provide a comment." });
  }
  const kyc = await StudentKYC.findById(req.params.kycId);
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  if (kyc.status === "Verified") {
    return res.status(409).json({ error: "Verified KYC profiles cannot be downgraded." });
  }
  if (!["Submitted", "Under Review"].includes(kyc.status)) {
    return res.status(409).json({ error: "Only submitted KYC profiles can be rejected or marked under review." });
  }
  if (status === "Rejected" && !comment.trim()) {
    return res.status(400).json({ error: "Add a reason before rejecting a KYC profile." });
  }
  kyc.status = status;
  kyc.history.push({ action: "Status updated", status, comment: comment.trim(), actorId: req.user.id });
  await kyc.save();
  return res.json({ status: kyc.status });
}

export async function requestCorrection(req, res) {
  const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";
  if (!comment || comment.length > 1000) {
    return res.status(400).json({ error: "Enter a correction request of up to 1000 characters." });
  }
  const kyc = await StudentKYC.findById(req.params.kycId);
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  if (!["Submitted", "Under Review", "Verified"].includes(kyc.status)) {
    return res.status(409).json({ error: "Only submitted or verified profiles can receive correction requests." });
  }
  if (kyc.status === "Verified") {
    kyc.verifiedAt = null;
    kyc.verifiedBy = null;
  }
  kyc.status = "Correction Required";
  kyc.feedback.push(comment);
  kyc.history.push({ action: "Correction requested", status: kyc.status, comment, actorId: req.user.id });
  await kyc.save();
  return res.json({ status: kyc.status, feedback: kyc.feedback });
}

export async function addInternalNote(req, res) {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text || text.length > 2000) {
    return res.status(400).json({ error: "Enter an internal note of up to 2000 characters." });
  }
  const kyc = await StudentKYC.findById(req.params.kycId);
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  kyc.internalNotes.push({ text, authorId: req.user.id });
  kyc.history.push({ action: "Internal note added", status: kyc.status, actorId: req.user.id });
  await kyc.save();
  return res.status(201).json({ note: kyc.internalNotes.at(-1) });
}

export async function verifyKyc(req, res) {
  const kyc = await StudentKYC.findById(req.params.kycId);
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  const completion = completionFor(kyc);
  const missing = submissionMissing(kyc);
  const unresolvedDocuments = kyc.documents.filter((doc) => doc.status !== "approved");
  if (!["Submitted", "Under Review"].includes(kyc.status) || completion.percentage !== 100 || missing.length || unresolvedDocuments.length) {
    return res.status(422).json({
      error: "Review a submitted KYC profile, complete all required fields, and approve every required document before verification.",
      missing,
      unresolvedDocuments: unresolvedDocuments.length,
    });
  }
  kyc.status = "Verified";
  kyc.verifiedAt = new Date();
  kyc.verifiedBy = req.user.id;
  kyc.history.push({ action: "KYC verified", status: kyc.status, actorId: req.user.id });
  await kyc.save();
  return res.json({ status: kyc.status, verifiedAt: kyc.verifiedAt });
}

export async function getCitizenshipTemplate(_req, res) {
  const template = await CitizenshipTemplate.findOne({ active: true })
    .select("-publicId -resourceType -format -updatedBy -fontAsset.publicId -fontAsset.resourceType -fontAsset.format")
    .lean();
  if (template) template.hasFont = Boolean(template.fontAsset?.publicId);
  return res.json({ template });
}

export async function downloadCitizenshipTemplate(_req, res) {
  const template = await CitizenshipTemplate.findOne({ active: true });
  if (!template) return res.status(404).json({ error: "No citizenship template has been configured." });
  const buffer = await downloadPrivateAsset(template.publicId, template.format, template.resourceType);
  res.setHeader("Content-Type", template.format === "pdf" ? "application/pdf" : `image/${template.format}`);
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Content-Disposition", "inline; filename=\"citizenship-template\"");
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(buffer);
}

export async function uploadCitizenshipTemplate(req, res) {
  const file = validateDocumentBuffer(req.file);
  let submittedFields;
  let submittedPhoto;
  try {
    submittedFields = JSON.parse(req.body?.fields || "[]");
    submittedPhoto = JSON.parse(req.body?.photo || "{}");
  } catch {
    return res.status(400).json({ error: "Template field settings must be valid JSON." });
  }
  const fields = validateTemplateFields(submittedFields);
  const photo = validatePhoto(submittedPhoto);
  const result = await uploadPrivateAsset(file.buffer, {
    folder: "student-kyc/templates",
    public_id: randomUUID(),
  });
  const oldTemplate = await CitizenshipTemplate.findOne({ active: true });
  const template = await CitizenshipTemplate.findOneAndUpdate(
    { active: true },
    {
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      fields,
      photo,
      updatedBy: req.user.id,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  if (oldTemplate && oldTemplate.publicId !== result.public_id) {
    await destroyPrivateAsset(oldTemplate.publicId, oldTemplate.resourceType);
  }
  return res.status(201).json({
    template: {
      id: template.id,
      fields: template.fields,
      photo: template.photo,
      hasFont: Boolean(template.fontAsset?.publicId),
      updatedAt: template.updatedAt,
    },
  });
}

export async function uploadCitizenshipFont(req, res) {
  const file = validateFontBuffer(req.file);
  const template = await CitizenshipTemplate.findOne({ active: true });
  if (!template) return res.status(409).json({ error: "Upload a citizenship template before adding a font." });
  const uploaded = await uploadPrivateAsset(file.buffer, {
    folder: "student-kyc/templates",
    public_id: randomUUID(),
    resource_type: "raw",
    format: file.originalname.toLowerCase().endsWith(".otf") ? "otf" : "ttf",
  });
  const previous = template.fontAsset?.publicId
    ? { publicId: template.fontAsset.publicId, resourceType: template.fontAsset.resourceType }
    : null;
  template.fontAsset = {
    publicId: uploaded.public_id,
    format: uploaded.format,
    resourceType: uploaded.resource_type,
  };
  template.updatedBy = req.user.id;
  await template.save();
  if (previous) await destroyPrivateAsset(previous.publicId, previous.resourceType);
  return res.json({ hasFont: true, updatedAt: template.updatedAt });
}

export async function updateCitizenshipTemplate(req, res) {
  const fields = validateTemplateFields(req.body?.fields);
  const photo = validatePhoto(req.body?.photo);
  const template = await CitizenshipTemplate.findOneAndUpdate(
    { active: true },
    { fields, photo, updatedBy: req.user.id },
    { new: true, runValidators: true },
  );
  if (!template) return res.status(404).json({ error: "Upload a citizenship template before configuring it." });
  return res.json({ fields: template.fields, photo: template.photo, updatedAt: template.updatedAt });
}

const templateValues = (kyc) => ({
  holderName: kyc.citizenship?.fullName || kyc.personal?.fullName || "",
  dateOfBirth: kyc.citizenship?.dateOfBirth || kyc.personal?.dateOfBirth || "",
  fatherName: kyc.personal?.fatherName || "",
  motherName: kyc.personal?.motherName || "",
  grandfatherName: kyc.personal?.grandfatherName || "",
  address: [kyc.personal?.permanentAddress, kyc.personal?.municipality, kyc.personal?.district].filter(Boolean).join(", "),
  citizenshipNumber: kyc.citizenship?.number || "",
  issueDate: kyc.citizenship?.issueDate || "",
  issueDistrict: kyc.citizenship?.issueDistrict || "",
});

export async function generateCitizenshipDraft(req, res) {
  const kyc = await StudentKYC.findById(req.params.kycId);
  if (!kyc) return res.status(404).json({ error: "KYC profile was not found." });
  const template = await CitizenshipTemplate.findOne({ active: true });
  if (!template) return res.status(409).json({ error: "Configure a citizenship template before generating a draft." });
  const photo = kyc.documents.find((doc) => doc.type === "profile_photo");
  if (!photo) return res.status(422).json({ error: "Upload a student photograph before generating a draft." });

  const templateBytes = await downloadPrivateAsset(template.publicId, template.format, template.resourceType);
  const pdf = template.format === "pdf" ? await PDFDocument.load(templateBytes) : await PDFDocument.create();
  if (template.format !== "pdf") {
    const image =
      template.format === "png"
        ? await pdf.embedPng(templateBytes)
        : await pdf.embedJpg(templateBytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  const pages = pdf.getPages();
  if (!pages.length) {
    const error = new Error("The template does not contain a usable page.");
    error.status = 422;
    throw error;
  }

  let font;
  if (template.fontAsset?.publicId) {
    const fontBytes = await downloadPrivateAsset(
      template.fontAsset.publicId,
      template.fontAsset.format,
      template.fontAsset.resourceType,
    );
    pdf.registerFontkit(fontkit);
    font = await pdf.embedFont(fontBytes, { subset: true });
  } else {
    font = await pdf.embedFont(StandardFonts.Helvetica);
  }
  const page = pages[0];
  const width = page.getWidth();
  const height = page.getHeight();
  const values = templateValues(kyc);
  for (const field of template.fields) {
    const text = values[field.key];
    if (!text) continue;
    const x = (width * field.x) / 100;
    const y = height - (height * field.y) / 100;
    const textWidth = font.widthOfTextAtSize(text, field.fontSize);
    const drawX =
      field.alignment === "center" ? x - textWidth / 2 : field.alignment === "right" ? x - textWidth : x;
    page.drawText(text, { x: Math.max(0, drawX), y: Math.max(0, y), size: field.fontSize, font, color: rgb(0.08, 0.08, 0.08) });
  }

  const photoBytes = await downloadPrivateAsset(photo.publicId, photo.format, photo.resourceType);
  const embeddedPhoto =
    photo.format === "png" ? await pdf.embedPng(photoBytes) : await pdf.embedJpg(photoBytes);
  page.drawImage(embeddedPhoto, {
    x: (width * template.photo.x) / 100,
    y: height - (height * (template.photo.y + template.photo.height)) / 100,
    width: (width * template.photo.width) / 100,
    height: (height * template.photo.height) / 100,
  });

  for (const pdfPage of pages) {
    const pageWidth = pdfPage.getWidth();
    const pageHeight = pdfPage.getHeight();
    pdfPage.drawText("DRAFT - INTERNAL USE ONLY - NOT AN OFFICIAL DOCUMENT", {
      x: 18,
      y: 18,
      size: 9,
      font,
      color: rgb(0.7, 0.05, 0.05),
      rotate: degrees(0),
    });
    pdfPage.drawText("SAMPLE - NOT ISSUED BY A GOVERNMENT AUTHORITY", {
      x: pageWidth * 0.14,
      y: pageHeight * 0.48,
      size: 17,
      font,
      color: rgb(0.75, 0.1, 0.1),
      rotate: degrees(25),
      opacity: 0.45,
    });
  }

  const generated = Buffer.from(await pdf.save());
  const uploaded = await uploadPrivateAsset(generated, {
    folder: `student-kyc/${kyc.studentId}/generated`,
    public_id: randomUUID(),
    resource_type: "raw",
    format: "pdf",
  });
  const document = await GeneratedDocument.create({
    studentId: kyc.studentId,
    kycId: kyc.id,
    type: "citizenship-draft",
    publicId: uploaded.public_id,
    format: uploaded.format,
    resourceType: uploaded.resource_type,
    createdBy: req.user.id,
  });
  kyc.history.push({ action: "Citizenship sample draft generated", status: kyc.status, actorId: req.user.id });
  await kyc.save();
  return res.status(201).json({
    document: { id: document.id, label: document.label, createdAt: document.createdAt },
  });
}
