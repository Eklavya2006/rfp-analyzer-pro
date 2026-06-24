import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence the workspace-root warning caused by a parent-directory lockfile
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Allow larger file uploads through Next.js body parser
  experimental: {
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },

  // Strict mode for better React hygiene
  reactStrictMode: true,
};

export default nextConfig;
