import multer from "multer";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Upload a PDF, JPG, JPEG, or PNG file.");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

export const fontUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) {
    if (!["font/ttf", "font/otf", "application/font-sfnt", "application/vnd.ms-opentype", "application/octet-stream"].includes(file.mimetype)) {
      const error = new Error("Upload a TTF or OTF font file.");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

export function validateDocumentBuffer(file) {
  const buffer = file?.buffer;
  if (!buffer) {
    const error = new Error("Choose a document to upload.");
    error.status = 400;
    throw error;
  }

  const extension = file.originalname?.split(".").pop()?.toLowerCase();
  const isPdf =
    file.mimetype === "application/pdf" &&
    extension === "pdf" &&
    buffer.subarray(0, 5).toString() === "%PDF-";
  const isJpeg =
    file.mimetype === "image/jpeg" &&
    ["jpg", "jpeg"].includes(extension) &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isPng =
    file.mimetype === "image/png" &&
    extension === "png" &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  if (!isPdf && !isJpeg && !isPng) {
    const error = new Error("The file contents do not match an allowed document type.");
    error.status = 400;
    throw error;
  }
  return file;
}

export function validateFontBuffer(file) {
  const buffer = file?.buffer;
  const validSignature =
    buffer &&
    (buffer.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])) ||
      buffer.subarray(0, 4).toString() === "OTTO" ||
      buffer.subarray(0, 4).toString() === "true");
  if (!validSignature || !/\.(ttf|otf)$/i.test(file.originalname)) {
    const error = new Error("The file is not a valid TTF or OTF font.");
    error.status = 400;
    throw error;
  }
  return file;
}
