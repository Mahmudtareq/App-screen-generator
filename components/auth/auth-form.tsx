"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { registerAction } from "@/actions/auth/authActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { routes } from "@/config/routes";
import { fieldError } from "@/lib/action-client";
import { cn } from "@/lib/utils";

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: "login" | "register";
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? routes.private.dashboard;

  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    startTransition(async () => {
      if (isRegister) {
        const result = await registerAction({
          name: String(form.get("name") ?? ""),
          email,
          password,
        });

        if (!result.success) {
          setFormError(result.error.message);
          setFieldErrors({
            name: fieldError(result, "name"),
            email: fieldError(result, "email"),
            password: fieldError(result, "password"),
          });
          return;
        }
      }

      // Sign-in is a separate step from registration: `signIn` redirects by
      // throwing, so doing both in one server action would make the form unable
      // to show a validation error.
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.error) {
        setFormError("That email and password combination was not recognised.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          {isRegister
            ? "Save your mockups and pick them up on any device."
            : "Sign in to get back to your projects."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {isRegister && (
          <Field label="Name" htmlFor="name" error={fieldErrors.name}>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              required
              aria-invalid={Boolean(fieldErrors.name)}
              className="h-11"
            />
          </Field>
        )}

        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            className="h-11"
          />
        </Field>

        <Field label="Password" htmlFor="password" error={fieldErrors.password}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={isRegister ? "At least 10 characters" : "••••••••"}
              required
              aria-invalid={Boolean(fieldErrors.password)}
              className="h-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              // Purely a view toggle on the same input, so the field keeps its
              // value, its autocomplete hint and its position in the tab order.
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </Field>

        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-xs text-destructive"
          >
            <AlertCircle className="mt-px size-4 shrink-0" />
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isRegister ? "Create account" : "Sign in"}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full"
            disabled={pending}
            onClick={() => signIn("google", { callbackUrl })}
          >
            <GoogleMark />
            Continue with Google
          </Button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "Already have an account? " : "No account yet? "}
        <Link
          href={isRegister ? routes.public.login : routes.public.register}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        Or{" "}
        <Link
          href={routes.public.editor}
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          keep working without an account
        </Link>
        .
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Google's mark, inlined rather than fetched so the button paints with the form. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.26a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}
