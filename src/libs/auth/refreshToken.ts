// libs/auth/refreshToken.ts
import Cookies from 'js-cookie'

export const refreshToken = async (): Promise<string | null> => {
    const refreshToken = Cookies.get('refreshToken')
    if (!refreshToken) {
        console.warn('[refreshToken] No refresh token found')
        return null
    }

    try {
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refresh_token: refreshToken,
                device_type: 'web',
            }),
        })

        const data = await response.json()
        if (!response.ok || !data.success || !data.data?.access_token) {
            // ลบ token ออกจาก cookie
            Cookies.remove('accessToken')
            Cookies.remove('refreshToken')
            console.warn('[refreshToken] Failed:', data.message)
            return null
        }

        // เซ็ต token ใหม่
        const expiresIn = data.data.expires_in
        const accessTokenExpireTime = new Date(Date.now() + expiresIn * 1000)
        const refreshTokenExpireTime = new Date(data.data.refresh_token_expires_at)

        Cookies.set('accessToken', data.data.access_token, { expires: accessTokenExpireTime })
        Cookies.set('refreshToken', data.data.refresh_token, { expires: refreshTokenExpireTime })

        return data.data.access_token
    } catch (err) {
        Cookies.remove('accessToken')
        Cookies.remove('refreshToken')
        console.error('[refreshToken] Exception:', err)
        return null
    }
}
