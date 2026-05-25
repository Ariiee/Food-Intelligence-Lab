import type { NextConfig } from "next";
import { getAllowedDevOrigins } from "./src/lib/dev-origins";

const allowedDevOrigins = getAllowedDevOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
