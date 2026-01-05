/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Disable strict mode to prevent double-firing in dev
  reactStrictMode: false,

  // 2. FORCE POLLING: Stops the red "wss://" connection errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,   // Check for changes every 1 second
        aggregateTimeout: 300,
      };
    }
    return config;
  },

  // 3. Image Domains (Merged your existing list + placehold.co)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // Added for outfit card fallbacks
      },
    ],
  },
};

module.exports = nextConfig;