import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-balance">
        Turn a screenshot into a mockup worth shipping
      </h1>
      <p className="text-muted-foreground text-pretty">
        Drop in a screenshot, pick a device, set a background, and export at App
        Store resolution. No account needed to try it.
      </p>

      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href={routes.public.editor}>
            Open the editor
            <ArrowRight className="size-4" />
          </Link>
        </Button>

        <Button asChild size="lg" variant="outline">
          <Link
            href={
              session?.user?.id ? routes.private.dashboard : routes.public.login
            }
          >
            {session?.user?.id ? "Your projects" : "Sign in"}
          </Link>
        </Button>
      </div>
    </main>
  );
}
