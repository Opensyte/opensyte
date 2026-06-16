/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  // Keep @react-pdf/renderer out of the server bundle; it renders invoice PDFs
  // to a Buffer (renderToBuffer) on the Node runtime.
  serverExternalPackages: ["@react-pdf/renderer"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // due to heap memory issues
  },
  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: ["twilio"],
  },
};

export default config;
