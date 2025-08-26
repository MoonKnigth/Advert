// src/libs/auth/refreshToken.ts
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

export const refreshToken = async (): Promise<string | null> => {
    const refreshToken = Cookies.get('refreshToken')
    const currentAccessToken = Cookies.get('accessToken') // ✅ เพิ่มการดึง access token

    if (!refreshToken) {
        console.warn('🚫 [refreshToken] No refresh token found')

        return null
    }

    console.log('🔄 [refreshToken] Starting manual token refresh...')

    try {
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',

                // ✅ ส่ง Authorization header ด้วย
                ...(currentAccessToken && { 'Authorization': `Bearer ${currentAccessToken}` })
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
                device_type: 'web'
            })
        })

        const data = await response.json()

        console.log('📋 [refreshToken] Response status:', response.status)
        console.log('📦 [refreshToken] Response data:', {
            success: data?.success,
            message: data?.message,
            hasAccessToken: !!data?.data?.access_token,
            hasRefreshToken: !!data?.data?.refresh_token,
            expiresIn: data?.data?.expires_in
        })

        if (!response.ok || !data.success || !data.data?.access_token) {
            console.warn('⚠️ [refreshToken] Failed:', data.message)
            Cookies.remove('accessToken')
            Cookies.remove('refreshToken')

            return null
        }

        const access = data.data.access_token as string
        const ttlSec = Number(data.data.expires_in)
        const expFromJwt = getExpFromJWT(access)

        const accessExpiresAt =
            ttlSec > 0
                ? new Date(Date.now() + ttlSec * 1000)
                : expFromJwt
                    ? new Date(expFromJwt * 1000)
                    : new Date(Date.now() + 5 * 60 * 1000)

        const refreshExpiresAt = new Date(data.data.refresh_token_expires_at)

        Cookies.set('accessToken', access, { expires: accessExpiresAt })
        Cookies.set('refreshToken', data.data.refresh_token, { expires: refreshExpiresAt })

        console.log('✅ [refreshToken] Token refreshed successfully')

        return access
    } catch (err) {
        console.error('❌ [refreshToken] Exception:', err)
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')

        return null
    }
}
