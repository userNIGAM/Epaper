import { randomUUID } from "node:crypto";
import StudentKYC from "../models/StudentKYC.js";

const personalFields = {
  fullName: 120,
  firstName: 60,
  middleName: 60,
  lastName: 60,
  dateOfBirth: 40,
  gender: 30,
  nationality: 60,
  fatherName: 120,
  motherName: 120,
  grandfatherName: 120,
  maritalStatus: 30,
  phone: 30,
  email: 254,
  permanentAddress: 240,
  temporaryAddress: 240,
  district: 100,
  municipality: 120,
  wardNumber: 20,
  passportNumber: 40,
  passportIssueDate: 40,
  passportExpiryDate: 40,
};

const citizenshipFields = {
  number: 80,
  issueDate: 40,
  issueDistrict: 100,
  issueOffice: 120,
  fullName: 120,
  dateOfBirth: 40,
};

const birthFields = {
  registrationNumber: 80,
  dateOfBirth: 40,
  district: 100,
  municipality: 120,
};

const educationFields = {
  level: 80,
  institution: 160,
  board: 160,
  registrationNumber: 80,
  symbolNumber: 80,
  passedYear: 20,
  gpa: 30,
  major: 100,
};

function cleanFields(value, allowedFields) {
  const clean = {};
  for (const [field, maxLength] of Object.entries(allowedFields)) {
    const fieldValue = value?.[field];
    if (typeof fieldValue === "string") {
      clean[field] = fieldValue.trim().slice(0, maxLength);
    } else {
      clean[field] = "";
    }
  }
  return clean;
}

export function sanitizeKycPayload(body) {
  const education = Array.isArray(body?.education) ? body.education : [];
  if (education.length > 20) {
    const error = new Error("You can add up to 20 education records.");
    error.status = 400;
    throw error;
  }
  return {
    personal: cleanFields(body?.personal, personalFields),
    citizenship: cleanFields(body?.citizenship, citizenshipFields),
    birthCertificate: cleanFields(body?.birthCertificate, birthFields),
    education: education.map((record) => ({
      recordId:
        typeof record?.recordId === "string" &&
        /^[A-Za-z0-9_-]{1,80}$/.test(record.recordId)
          ? record.recordId
          : randomUUID(),
      ...cleanFields(record, educationFields),
    })),
  };
}

export function validateKycPayload(payload) {
  const email = payload.personal.email;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Enter a valid KYC email address.");
    error.status = 400;
    throw error;
  }
  const phone = payload.personal.phone;
  if (phone && !/^[+0-9()\-\s]{6,30}$/.test(phone)) {
    const error = new Error("Enter a valid contact number.");
    error.status = 400;
    throw error;
  }
  const dateValues = [
    payload.personal.dateOfBirth,
    payload.personal.passportIssueDate,
    payload.personal.passportExpiryDate,
    payload.citizenship.issueDate,
    payload.citizenship.dateOfBirth,
    payload.birthCertificate.dateOfBirth,
  ].filter(Boolean);
  if (
    dateValues.some(
      (value) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value,
    )
  ) {
    const error = new Error("Enter dates using the valid calendar date format.");
    error.status = 400;
    throw error;
  }
  const issueDate = payload.personal.passportIssueDate;
  const expiryDate = payload.personal.passportExpiryDate;
  if (issueDate && expiryDate && expiryDate <= issueDate) {
    const error = new Error("Passport expiry date must be after its issue date.");
    error.status = 400;
    throw error;
  }
  return payload;
}

export function completionFor(kyc) {
  const missing = submissionMissing(kyc);
  const total = 6;
  const completed = total - Math.min(total, missing.length);
  return {
    percentage: Math.round((completed / total) * 100),
    completed,
    total,
    missing,
  };
}

export function submissionMissing(kyc) {
  const docs = kyc.documents || [];
  const personal = kyc.personal || {};
  const citizenship = kyc.citizenship || {};
  const birth = kyc.birthCertificate || {};
  const education = kyc.education || [];
  const missing = [];

  if (
    !personal.fullName ||
    !personal.firstName ||
    !personal.lastName ||
    !personal.dateOfBirth ||
    !personal.gender ||
    !personal.nationality ||
    !personal.fatherName ||
    !personal.motherName ||
    !personal.grandfatherName ||
    !personal.maritalStatus ||
    !personal.phone ||
    !personal.email ||
    !personal.permanentAddress ||
    !personal.temporaryAddress ||
    !personal.district ||
    !personal.municipality ||
    !personal.wardNumber
  ) {
    missing.push("Personal information");
  }
  if (
    !citizenship.number ||
    !citizenship.issueDate ||
    !citizenship.issueDistrict ||
    !citizenship.issueOffice ||
    !citizenship.fullName ||
    !citizenship.dateOfBirth
  ) {
    missing.push("Citizenship information");
  }
  if (!docs.some((doc) => doc.type === "citizenship_front")) missing.push("Citizenship front document");
  if (!docs.some((doc) => doc.type === "citizenship_back")) missing.push("Citizenship back document");
  if (
    !birth.registrationNumber ||
    !birth.dateOfBirth ||
    !birth.district ||
    !birth.municipality ||
    !docs.some((doc) => doc.type === "birth_certificate")
  ) {
    missing.push("Birth certificate information and document");
  }
  if (
    !education.length ||
    education.some(
      (record) =>
        !record.level ||
        !record.institution ||
        !record.board ||
        !record.registrationNumber ||
        !record.symbolNumber ||
        !record.passedYear ||
        !record.gpa ||
        !record.major ||
        !docs.some((doc) => doc.type === "education_transcript" && doc.educationId === record.recordId) ||
        !docs.some((doc) => doc.type === "education_character" && doc.educationId === record.recordId),
    )
  ) {
    missing.push("Education records, transcripts, and character certificates");
  }
  return missing;
}

export async function getOrCreateKyc(studentId) {
  let kyc = await StudentKYC.findOne({ studentId });
  if (!kyc) {
    try {
      kyc = await StudentKYC.create({ studentId, status: "Not Started" });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      kyc = await StudentKYC.findOne({ studentId });
    }
  }
  return kyc;
}

export function canStudentEdit(kyc) {
  return ["Not Started", "Draft", "Correction Required", "Rejected"].includes(kyc.status);
}

export function requireEditable(kyc) {
  if (!canStudentEdit(kyc)) {
    const error = new Error("This KYC record is locked while it is under review or verified.");
    error.status = 409;
    throw error;
  }
}
