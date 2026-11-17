import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, maxlength: 80 },
    educationId: { type: String, default: "" },
    originalName: { type: String, required: true, maxlength: 180 },
    publicId: { type: String, required: true },
    format: { type: String, required: true },
    resourceType: { type: String, required: true },
    bytes: { type: Number, required: true, min: 1 },
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    comments: { type: String, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

const educationSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true },
    level: { type: String, trim: true, maxlength: 80, default: "" },
    institution: { type: String, trim: true, maxlength: 160, default: "" },
    board: { type: String, trim: true, maxlength: 160, default: "" },
    registrationNumber: { type: String, trim: true, maxlength: 80, default: "" },
    symbolNumber: { type: String, trim: true, maxlength: 80, default: "" },
    passedYear: { type: String, trim: true, maxlength: 20, default: "" },
    gpa: { type: String, trim: true, maxlength: 30, default: "" },
    major: { type: String, trim: true, maxlength: 100, default: "" },
  },
  { _id: false },
);

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, maxlength: 80 },
    status: { type: String, maxlength: 40, default: "" },
    comment: { type: String, maxlength: 1000, default: "" },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 2000 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const studentKYCSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    personal: { type: mongoose.Schema.Types.Mixed, default: {} },
    citizenship: { type: mongoose.Schema.Types.Mixed, default: {} },
    birthCertificate: { type: mongoose.Schema.Types.Mixed, default: {} },
    education: { type: [educationSchema], default: [] },
    documents: { type: [documentSchema], default: [] },
    status: {
      type: String,
      enum: ["Not Started", "Draft", "Submitted", "Under Review", "Correction Required", "Verified", "Rejected"],
      default: "Not Started",
      index: true,
    },
    submittedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    feedback: { type: [String], default: [] },
    internalNotes: { type: [noteSchema], default: [] },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true, minimize: false },
);

export default mongoose.models.StudentKYC || mongoose.model("StudentKYC", studentKYCSchema);
