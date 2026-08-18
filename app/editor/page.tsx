import { EditorShell } from "@/components/editor/editor-shell";
import { getSessionUser } from "@/lib/session-user";

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
  const user = await getSessionUser();

  return <EditorShell user={user} />;
}
