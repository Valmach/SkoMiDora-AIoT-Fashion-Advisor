/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Disable strict mode
  reactStrictMode: false,

  // 2. FORCE DYNAMIC DEV BEHAVIOR
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

  // 3. Webpack overrides
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    if (dev && !isServer) {
      config.output.filename = 'static/chunks/[name].js';
      config.output.chunkFilename = 'static/chunks/[name].js';
    }
    return config;
  },

  // 4. Image Domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // 5. REDIRECTS (THE FIX FOR YOUR LINK)
  // This automatically fixes the broken link in your navbar
  async redirects() {
    return [
      {
        source: '/recommendations',
        destination: '/outfit-recommendations',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;