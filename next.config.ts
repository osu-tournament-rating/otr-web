import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/dist/shared/lib/constants';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ppy.sh',
      },
    ],
  },
  experimental: {
    turbo: {
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
  },
};

const configure = (phase: string) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // During development, proxy API requests
    nextConfig.rewrites = async () => [
      {
        source: '/api/:path*',
        destination: `${process.env.OTR_API_ROOT}/api/:path*`,
      },
    ];
  }

  return nextConfig;
};

export default configure;
