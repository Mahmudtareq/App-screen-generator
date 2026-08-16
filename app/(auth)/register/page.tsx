import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { googleAuthEnabled } from "@/config/env";

export const metadata = { title: "Create account · Mockup Studio" };

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" googleEnabled={googleAuthEnabled} />
    </Suspense>
  );
}
