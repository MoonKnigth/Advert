// src/app/api/auth/schedule-assignments/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { API_BASE } from '../../../../libs/apiConfig'


// ===== Types =====
type RawSchedule = {
    schedule_id: number
    schedule_number: string
    schedule_name: string
    run_at: string
    run_at_to: string
}
type RawDevice = {
    device_id?: string
    name?: string
    platform?: string
    status?: number
    is_deleted?: boolean
    revoked?: boolean
    created_at?: string
    updated_at?: string
    schedules_today: RawSchedule | null
    schedules_coming: RawSchedule[]
}

type UpstreamPayload = {
    success?: boolean
    message?: string
    data?: {
        devices?: RawDevice[]
        page?: number
        size?: number
        total_elements?: number
        total_pages?: number
        has_next?: boolean
        has_prev?: boolean
    }
}

const UPSTREAM = `${API_BASE}/api/schedule-assignments`
const HORIZONTAL = { img: '/images/tv/Vector_red.svg', style: 'แนวนอน' }

// ----- helpers -----
async function fetchUpstream(accessToken: string, page = 0, size = 10): Promise<UpstreamPayload> {
    const url = new URL(UPSTREAM)

    url.searchParams.set('page', String(page))
    url.searchParams.set('size', String(size))

    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        cache: 'no-store'
    })

    const text = await res.text()
    let json: any

    try {
        json = JSON.parse(text)
    } catch {
        const msg = `Upstream returned non-JSON (status ${res.status})`

        throw Object.assign(new Error(msg), { status: res.status, body: text.slice(0, 400) })
    }

    if (!res.ok) {
        const msg = json?.message || `Upstream error ${res.status}`

        throw Object.assign(new Error(msg), { status: res.status, body: json })
    }

    return json
}

function mapToRows(up: UpstreamPayload) {
    const devices: RawDevice[] = Array.isArray(up?.data?.devices) ? up!.data!.devices! : []
    let id = 1
    const rows: any[] = []

    for (const d of devices) {
        if (d?.schedules_today) {
            const s = d.schedules_today

            rows.push({
                id: id++,
                schedule_id: s.schedule_id,
                campaing_code: s.schedule_number,
                name: s.schedule_name,
                start_date: s.run_at,
                end_date: s.run_at_to,
                direction: HORIZONTAL,
                status: 'กำลังฉาย',
                device_id: d.device_id
            })
        }

        if (Array.isArray(d?.schedules_coming)) {
            for (const s of d.schedules_coming) {
                rows.push({
                    id: id++,
                    schedule_id: s.schedule_id,
                    campaing_code: s.schedule_number,
                    name: s.schedule_name,
                    start_date: s.run_at,
                    end_date: s.run_at_to,
                    direction: HORIZONTAL,
                    status: 'ยังไม่เริ่ม',
                    device_id: d.device_id
                })
            }
        }
    }

    return rows
}

async function handle(req: Request) {
    try {
        const url = new URL(req.url)
        const rawMode = url.searchParams.get('raw') === '1'
        const page = Number(url.searchParams.get('page') ?? '0')
        const size = Number(url.searchParams.get('size') ?? '10')

        // token: header > cookie
        const headerAuth = req.headers.get('authorization') || req.headers.get('Authorization')
        const tokenFromHeader = headerAuth?.replace(/^Bearer\s+/i, '')
        const cookieToken = (await cookies()).get('accessToken')?.value
        const accessToken = tokenFromHeader || cookieToken

        if (!accessToken) {
            return NextResponse.json({ success: false, message: 'Missing access token' }, { status: 401 })
        }

        const upstreamJson = await fetchUpstream(accessToken, isNaN(page) ? 0 : page, isNaN(size) ? 10 : size)

        // raw=1 → ส่งคืนตาม upstream (มี devices + meta)
        if (rawMode) return NextResponse.json(upstreamJson, { status: 200 })

        // ปกติ → แปลงเป็น rows + แนบ meta ไว้ใน data
        const rows = mapToRows(upstreamJson)

        const meta = {
            page: upstreamJson?.data?.page ?? page,
            size: upstreamJson?.data?.size ?? size,
            total_elements: upstreamJson?.data?.total_elements ?? rows.length,
            total_pages: upstreamJson?.data?.total_pages ?? 1,
            has_next: upstreamJson?.data?.has_next ?? false,
            has_prev: upstreamJson?.data?.has_prev ?? false
        }

        return NextResponse.json({ success: true, data: { rows, ...meta } }, { status: 200 })
    } catch (err: any) {
        const status = err?.status || 500
        const message = err?.message || 'Internal error'

        console.error('[/api/auth/schedule-assignments] error:', message, err?.body ?? '')

        return NextResponse.json({ success: false, message }, { status })
    }
}

export async function GET(req: Request) { return handle(req) }
export async function POST(req: Request) { return handle(req) }
