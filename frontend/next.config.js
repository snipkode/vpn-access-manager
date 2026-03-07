/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled for better dev experience
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
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
