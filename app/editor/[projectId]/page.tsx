import { notFound } from "next/navigation";

import { getProject } from "@/actions/projects/projectActions";
import { EditorShell } from "@/components/editor/editor-shell";
import { listEnabledDeviceSpecs } from "@/lib/devices/custom";
import { getSessionUser } from "@/lib/session-user";

export default async function ProjectEditorPage({
  params,
}: PageProps<"/editor/[projectId]">) {
  const { projectId } = await params;

  const [result, user, customDevices] = await Promise.all([
    getProject(projectId),
    getSessionUser(),
    listEnabledDeviceSpecs(),
  ]);

  // The route already scopes its query by the session's userId, so a project
  // belonging to someone else is indistinguishable from one that does not exist.
  if (!result?.status) notFound();

  return (
    <EditorShell
      projectId={result.data.id}
      projectName={result.data.name}
      initialDoc={result.data.doc}
      user={user}
      customDevices={customDevices}
    />
  );
}

export async function generateMetadata({ params }: PageProps<"/editor/[projectId]">) {
  const { projectId } = await params;
  const result = await getProject(projectId);

  return {
    title: result?.status
      ? `${result.data.name} · Mockup Studio`
      : "Mockup Studio",
  };
}
