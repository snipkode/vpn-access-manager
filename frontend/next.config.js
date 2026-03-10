/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled for better dev experience
  swcMinify: true, // Enabled for production builds

  // Disable experimental features that cause issues on Android
  experimental: {
    forceSwcTransforms: false,
  },

  // Disable webpack caching to avoid issues on Android
  webpack: (config, { dev, isServer }) => {
    config.cache = false;
    return config;
  },
}

module.exports = nextConfig
