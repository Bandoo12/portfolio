import type { NextConfig } from "next";
import path from "path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
  turbopack: {
    resolveAlias: {},
  },
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        path.resolve(__dirname, 'VSCOProfileFilter'),
      ],
    };
    config.resolve = {
      ...config.resolve,
      symlinks: false,
    };
    return config;
  },
};

export default nextConfig;
