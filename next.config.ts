import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/eleven-plus-vocab',
  assetPrefix: '/eleven-plus-vocab',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
