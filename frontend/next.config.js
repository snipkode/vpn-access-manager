/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,

  // Disable experimental features that cause issues on Android
  experimental: {
    forceSwcTransforms: false,
  },

  // Disable webpack caching to avoid issues on Android
  webpack: (config, { dev, isServer }) => {
    config.cache = false;
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://solusikonsep.co.id:4443/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
