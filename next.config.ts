import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.MEALCADDIE_ALLERGY_LAB === "true" && process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV
    ? ".next-allergy-lab"
    : process.env.MEALCADDIE_LOCAL_AUTH_LAB === "1" ? ".next-auth-lab" : ".next",
  experimental: {
    useWasmBinary: true,
  },
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
