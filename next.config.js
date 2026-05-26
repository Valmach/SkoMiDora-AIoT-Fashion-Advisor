/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // 🔥 MOVED BACK TO ROOT (Where Next.js 15 requires it)
  // Added deep wildcards specifically matching your Cloud Run logs
  serverActions: {
    allowedOrigins: [
      'styleai-footwear.web.app',
      'styleai-footwear.firebaseapp.com',
      '*.web.app',
      '*.firebaseapp.com',
      '*.a.run.app',      // Matches the uc.a.run.app proxy
      '*.hosted.app',     // Matches the us-central1.hosted.app proxy
      '*.cloudworkstations.dev' // Matches your local IDE proxy
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