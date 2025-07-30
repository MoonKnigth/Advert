// libs/auth/refreshToken.ts
import Cookies from 'js-cookie'

export const refreshToken = async () => {
    const refreshToken = Cookies.get('refreshToken')
    if (!refreshToken) throw new Error('No refresh token found')

    const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refresh_token: refreshToken,
            device_type: 'web'
        })
    })

    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to refresh token')

    // เก็บ token ใหม่ลง cookie
    const expiresIn = data.data.expires_in
    const accessTokenExpireTime = new Date(Date.now() + expiresIn * 1000)
    const refreshTokenExpireTime = new Date(data.data.refresh_token_expires_at)

    Cookies.set('accessToken', data.data.access_token, { expires: accessTokenExpireTime })
    Cookies.set('refreshToken', data.data.refresh_token, { expires: refreshTokenExpireTime })

    return data.data.access_token
}
