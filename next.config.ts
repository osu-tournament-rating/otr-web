import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config) => {
    // region svgr Config
    // see https://react-svgr.com/docs/next/

    // Grab the existing rule that handles SVG imports
    // @ts-expect-error - webpack config has incredibly loose typing
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'removeAttrs',
                    params: { attrs: '(fill|stroke)' },
                  },
                ],
              },
            },
          },
        ],
      },
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    // endregion

    return config;
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // Allow proxying images from any osu! subdomain
      {
        protocol: 'https',
        hostname: '**.ppy.sh',
      },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
  typescript: {
    // TODO: Fix all errors and remove
    ignoreBuildErrors: true,
  },
  eslint: {
    // TODO: Fix all errors and remove
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
