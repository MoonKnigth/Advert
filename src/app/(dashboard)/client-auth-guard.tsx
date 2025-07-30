'use client'

import { useRouter, usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { useEffect } from 'react'

const ClientAuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = Cookies.get('accessToken')
    if (!token) {
      console.warn('⛔ Token missing or expired. Redirecting...')
      router.replace('pages/auth/login')
    }
  }, [pathname]) // ทุกครั้งที่ route เปลี่ยน จะตรวจ token ใหม่

  return <>{children}</>
}

export default ClientAuthGuard
