import { routes } from "@/config/routes";

/**
 * Which folder an upload lands in, and nothing more.
 *
 * Deliberately *not* the asset key: a key is `screenId/layerId`, which is
 * per-session churn with a slash in it, and neither belongs in a signed folder
 * path. Cloudinary only needs to know the sort of image this is.
 */
export type UploadKind = "screenshot" | "image" | "background" | "thumbnail";

export interface UploadedAsset {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

interface SignData {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
}

/** The API's `{ status, message, data }` envelope around the signature. */
interface SignResponse {
  status: boolean;
  message: string;
  data: SignData;
}

/**
 * Uploads a file straight from the browser to Cloudinary.
 *
 * XMLHttpRequest rather than fetch, purely because `fetch` still has no upload
 * progress event and a multi-megabyte screenshot on a slow connection needs one.
 */
export async function uploadToCloudinary(
  file: File,
  kind: UploadKind,
  onProgress?: (fraction: number) => void,
): Promise<UploadedAsset> {
  const signResponse = await fetch(routes.api.cloudinarySign, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });

  if (!signResponse.ok) {
    throw new Error(
      signResponse.status === 401
        ? "Sign in to save your images."
        : "Could not start the upload.",
    );
  }

  const envelope: SignResponse = await signResponse.json();
  if (!envelope?.status || !envelope.data) {
    throw new Error(envelope?.message || "Could not start the upload.");
  }
  const signed = envelope.data;

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  // These two are covered by the signature, so they must match exactly what the
  // server signed or Cloudinary rejects the upload.
  form.append("folder", signed.folder);
  form.append("public_id", signed.publicId);

  return new Promise<UploadedAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    );

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error("Cloudinary rejected the upload."));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        resolve({
          publicId: body.public_id,
          secureUrl: body.secure_url,
          width: body.width,
          height: body.height,
          bytes: body.bytes,
          format: body.format,
        });
      } catch {
        reject(new Error("Cloudinary returned an unexpected response."));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("The upload failed. Check your connection.")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    xhr.send(form);
  });
}
