/** @type {import('next').NextConfig} */
const nextConfig = {
  // --------------------------------------------------
  // 1. Disable strict mode (prevents double execution)
  // --------------------------------------------------
  reactStrictMode: false,

  // --------------------------------------------------
  // 2. FORCE DYNAMIC DEV BEHAVIOR (CRITICAL)
  //    - Prevents stale RSC + chunk reuse
  // --------------------------------------------------
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

  // --------------------------------------------------
  // 3. Webpack overrides for Firebase Studio
  // --------------------------------------------------
  webpack: (config, { isServer, dev }) => {
    // ----------------------------------------------
    // 3a. FORCE POLLING (fixes wss:// errors)
    // ----------------------------------------------
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // ----------------------------------------------
    // 3b. DISABLE HASHED CHUNKS IN DEV (CRITICAL FIX)
    // ----------------------------------------------
    if (dev && !isServer) {
      config.output.filename = 'static/chunks/[name].js';
      config.output.chunkFilename = 'static/chunks/[name].js';
    }

    return config;
  },

  // --------------------------------------------------
  // 4. Image Domains (Closet / Footwear / Cityscapes)
  // --------------------------------------------------
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
};

module.exports = nextConfig;
