'use client'

import { useEffect } from 'react'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'

const TokenRefresher = () => {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      const refreshToken = Cookies.get('refreshToken')
      if (!refreshToken) return

      try {
        const res = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken, device_type: 'web' })
        })

        const data = await res.json()

        if (data.success && data.data?.access_token) {
          Cookies.set('accessToken', data.data.access_token, {
            expires: new Date(Date.now() + data.data.expires_in * 1000)
          })
          Cookies.set('refreshToken', data.data.refresh_token, {
            expires: new Date(data.data.refresh_token_expires_at)
          })
          console.log('[✅ Refresh สำเร็จ] ได้ accessToken ใหม่แล้ว')
        } else {
          Cookies.remove('accessToken')
          Cookies.remove('refreshToken')
          router.replace('pages/auth/login')
          console.warn('[⚠️ Refresh Failed]', data.message)
        }
      } catch (err) {
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
        router.replace('pages/auth/login')
        console.error('[❌ Refresh Error]', err)
      }
    }, 200 * 1000)

    return () => clearInterval(interval)
  }, [router])

  return null
}

export default TokenRefresher
