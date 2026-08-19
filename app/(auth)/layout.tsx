import Link from "next/link";
import { Download, Layers, LayoutTemplate, Smartphone } from "lucide-react";

import { routes } from "@/config/routes";

/**
 * Split shell for sign-in and registration.
 *
 * The pitch panel is a sibling of the form rather than a background behind it, so
 * it can simply be dropped below the `lg` breakpoint instead of being fought with
 * overlay contrast. Both halves scroll independently at full height, which keeps a
 * long form usable on a short laptop window.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        {/* Two soft radial washes, drawn in the theme's own foreground colour at low
            alpha — the palette is monochrome, so depth has to come from luminance
            rather than hue. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] [background:radial-gradient(60rem_40rem_at_15%_-10%,var(--color-background),transparent_60%),radial-gradient(45rem_35rem_at_110%_110%,var(--color-background),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,var(--color-background)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-background)_1px,transparent_1px)] [background-size:3rem_3rem]"
        />

        <Link href={routes.public.home} className="relative flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-background text-foreground">
            <Layers className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">Mockup Studio</span>
        </Link>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Screenshots that look like they came from the design team
            </h2>
            <p className="text-sm text-background/70 text-pretty">
              Five store frames, one device, one background — edited side by side and
              exported at App Store resolution.
            </p>
          </div>

          <ul className="space-y-4">
            <Pitch icon={<Smartphone className="size-4" />} title="Real device frames">
              Pick a model and orientation once; every screen in the set follows.
            </Pitch>
            <Pitch icon={<LayoutTemplate className="size-4" />} title="Templates to start from">
              Open a template and get five styled screens, then make them yours.
            </Pitch>
            <Pitch icon={<Download className="size-4" />} title="Export at 3×">
              Rendered in the browser at the exact pixel size the stores ask for.
            </Pitch>
          </ul>
        </div>

        <p className="relative text-xs text-background/50">
          No account needed to try the editor — signing in is only for saving.
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href={routes.public.home}
            className="mb-10 flex items-center justify-center gap-2 lg:hidden"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">Mockup Studio</span>
          </Link>

          {children}
        </div>
      </main>
    </div>
  );
}

function Pitch({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-background/10 ring-1 ring-background/15">
        {icon}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-background/60">{children}</p>
      </div>
    </li>
  );
}
