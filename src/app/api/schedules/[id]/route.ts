// src/app/api/schedules/[id]/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { API_BASE } from '@/libs/apiConfig'

export const runtime = 'nodejs'
export const revalidate = 0

type RouteCtx = { params: Promise<{ id: string }> }

const sanitizeId = (v?: string) => {
    const n = Number(v)


    return Number.isFinite(n) && n > 0 ? String(Math.floor(n)) : ''
}

const getToken = async (req: NextRequest) =>
    (await cookies()).get('accessToken')?.value ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''

// ---------- GET /api/schedules/[id]
export async function GET(req: NextRequest, { params }: RouteCtx) {
    const { id } = await params // ✅ ต้อง await
    const sid = sanitizeId(id)

    if (!sid) {
        return NextResponse.json({ success: false, message: 'Valid schedule ID is required' }, { status: 400 })
    }

    const token = await getToken(req)

    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(`/api/schedules/${sid}`, API_BASE)

    const upstream = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    })

    const text = await upstream.text()

    try {
        const json = text ? JSON.parse(text) : null


        return NextResponse.json(json, { status: upstream.status })
    } catch {
        return NextResponse.json({ success: false, message: 'Upstream returned non-JSON', raw: text }, { status: 502 })
    }
}

// ---------- PUT /api/schedules/[id]
export async function PUT(req: NextRequest, { params }: RouteCtx) {
    const { id } = await params
    const sid = sanitizeId(id)

    if (!sid) return NextResponse.json({ success: false, message: 'Valid schedule ID is required' }, { status: 400 })

    const token = await getToken(req)

    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const url = new URL(`/api/schedules/${sid}`, API_BASE)

    const upstream = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        cache: 'no-store'
    })

    const text = await upstream.text()

    try {
        const json = text ? JSON.parse(text) : null


        return NextResponse.json(json, { status: upstream.status })
    } catch {
        return NextResponse.json({ success: false, message: 'Upstream returned non-JSON', raw: text }, { status: 502 })
    }
}

// ---------- DELETE /api/schedules/[id]
export async function DELETE(req: NextRequest, { params }: RouteCtx) {
    const { id } = await params
    const sid = sanitizeId(id)

    if (!sid) return NextResponse.json({ success: false, message: 'Valid schedule ID is required' }, { status: 400 })

    const token = await getToken(req)

    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    const url = new URL(`/api/schedules/${sid}`, API_BASE)

    const upstream = await fetch(url.toString(), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    })

    const text = await upstream.text()

    try {
        const json = text ? JSON.parse(text) : null


        return NextResponse.json(json, { status: upstream.status })
    } catch {
        return NextResponse.json({ success: false, message: 'Upstream returned non-JSON', raw: text }, { status: 502 })
    }
}
