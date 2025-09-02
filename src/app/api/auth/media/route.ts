// src/app/api/auth/media/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { API_BASE } from '../../../../libs/apiConfig'



export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
    // ✅ เอา token จาก cookie หรือ header
    const token =
        req.cookies.get('accessToken')?.value ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        ''

    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized', data: null }, { status: 401 })
    }

    const url = new URL(req.url)

    // 0-based page จาก client
    const page = Math.max(0, Number(url.searchParams.get('page') ?? '0') | 0)
    const size = Math.max(1, Number(url.searchParams.get('size') ?? '12') | 0)
    const type = (url.searchParams.get('type') || '').toLowerCase()

    const qs = new URLSearchParams()

    qs.set('page', String(page))
    qs.set('size', String(size))
    if (type) qs.set('type', type)

    const upstreamUrl = `${API_BASE}/api/media?${qs.toString()}`

    try {
        const up = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json',

                Authorization: `Bearer ${token}`
            },
            cache: 'no-store'
        })

        const text = await up.text()
        let json: any = null

        try {
            json = text ? JSON.parse(text) : null
        } catch {
            return NextResponse.json(
                { success: false, message: 'Upstream returned non-JSON', data: { raw: text.slice(0, 400) } },
                { status: 502 }
            )
        }

        return NextResponse.json(json, { status: up.status })
    } catch (e) {
        return NextResponse.json({ success: false, message: 'Fetch error', data: null }, { status: 500 })
    }
}
