import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/dist/shared/lib/constants';

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
                      overrides: {
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

const configure = (phase: string) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // During development, proxy API requests
    nextConfig.rewrites = async () => [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`,
      },
    ];
  }

  return nextConfig;
};

export default configure;
