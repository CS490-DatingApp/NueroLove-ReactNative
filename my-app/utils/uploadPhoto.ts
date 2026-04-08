/**
 * utils/uploadPhoto.ts — Cloudinary photo upload helper
 *
 * Uploads a local file:// URI to Cloudinary using an unsigned upload preset.
 * Returns the secure public URL. Skips upload if already a remote https:// URL.
 */

const CLOUD_NAME = "dsrkr78ep";
const UPLOAD_PRESET = "Neruo_Love";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export async function uploadPhoto(localUri: string): Promise<string> {
  // Already a remote URL — no upload needed
  if (localUri.startsWith("https://") || localUri.startsWith("http://")) {
    return localUri;
  }

  const formData = new FormData();
  formData.append("file", {
    uri: localUri,
    type: "image/jpeg",
    name: `photo_${Date.now()}.jpg`,
  } as any);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.secure_url) {
    console.error("Cloudinary upload failed:", JSON.stringify(data));
    throw new Error(data.error?.message ?? `Upload failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data.secure_url as string;
}

/**
 * Uploads all non-empty local photos in parallel.
 * Returns a new array with remote URLs replacing local ones.
 */
export async function uploadPhotos(photos: string[]): Promise<string[]> {
  return Promise.all(
    photos.map((uri) => (uri.trim() ? uploadPhoto(uri) : Promise.resolve("")))
  );
}
