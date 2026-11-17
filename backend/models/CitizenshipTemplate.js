import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 60 },
    label: { type: String, required: true, maxlength: 80 },
    x: { type: Number, min: 0, max: 100, required: true },
    y: { type: Number, min: 0, max: 100, required: true },
    fontSize: { type: Number, min: 6, max: 36, default: 10 },
    alignment: { type: String, enum: ["left", "center", "right"], default: "left" },
  },
  { _id: false },
);

const citizenshipTemplateSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: true },
    publicId: { type: String, required: true },
    format: { type: String, required: true },
    resourceType: { type: String, required: true },
    fontAsset: {
      publicId: { type: String, default: "" },
      format: { type: String, default: "" },
      resourceType: { type: String, default: "" },
    },
    fields: { type: [fieldSchema], default: [] },
    photo: {
      x: { type: Number, min: 0, max: 100, default: 75 },
      y: { type: Number, min: 0, max: 100, default: 20 },
      width: { type: Number, min: 1, max: 100, default: 15 },
      height: { type: Number, min: 1, max: 100, default: 20 },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.models.CitizenshipTemplate ||
  mongoose.model("CitizenshipTemplate", citizenshipTemplateSchema);
