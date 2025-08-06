// next.config.js or next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,

  // ✅ เพิ่มการจำกัดขนาดการอัปโหลด
  experimental: {
    serverActions: {
      bodySizeLimit: '10gb' // ✅ จำกัดรวมสูงสุดต่อ request = 10GB
    }
  },

  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/pages/auth/login',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
