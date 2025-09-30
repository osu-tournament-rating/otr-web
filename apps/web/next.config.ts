import type { NextConfig } from 'next';

import { loadRootEnv } from '../../lib/env/load-root-env';

loadRootEnv();

const nextConfig: NextConfig = {
  webpack(config) {
    // @ts-expect-error Loose typing
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] },
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
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                      },
                    },
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
        resourceQuery: /url/,
      }
    );

    fileLoaderRule.exclude = /\.svg$/i;
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ppy.sh',
      },
    ],
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      woverrides: {
                        removeViewBox: false,
                      },
                    },
                  },
                  {
                    name: 'removeAttrs',
                    params: { attrs: '(fill|stroke)' },
                  },
                ],
              },
            },
          },
        ],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
