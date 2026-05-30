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
        '*.web.app',
        '*.firebaseapp.com',
        'localhost:3000',
        // 🔥 Add the wildcard for your cloud workstation
        '*.cloudworkstations.dev' 
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