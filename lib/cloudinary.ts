import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { env } from "@/config/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Every asset is namespaced under its owner.
 *
 * This is a second, independent ownership check: deletion verifies both the
 * Asset row's `userId` and that the public id sits under this prefix, so a
 * public id leaked from one account cannot be used to delete from another.
 */
export function userFolder(userId: string, kind: string) {
  return `mockup-studio/users/${userId}/${kind}`;
}

export function isOwnedBy(publicId: string, userId: string) {
  return publicId.startsWith(`mockup-studio/users/${userId}/`);
}

/**
 * Signs an upload for the browser to perform directly.
 *
 * Only the parameters included here are covered by the signature, so pinning
 * `folder` and `public_id` server-side is what stops a client from uploading
 * anywhere it likes in the account.
 */
export function signUpload(params: Record<string, string | number>) {
  const timestamp = Math.round(Date.now() / 1000);
  const toSign = { ...params, timestamp };

  return {
    timestamp,
    signature: cloudinary.utils.api_sign_request(toSign, env.CLOUDINARY_API_SECRET),
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  };
}
