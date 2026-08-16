import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { googleAuthEnabled } from "@/config/env";

export const metadata = { title: "Sign in · Mockup Studio" };

export default function LoginPage() {
  return (
    // useSearchParams needs a Suspense boundary to keep the route statically
    // renderable up to the point the callbackUrl is read.
    <Suspense>
      <AuthForm mode="login" googleEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
