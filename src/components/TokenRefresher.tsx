// src/components/TokenRefresher.tsx
'use client'
import { useEffect, useRef, useCallback } from 'react'

import { useRouter } from 'next/navigation'

import Cookies from 'js-cookie'

function getExpFromJWT(jwt?: string): number | null {
  try {
    if (!jwt) return null
    const [, payload] = jwt.split('.') || []

    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))

    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

const SKEW_MS = 30_000

export default function TokenRefresher() {
  const router = useRouter()

  const timerRef = useRef<number | null>(null)
  const refreshOnceRef = useRef<() => Promise<void>>(async () => {})
  const scheduleRef = useRef<(ms: number) => void>(() => {})
  const clearRef = useRef<() => void>(() => {})

  clearRef.current = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  scheduleRef.current = (ms: number) => {
    clearRef.current()
    timerRef.current = window.setTimeout(
      () => {
        refreshOnceRef.current()
      },
      Math.max(ms, 10_000)
    )
  }

  const nextDelayFromCurrentToken = useCallback(() => {
    const access = Cookies.get('accessToken')
    const exp = getExpFromJWT(access)

    if (!exp) return 200_000
    const msLeft = exp * 1000 - Date.now() - SKEW_MS

    return Math.max(msLeft, 10_000)
  }, [])

  refreshOnceRef.current = async () => {
    const rt = Cookies.get('refreshToken')
    const currentAccessToken = Cookies.get('accessToken') // ✅ เพิ่มการดึง access token

    if (!rt) {
      console.log('🚫 [TokenRefresher] No refresh token found - redirecting to login')
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
      router.replace('/pages/auth/login')

      return
    }

    console.log('🔄 [TokenRefresher] Starting token refresh...')

    try {
      const res = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

          // ✅ ส่ง Authorization header ด้วย
          ...(currentAccessToken && { Authorization: `Bearer ${currentAccessToken}` })
        },
        body: JSON.stringify({
          refresh_token: rt,
          device_type: 'web'
        })
      })

      const data = await res.json()

      console.log('📋 [TokenRefresher] Response status:', res.status)
      console.log('📦 [TokenRefresher] Response data:', {
        success: data?.success,
        message: data?.message,
        hasAccessToken: !!data?.data?.access_token,
        hasRefreshToken: !!data?.data?.refresh_token,
        expiresIn: data?.data?.expires_in
      })

      if (res.ok && data?.success && data.data?.access_token) {
        const access = data.data.access_token as string
        const newRefresh = data.data.refresh_token as string
        const ttlSec = Number(data.data.expires_in || 0)
        const expFromJwt = getExpFromJWT(access)

        const accessExpiresAt =
          ttlSec > 0
            ? new Date(Date.now() + ttlSec * 1000)
            : expFromJwt
              ? new Date(expFromJwt * 1000)
              : new Date(Date.now() + 5 * 60 * 1000)

        Cookies.set('accessToken', access, { expires: accessExpiresAt })
        Cookies.set('refreshToken', newRefresh, { expires: new Date(data.data.refresh_token_expires_at) })

        const nextMs = (ttlSec > 0 ? ttlSec * 1000 : expFromJwt! * 1000 - Date.now()) - SKEW_MS

        scheduleRef.current(Math.max(nextMs, 10_000))

        console.log(
          '✅ [TokenRefresher] Token refreshed successfully, next refresh in:',
          Math.max(nextMs, 10_000) / 1000,
          'seconds'
        )
      } else {
        console.warn('⚠️ [TokenRefresher] Refresh failed:', data?.message)
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
        router.replace('/pages/auth/login')
      }
    } catch (err) {
      console.error('❌ [TokenRefresher] Exception:', err)
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
      router.replace('/pages/auth/login')
    }
  }

  useEffect(() => {
    scheduleRef.current(nextDelayFromCurrentToken())

    return () => clearRef.current()
  }, [nextDelayFromCurrentToken])

  return null
}
