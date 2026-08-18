import { redirect } from "next/navigation";

import { routes } from "@/config/routes";

/** `/admin` has no content of its own; devices is the only admin surface. */
export default function AdminIndexPage() {
  redirect(routes.admin.devices);
}
