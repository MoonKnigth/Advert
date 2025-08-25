// src/app/api/auth/schedule-assignments/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    schedules_today: RawSchedule | null
    schedules_coming: RawSchedule[]
}
type UpstreamResponse = { data: RawDevice[]; message?: string; success?: boolean }

const UPSTREAM = 'https://signboard.softacular.net/api/schedule-assignments'
const HORIZONTAL = { img: '/images/tv/Vector_red.svg', style: 'แนวนอน' }

// ----- helpers -----
async function fetchUpstream(accessToken: string): Promise<UpstreamResponse> {
    const res = await fetch(UPSTREAM, {
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

function mapToRows(up: UpstreamResponse) {
    const devices = Array.isArray(up?.data) ? up.data : []
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
                status: 'กำลังฉาย'
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
                    status: 'ยังไม่เริ่ม'
                })
            }
        }
    }

    return rows
}

async function handle(req: Request) {
    try {
        const url = new URL(req.url)
        const rawMode = url.searchParams.get('raw') === '1' // <<<< เพิ่มโหมด raw

        const headerToken =
            req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
            req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')

        const cookieToken = (await cookies()).get('accessToken')?.value  // <<<< ไม่ต้อง await
        const accessToken = headerToken || cookieToken

        if (!accessToken) {
            return NextResponse.json({ success: false, message: 'Missing access token' }, { status: 401 })
        }

        const upstreamJson = await fetchUpstream(accessToken)

        // raw=1 → คืนโครงแบบรายอุปกรณ์ (ไว้ merge กับ /api/auth/device)
        if (rawMode) return NextResponse.json(upstreamJson, { status: 200 })

        // ค่า default → คืนเป็นแถวพร้อมใช้ในตาราง
        const mapped = mapToRows(upstreamJson)

        return NextResponse.json({ success: true, data: mapped }, { status: 200 })
    } catch (err: any) {
        const status = err?.status || 500
        const message = err?.message || 'Internal error'

        console.error('[/api/auth/schedule-assignments] error:', message, err?.body ?? '')

        return NextResponse.json({ success: false, message }, { status })
    }
}

export async function GET(req: Request) { return handle(req) }
export async function POST(req: Request) { return handle(req) }
