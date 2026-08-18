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
    cloudinarySign: "/api/cloudinary/sign",
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
