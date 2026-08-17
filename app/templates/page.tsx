import { auth } from "@/auth";
import { AppBar } from "@/components/editor/app-bar";
import { TemplateGallery } from "@/components/editor/template-gallery";

export const metadata = {
  title: "Templates · Mockup Studio",
};

/**
 * Public template gallery.
 *
 * Outside the proxy's protected matcher, like the editor itself: picking a template
 * and building a set of screens works without an account, because export runs
 * entirely in the browser. Signing in is required to *save*.
 */
export default async function TemplatesPage() {
  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar active="templates" signedIn={Boolean(session?.user?.id)} />

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Each one opens as five screens with a device on every frame — add, delete
            and reorder them from there. Two to start with; more are on the way.
          </p>
        </div>

        <TemplateGallery className="mt-8" />
      </main>
    </div>
  );
}
