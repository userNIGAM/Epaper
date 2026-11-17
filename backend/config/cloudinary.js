import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function getCloudinary() {
  if (!configured) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      const error = new Error("Cloudinary storage is not configured.");
      error.status = 503;
      throw error;
    }

    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export function uploadPrivateAsset(buffer, options = {}) {
  const client = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: "student-kyc",
        type: "authenticated",
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export async function downloadPrivateAsset(publicId, format, resourceType) {
  const client = getCloudinary();
  const url = client.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: "authenticated",
  });
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.body) {
    const error = new Error("The private document could not be retrieved.");
    error.status = 502;
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function destroyPrivateAsset(publicId, resourceType) {
  const client = getCloudinary();
  return client.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "authenticated",
    invalidate: true,
  });
}
