/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // 🔥 CRITICAL FIX: Prevents Next.js from mangling Firebase Admin cryptography files
  serverExternalPackages: ['firebase-admin'],

  experimental: {
    serverActions: {
      allowedOrigins: [
        'styleai-footwear.web.app',
        'styleai-footwear.firebaseapp.com',
        // 🔥 CRITICAL FIX: Whitelist the dynamic Firebase App Hosting / Cloud Run proxies
        '*.web.app',
        '*.firebaseapp.com',
        'localhost:3000',
        // This explicitly allows your Firebase Studio IDE to run Server Actions
        '9000-firebase-skomidora-aiot-1763488482243.cluster-lr6dwlc2lzbcctqhqorax5zmro.cloudworkstations.dev'
      ]
    },
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
      { protocol: 'https', hostname: 'source.unsplash.com' }, 
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;