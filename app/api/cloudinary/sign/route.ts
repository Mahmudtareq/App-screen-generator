import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { signUpload, userFolder } from "@/lib/cloudinary";

/**
 * Issues a signed Cloudinary upload, which the browser then performs directly.
 *
 * The upload does not go through a Server Action: those cap request bodies at
 * 1MB by default, and a serverless deployment enforces its own few-megabyte
 * ceiling on top. App Store screenshots routinely exceed both. Proxying would
 * also double the bytes on the wire and give the client no upload progress.
 *
 * Signed rather than an unsigned preset, because an unsigned preset is a public
 * write endpoint against the account's quota. Signing costs one small request and
 * lets the folder, the public id and the size limit be fixed server-side.
 */
const bodySchema = z.object({
  kind: z.enum(["screenshot", "logo", "background"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const folder = userFolder(session.user.id, parsed.data.kind);
  const publicId = `${folder}/${randomUUID()}`;

  const signed = signUpload({
    folder,
    public_id: publicId,
  });

  return NextResponse.json({ ...signed, folder, publicId });
}
