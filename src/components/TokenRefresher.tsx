'use client'

import { useEffect } from 'react'
import Cookies from 'js-cookie'

const TokenRefresher = () => {
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

        if (data.success && data.data.access_token) {
          Cookies.set('accessToken', data.data.access_token, {
            expires: new Date(Date.now() + data.data.expires_in * 1000)
          })
          Cookies.set('refreshToken', data.data.refresh_token, {
            expires: new Date(data.data.refresh_token_expires_at)
          })
          console.log('[✅ Refresh สำเร็จ] ได้ accessToken ใหม่แล้ว')
        } else {
          console.warn('[⚠️ Refresh Failed]', data.message)
        }
      } catch (err) {
        console.error('[❌ Refresh Error]', err)
      }
    }, 270 * 1000)

    return () => clearInterval(interval)
  }, [])

  return null
}

export default TokenRefresher
