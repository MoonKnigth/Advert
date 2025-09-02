// src/app/api/auth/device/[deviceId]/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { API_BASE } from '../../../../../libs/apiConfig'

const BASE = API_BASE

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
        const res = await fetch(`${BASE}/api/device/${encodeURIComponent(deviceId)}`, {
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing device id', data: null }, { status: 400 })
    }

    // รับ token จาก header หรือ cookie
    const headerAuth = req.headers.get('authorization')
    const cookieToken = req.cookies.get('accessToken')?.value
    const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

    if (!authHeader) {
        return NextResponse.json({ success: false, message: 'Unauthorized', data: null }, { status: 401 })
    }

    try {
        const upstream = await fetch(`${BASE}/api/device/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { Accept: 'application/json', Authorization: authHeader },
            cache: 'no-store'
        })

        // พยายามอ่าน JSON กลับ
        let data: any = null

        try {
            data = await upstream.json()
        } catch {
            // ถ้าไม่ใช่ JSON ก็ส่งข้อความสั้นๆ กลับแทน
            data = { success: upstream.ok, message: upstream.statusText, data: null }
        }

        return NextResponse.json(data, { status: upstream.status })
    } catch (err) {
        console.error('DELETE /api/auth/device/[id] error:', err)

        return NextResponse.json({ success: false, message: 'Internal error', data: null }, { status: 500 })
    }
}
