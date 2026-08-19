/**
 * Every route in one place. Dynamic routes are functions, so a path shape can be
 * changed without grepping for template literals.
 */
export const routes = {
  public: {
    home: "/",
    login: "/login",
    register: "/register",
    editor: "/editor",
    templates: "/templates",
  },
  private: {
    dashboard: "/dashboard",
    project: (id: string) => `/editor/${id}`,
  },
  admin: {
    devices: "/admin/devices",
  },
  api: {
    register: "/api/auth/register",
    projects: "/api/projects",
    project: (id: string) => `/api/projects/${id}`,
    projectDuplicate: (id: string) => `/api/projects/${id}/duplicate`,
    templates: "/api/templates",
    template: (id: string) => `/api/templates/${id}`,
    assets: "/api/assets",
    asset: (id: string) => `/api/assets/${id}`,
    adminDevices: "/api/admin/devices",
    adminDevice: (id: string) => `/api/admin/devices/${id}`,
    cloudinarySign: "/api/cloudinary/sign",
    capture: "/api/capture",
  },
} as const;

/** Paths the proxy lets through without a session. */
export const PUBLIC_PATHS = [
  routes.public.home,
  routes.public.login,
  routes.public.register,
  routes.public.editor,
  routes.public.templates,
];
