// libs/api/fetchWithAuth.ts
import Cookies from 'js-cookie'

import { refreshToken } from '../auth/refreshToken'

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    let token = Cookies.get('accessToken')

    const res = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }
    })

    if (res.status === 401) {
        // ลอง refresh token
        try {
            const refreshedToken = await refreshToken()

            token = refreshedToken === null ? undefined : refreshedToken

            const retry = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${token}`
                }
            })


            return retry
        } catch (err) {
            throw new Error('Unauthorized and refresh token failed')
        }
    }

    return res
}
