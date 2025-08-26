// src/libs/auth/refreshWithLock.ts
import Cookies from 'js-cookie'

type RefreshPayload = {
    access_token: string
    refresh_token: string
    expires_in: number
    refresh_token_expires_at: string
}

let inflight: Promise<RefreshPayload | null> | null = null
const bc = typeof window !== 'undefined' ? new BroadcastChannel('auth') : null

export function listenRefreshEvents(onDone: (p: RefreshPayload | null) => void) {
    bc?.addEventListener('message', ev => {
        if (ev?.data?.type === 'refresh-done') onDone(ev.data.payload ?? null)
    })
}

export async function refreshWithLock(): Promise<RefreshPayload | null> {
    if (inflight) return inflight

    const waitFromOthers = new Promise<RefreshPayload | null>(resolve => {
        const handler = (ev: MessageEvent) => {
            if (ev?.data?.type === 'refresh-done') {
                bc?.removeEventListener('message', handler as any)
                resolve(ev.data.payload ?? null)
            }
        }

        bc?.addEventListener('message', handler as any)
        setTimeout(() => {
            bc?.removeEventListener('message', handler as any)
            resolve(null)
        }, 1500)
    })

    const fromOthers = await waitFromOthers

    if (fromOthers) return fromOthers

    inflight = (async () => {
        const rt = Cookies.get('refreshToken')
        const currentAccessToken = Cookies.get('accessToken') // ✅ เพิ่มการดึง access token

        if (!rt) return null

        const res = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',

                // ✅ ส่ง Authorization header ด้วย
                ...(currentAccessToken && { 'Authorization': `Bearer ${currentAccessToken}` })
            },
            body: JSON.stringify({
                refresh_token: rt,
                device_type: 'web'
            })
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok || !data?.success || !data?.data?.access_token) {
            bc?.postMessage({ type: 'refresh-done', payload: null })
            inflight = null

            return null
        }

        const payload: RefreshPayload = {
            access_token: data.data.access_token,
            refresh_token: data.data.refresh_token,
            expires_in: Number(data.data.expires_in || 0),
            refresh_token_expires_at: data.data.refresh_token_expires_at
        }

        bc?.postMessage({ type: 'refresh-done', payload })
        inflight = null

        return payload
    })()

    return inflight
}
