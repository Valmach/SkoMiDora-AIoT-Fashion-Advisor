/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // 🔥 CRITICAL FIX: Prevents Next.js from mangling Firebase Admin cryptography files
  serverExternalPackages: ['firebase-admin'],

  experimental: {
    serverActions: {
      // 🔥 FIX 1: Permanently disable the 1MB Payload limit for your ingestion arrays
      bodySizeLimit: '5mb', 
      
      allowedOrigins: [
        'styleai-footwear.web.app',
        'styleai-footwear.firebaseapp.com',
        '*.web.app',
        '*.firebaseapp.com',
        'localhost:3000',
        '*.cloudworkstations.dev',
        // 🔥 FIX 2: Firebase App Hosting internal Cloud Run URLs
        '*.a.run.app' 
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