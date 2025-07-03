import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  ...(isProd && {
    basePath: '/eleven-plus-vocab',
    assetPrefix: '/eleven-plus-vocab',
  }),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
