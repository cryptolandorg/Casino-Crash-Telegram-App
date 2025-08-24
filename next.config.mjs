/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: ['https://46c6-45-144-52-194.ngrok-free.app'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https://7923-185-135-181-82.ngrok-free.app 'unsafe-eval' 'unsafe-inline'",
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' ws://localhost:4001 wss://localhost:4001 ws://127.0.0.1:4001 wss://127.0.0.1:4001 https://raw.githubusercontent.com"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default nextConfig
