import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server-side native modules (better-sqlite3, sharp)
  serverExternalPackages: ['better-sqlite3', 'sharp', 'pdf-parse', 'node-cron'],
};

export default nextConfig;
