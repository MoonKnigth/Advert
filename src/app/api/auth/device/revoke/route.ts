// src/app/api/auth/device/revoke/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { API_BASE } from '../../../../../libs/apiConfig'

export const runtime = 'edge'
export const preferredRegion = ['sin1', 'hkg1']
export const revalidate = 0



export async function POST(req: NextRequest) {
    // รับ token จาก header หรือ cookie
    const headerAuth = req.headers.get('authorization')
    const cookieToken = req.cookies.get('accessToken')?.value
    const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

    if (!authHeader) {
        return NextResponse.json({ success: false, message: 'Unauthorized', data: null }, { status: 401 })
    }

    // รับ body
    let payload: any = null

    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body', data: null }, { status: 400 })
    }

    const deviceId: string | undefined = payload?.revoke_device_id

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
        return NextResponse.json(
            { success: false, message: 'Field "revoke_device_id" (string) is required', data: null },
            { status: 400 }
        )
    }

    // ส่งต่อไป upstream
    try {
        const upstream = await fetch(`${API_BASE}/api/device/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
            body: JSON.stringify({ revoke_device_id: deviceId }),
            cache: 'no-store'
        })

        // พยายามอ่าน JSON; ถ้าไม่ใช่ JSON ก็ส่งข้อความดิบกลับไป
        const text = await upstream.text()

        try {
            const json = text ? JSON.parse(text) : null


            return NextResponse.json(json ?? { success: upstream.ok, message: upstream.statusText, data: null }, {
                status: upstream.status
            })
        } catch {
            return new NextResponse(text, {
                status: upstream.status,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
        }
    } catch (err: any) {
        console.error('POST /api/auth/device/revoke error:', err)

        return NextResponse.json({ success: false, message: 'Internal error', data: null }, { status: 500 })
    }
}
