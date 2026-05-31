/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow legacy SSL connections in API routes
  experimental: {
    serverComponentsExternalPackages: ['https', 'tls']
  },
  
  // Rewrite PeopleSoft resource paths to our asset proxy
  async rewrites() {
    return [
      // Cache servlet paths
      {
        source: '/cs/:path*',
        destination: '/api/asset/cs/:path*',
      },
      // Portal paths for assets
      {
        source: '/psp/:path*',
        destination: '/api/asset/psp/:path*',
      },
      {
        source: '/psc/:path*',
        destination: '/api/asset/psc/:path*',
      },
      // PT90SYS paths (images, CSS, etc)
      {
        source: '/PT90SYS/:path*',
        destination: '/api/asset/PT90SYS/:path*',
      },
    ];
  },

  // Security headers compatible with HTTP
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
