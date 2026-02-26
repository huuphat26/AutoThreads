import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tắt source map trong production để bảo mật
  productionBrowserSourceMaps: false,
};

export default nextConfig;
