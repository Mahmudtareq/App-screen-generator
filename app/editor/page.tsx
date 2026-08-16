import { auth } from "@/auth";
import { EditorShell } from "@/components/editor/editor-shell";

export const metadata = {
  title: "Editor · Mockup Studio",
};

/**
 * The anonymous editor.
 *
 * Deliberately outside the proxy's protected matcher: anyone can build and
 * export a mockup here without an account, because export runs entirely in the
 * browser. Work is kept in a local draft until they choose to save it.
 */
export default async function EditorPage() {
  const session = await auth();

  return <EditorShell signedIn={Boolean(session?.user?.id)} />;
}
