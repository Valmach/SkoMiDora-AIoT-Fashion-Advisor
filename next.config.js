/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // ---------------------------------------------------------
  // 🔥 SECURITY WHITELIST (Allows POST requests through Cloud Run Proxy)
  // ---------------------------------------------------------
  serverActions: {
    allowedOrigins: [
      'styleai-footwear.web.app',
      'styleai-footwear.firebaseapp.com',
      '*.web.app',
      '*.firebaseapp.com',
      '*.run.app' 
    ]
  },

  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },

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

  async redirects() {
    return [
      {
        source: '/recommendations',
        destination: '/outfit-recommendations',
        permanent: false,
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;