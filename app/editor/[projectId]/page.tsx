import { notFound } from "next/navigation";

import { getProjectAction } from "@/actions/projects/projectActions";
import { EditorShell } from "@/components/editor/editor-shell";
import { getSessionUser } from "@/lib/session-user";

export default async function ProjectEditorPage({
  params,
}: PageProps<"/editor/[projectId]">) {
  const { projectId } = await params;

  const [result, user] = await Promise.all([
    getProjectAction({ id: projectId }),
    getSessionUser(),
  ]);

  // The action already scopes its query by the session's userId, so a project
  // belonging to someone else is indistinguishable from one that does not exist.
  if (!result.success) notFound();

  return (
    <EditorShell
      projectId={result.data.id}
      projectName={result.data.name}
      initialDoc={result.data.doc}
      user={user}
    />
  );
}

export async function generateMetadata({ params }: PageProps<"/editor/[projectId]">) {
  const { projectId } = await params;
  const result = await getProjectAction({ id: projectId });

  return {
    title: result.success
      ? `${result.data.name} · Mockup Studio`
      : "Mockup Studio",
  };
}
