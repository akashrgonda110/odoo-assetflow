import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker: copies only the minimal runtime into .next/standalone
  output: "standalone",
};

export default nextConfig;
