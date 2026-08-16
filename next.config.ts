import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // Konva's Node build requires the optional native `canvas` package. The editor
  // only ever renders in the browser, so alias it away rather than installing it.
  turbopack: {
    resolveAlias: {
      canvas: "./lib/empty-module.ts",
    },
  },

  serverExternalPackages: ["konva", "mongoose"],
};

export default nextConfig;
