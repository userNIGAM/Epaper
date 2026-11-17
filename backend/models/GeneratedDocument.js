import mongoose from "mongoose";

const generatedDocumentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kycId: { type: mongoose.Schema.Types.ObjectId, ref: "StudentKYC", required: true },
    type: { type: String, enum: ["citizenship-draft"], required: true },
    label: { type: String, default: "Citizenship data draft" },
    publicId: { type: String, required: true },
    format: { type: String, required: true },
    resourceType: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.GeneratedDocument ||
  mongoose.model("GeneratedDocument", generatedDocumentSchema);
