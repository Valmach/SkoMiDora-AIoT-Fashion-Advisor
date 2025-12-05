/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    domains: [
      "lh3.googleusercontent.com", // fixed Google user content host
      "firebasestorage.googleapis.com", // storage API
      "storage.googleapis.com", // direct bucket access
      "picsum.photos"
    ],

    remotePatterns: [
      // Google profile images (OAuth, avatars, etc.)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com"
      },

      // Firebase Storage (public URLs)
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com"
      },

      // Direct bucket access if used
      {
        protocol: "https",
        hostname: "storage.googleapis.com"
      },

      // Mock images for events
      {
        protocol: "https",
        hostname: "picsum.photos"
      }
    ]
  }
};

module.exports = nextConfig;
