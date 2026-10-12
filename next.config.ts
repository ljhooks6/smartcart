import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.MEALCADDIE_LOCAL_AUTH_LAB === "1" ? ".next-auth-lab" : ".next",
  experimental: {
    useWasmBinary: true,
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
