import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BASE = process.env.SIGNBOARD_API_BASE ?? 'https://signboard.softacular.net/api'

type RouteParams = { deviceId: string }
type RouteContext = { params: Promise<RouteParams> } // <-- params เป็น Promise

export async function PUT(request: Request, context: RouteContext) {
    // ✅ ต้อง await ก่อนใช้งาน
    const { deviceId } = await context.params

    const token = (await cookies()).get('accessToken')?.value

    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized: missing access token', data: null },
            { status: 401 }
        )
    }

    let body: unknown

    try {
        body = await request.json()
    } catch {
        return NextResponse.json(
            { success: false, message: 'Invalid JSON body', data: null },
            { status: 400 }
        )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    try {
        const res = await fetch(`${BASE}/device/${encodeURIComponent(deviceId)}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal,
            cache: 'no-store'
        })

        clearTimeout(timeout)

        // บาง API อาจคืน 204
        const data = await res.json().catch(() => ({} as any))

        if (!res.ok) {
            return NextResponse.json(
                { success: false, message: data?.message || `Upstream error (${res.status})`, data: data?.data ?? null },
                { status: res.status }
            )
        }

        return NextResponse.json(data || { success: true, message: 'OK', data: null })
    } catch (err: any) {
        clearTimeout(timeout)

        if (err?.name === 'AbortError') {
            return NextResponse.json({ success: false, message: 'Upstream request timed out', data: null }, { status: 504 })
        }


        return NextResponse.json(
            { success: false, message: err?.message || 'Upstream request failed', data: null },
            { status: 502 }
        )
    }
}
