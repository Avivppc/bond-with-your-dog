import { uploadEmailImage, type UploadEmailImageResult } from "./upload-action";
import { validateEmailImage } from "./upload-rules";

/**
 * Browser helper for <EmailEditor uploadImage={uploadImage}>: checks the file early, then sends it
 * to the uploadEmailImage server action. Never throws.
 */
export async function uploadImage(file: File): Promise<UploadEmailImageResult> {
  const invalid = validateEmailImage({ type: file.type, size: file.size });
  if (invalid) return { error: invalid };
  const formData = new FormData();
  formData.append("file", file);
  try {
    return await uploadEmailImage(formData);
  } catch {
    return { error: "The upload didn't go through. Check your connection and try again." };
  }
}
