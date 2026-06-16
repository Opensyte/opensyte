/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  // @react-pdf/renderer is ESM-only; let Next bundle/transpile it (both the
  // client PDFViewer and the server-side renderToBuffer) rather than treating
  // it as an external require, which breaks the standalone build.
  transpilePackages: ["@react-pdf/renderer"],
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
