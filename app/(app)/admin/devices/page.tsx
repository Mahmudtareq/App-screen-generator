import { notFound } from "next/navigation";

import { getDeviceList } from "@/actions/devices/deviceActions";
import { DeviceManager } from "@/components/admin/device-manager";
import { isAdminEmail } from "@/lib/admin";
import { DEVICES } from "@/lib/devices/catalog";
import type { DeviceSpec } from "@/lib/devices/types";
import { getSessionUser } from "@/lib/session-user";

export const metadata = {
  title: "Devices · Admin · Mockup Studio",
};

// The list must reflect an admin's own writes immediately after refresh.
export const dynamic = "force-dynamic";

/**
 * Device management.
 *
 * `notFound()` rather than a "no access" page: like foreign project ids, the
 * admin area should be indistinguishable from a URL that does not exist for
 * anyone not on the list. The routes behind every mutation re-check the same
 * predicate — hiding the page is courtesy, the API's `"admin"` auth level is
 * the guard.
 */
export default async function AdminDevicesPage() {
  const user = await getSessionUser();
  if (!isAdminEmail(user?.email)) notFound();

  const result = await getDeviceList();
  const devices = result?.status ? result.data.docs : [];
  const builtins: DeviceSpec[] = [...DEVICES];

  return <DeviceManager devices={devices} builtins={builtins} />;
}
