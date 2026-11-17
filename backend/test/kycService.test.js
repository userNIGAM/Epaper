import assert from "node:assert/strict";
import test from "node:test";
import { validateDocumentBuffer } from "../middleware/upload.js";
import { guardRequestOrigin } from "../middleware/originGuard.js";
import {
  canStudentEdit,
  completionFor,
  requireEditable,
  sanitizeKycPayload,
  submissionMissing,
  validateKycPayload,
} from "../services/kycService.js";

const completeProfile = () => {
  const recordId = "education-record-1";
  return {
    personal: {
      fullName: "A Student",
      firstName: "A",
      lastName: "Student",
      dateOfBirth: "2000-01-01",
      gender: "Other",
      nationality: "Nepali",
      fatherName: "Parent One",
      motherName: "Parent Two",
      grandfatherName: "Grandparent",
      maritalStatus: "Single",
      phone: "9800000000",
      email: "student@example.test",
      permanentAddress: "Address one",
      temporaryAddress: "Address two",
      district: "District",
      municipality: "Municipality",
      wardNumber: "1",
    },
    citizenship: {
      number: "01-01-00-00000",
      issueDate: "2020-01-01",
      issueDistrict: "District",
      issueOffice: "Office",
      fullName: "A Student",
      dateOfBirth: "2000-01-01",
    },
    birthCertificate: {
      registrationNumber: "0001",
      dateOfBirth: "2000-01-01",
      district: "District",
      municipality: "Municipality",
    },
    education: [{
      recordId,
      level: "SEE",
      institution: "School",
      board: "Board",
      registrationNumber: "R-1",
      symbolNumber: "S-1",
      passedYear: "2018",
      gpa: "3.5",
      major: "General",
    }],
    documents: [
      { type: "citizenship_front" },
      { type: "citizenship_back" },
      { type: "birth_certificate" },
      { type: "education_transcript", educationId: recordId },
      { type: "education_character", educationId: recordId },
    ],
  };
};

test("submission requires all identity and education sections", () => {
  const missing = submissionMissing({ personal: {}, citizenship: {}, birthCertificate: {}, education: [], documents: [] });
  assert.equal(missing.length, 6);
  assert.equal(completionFor({ personal: {}, citizenship: {}, birthCertificate: {}, education: [], documents: [] }).percentage, 0);
});

test("complete profile passes submission checks including documents for each education record", () => {
  const profile = completeProfile();
  assert.deepEqual(submissionMissing(profile), []);
  assert.equal(completionFor(profile).percentage, 100);
});

test("every education record needs its own transcript and character certificate", () => {
  const profile = completeProfile();
  profile.education.push({ ...profile.education[0], recordId: "education-record-2" });
  assert.deepEqual(submissionMissing(profile), ["Education records, transcripts, and character certificates"]);
});

test("payload sanitizer whitelists fields and bounds record count", () => {
  const safe = sanitizeKycPayload({
    personal: { fullName: "  Student  ", role: "admin" },
    education: [{ recordId: "record-1", level: "SEE", secret: "not accepted" }],
    status: "Verified",
  });
  assert.equal(safe.personal.fullName, "Student");
  assert.equal("role" in safe.personal, false);
  assert.equal("status" in safe, false);
  assert.equal("secret" in safe.education[0], false);
  assert.throws(() => sanitizeKycPayload({ education: Array(21).fill({}) }), /up to 20/);
});

test("KYC dates and contact details are validated before persistence", () => {
  const profile = completeProfile();
  profile.personal.dateOfBirth = "2024-02-31";
  assert.throws(() => validateKycPayload(sanitizeKycPayload(profile)), /valid calendar date/);
  profile.personal.dateOfBirth = "2000-01-01";
  profile.personal.email = "not-an-email";
  assert.throws(() => validateKycPayload(sanitizeKycPayload(profile)), /valid KYC email/);
});

test("students can edit drafts and correction requests, but not submitted records", () => {
  assert.equal(canStudentEdit({ status: "Draft" }), true);
  assert.equal(canStudentEdit({ status: "Correction Required" }), true);
  assert.equal(canStudentEdit({ status: "Submitted" }), false);
  assert.throws(() => requireEditable({ status: "Verified" }), /locked/);
});

test("upload validation checks file signatures as well as declared MIME types", () => {
  assert.doesNotThrow(() => validateDocumentBuffer({
    mimetype: "application/pdf",
    originalname: "document.pdf",
    buffer: Buffer.from("%PDF-1.7\n"),
  }));
  assert.throws(() => validateDocumentBuffer({
    mimetype: "application/pdf",
    originalname: "document.pdf",
    buffer: Buffer.from("not a PDF"),
  }), /contents do not match/);
  assert.throws(() => validateDocumentBuffer({
    mimetype: "image/png",
    originalname: "document.png",
    buffer: Buffer.from("%PDF-1.7\n"),
  }), /contents do not match/);
  assert.throws(() => validateDocumentBuffer({
    mimetype: "application/pdf",
    originalname: "document.txt",
    buffer: Buffer.from("%PDF-1.7\n"),
  }), /contents do not match/);
});

test("unsafe requests reject untrusted browser origins", () => {
  const guard = guardRequestOrigin(["https://students.example.test"]);
  const req = { method: "POST", get: (name) => name === "origin" ? "https://attacker.example.test" : undefined };
  let responseStatus = 0;
  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json() {},
  };
  let passed = false;
  guard(req, res, () => { passed = true; });
  assert.equal(responseStatus, 403);
  assert.equal(passed, false);
});
