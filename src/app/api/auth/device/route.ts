// app/api/auth/device/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { API_BASE } from '../../../../libs/apiConfig'

const DEFAULT_PAGE = 0
const DEFAULT_SIZE = 10
const MAX_SIZE = 100
const TIMEOUT_MS = 10000

type RawDevice = {
    device_id: string
    client_id: string
    name: string
    platform: string
    description: string
    hashed_refresh_token?: string
    refresh_token_expires_at: string
    status: number
    is_deleted: boolean
    revoked: boolean
    created_at: string
    created_by: number
    updated_at: string
    updated_by: number
}

type UpstreamPayload = {
    success: boolean
    message: string
    data: {
        devices: RawDevice[]
        page: number
        size: number
        total_elements: number
        total_pages: number
        has_next: boolean
        has_prev: boolean
    }
}

function parseIntSafe(v: string | null, def: number) {
    const n = v ? Number(v) : NaN


    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def
}

function parseBool(v: string | null) {
    if (v == null) return undefined

    return v === 'true' ? true : v === 'false' ? false : undefined
}

async function handler(req: NextRequest) {
    // ---- Auth: header or cookie ----
    const headerAuth = req.headers.get('authorization') || req.headers.get('Authorization')
    let token = headerAuth?.startsWith('Bearer ') ? headerAuth.split(' ')[1] : undefined

    if (!token) token = req.cookies.get('accessToken')?.value

    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // ---- Query params ----
    const sp = req.nextUrl.searchParams
    const page = parseIntSafe(sp.get('page'), DEFAULT_PAGE)
    const requestedSize = parseIntSafe(sp.get('size'), DEFAULT_SIZE)
    const size = Math.min(requestedSize || DEFAULT_SIZE, MAX_SIZE)

    const q = sp.get('q')?.trim() || undefined
    const statusFilter = sp.get('status') != null ? Number(sp.get('status')) : undefined
    const revokedFilter = parseBool(sp.get('revoked'))
    const deletedFilter = parseBool(sp.get('is_deleted'))

    // ---- Call upstream with page/size ----
    const url = new URL('/api/device', API_BASE)

    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS)

    let upstream: UpstreamPayload

    try {
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: ac.signal
        })

        clearTimeout(t)

        if (!res.ok) {
            // Try to read upstream json error, otherwise fallback
            const text = await res.text().catch(() => '')
            let message = `Device fetch failed (${res.status})`

            try {
                const j = JSON.parse(text)

                if (j?.message) message = j.message
            } catch { }


            return NextResponse.json({ success: false, message }, { status: res.status })
        }

        upstream = (await res.json()) as UpstreamPayload
    } catch (err: any) {
        clearTimeout(t)
        const aborted = err?.name === 'AbortError'


        return NextResponse.json(
            { success: false, message: aborted ? 'Upstream timeout' : 'Upstream request error' },
            { status: 504 }
        )
    }

    // ---- Sanitize & optional local filtering ----
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const sanitized = upstream.data.devices.map(({ hashed_refresh_token, ...rest }) => rest)

    const needLocalFilter = q != null || statusFilter != null || revokedFilter != undefined || deletedFilter != undefined

    let filtered = sanitized

    if (needLocalFilter) {
        filtered = sanitized.filter(d => {
            if (statusFilter != null && d.status !== statusFilter) return false
            if (revokedFilter !== undefined && d.revoked !== revokedFilter) return false
            if (deletedFilter !== undefined && d.is_deleted !== deletedFilter) return false

            if (q) {
                const hay = `${d.device_id} ${d.name} ${d.client_id} ${d.platform} ${d.description ?? ''}`.toLowerCase()

                if (!hay.includes(q.toLowerCase())) return false
            }


            return true
        })

        // Re-paginate locally after filter
        const start = page * size
        const end = start + size
        const slice = filtered.slice(start, end)

        const total = filtered.length
        const totalPages = Math.max(1, Math.ceil(total / size))

        const resp = NextResponse.json(
            {
                success: true,
                message: upstream.message || 'Devices fetched.',
                data: {
                    devices: slice,
                    page,
                    size,
                    total_elements: total,
                    total_pages: totalPages,
                    has_next: end < total,
                    has_prev: page > 0
                }
            },
            { status: 200 }
        )

        resp.headers.set('Cache-Control', 'no-store')

        return resp
    }

    // No local filter -> keep upstream pagination, but still sanitized
    const resp = NextResponse.json(
        {
            success: upstream.success,
            message: upstream.message,
            data: {
                ...upstream.data,
                devices: sanitized
            }
        },
        { status: 200 }
    )

    resp.headers.set('Cache-Control', 'no-store')

    return resp
}

export async function GET(req: NextRequest) {
    return handler(req)
}

export async function POST(req: NextRequest) {
    // รองรับ client เก่าที่เรียก POST — จะอ่าน query จาก URL เหมือนกัน
    return handler(req)
}
