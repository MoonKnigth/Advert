// app/api/proxy/schedules/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { API_BASE } from '../../../../libs/apiConfig'

const DEFAULT_PAGE = 0
const DEFAULT_SIZE = 10
const MAX_SIZE = 100
const TIMEOUT_MS = 10000

const toInt = (v: string | null, def: number) => {
    const n = Number(v)


    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : def
}

export async function GET(req: NextRequest) {
    try {
        // ✅ cookies() เป็น synchronous — ไม่ต้อง await
        const accessToken = (await cookies()).get('accessToken')?.value

        if (!accessToken) {
            return NextResponse.json({ success: false, message: 'Access token is missing' }, { status: 401 })
        }

        // รับ page/size จาก query (มีค่าเริ่มต้น)
        const sp = req.nextUrl.searchParams
        const page = toInt(sp.get('page'), DEFAULT_PAGE)
        const sizeRequested = toInt(sp.get('size'), DEFAULT_SIZE)
        const size = Math.min(sizeRequested || DEFAULT_SIZE, MAX_SIZE)

        // สร้าง URL: /api/schedules?page=&size=
        const url = new URL('/api/schedules', API_BASE)

        url.searchParams.set('page', String(page))
        url.searchParams.set('size', String(size))

        const ac = new AbortController()
        const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)

        const upstream = await fetch(url.toString(), {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
            signal: ac.signal
        })

        clearTimeout(timer)

        const text = await upstream.text()

        if (!upstream.ok) {
            // ดึง message จาก upstream ถ้ามี
            let msg = `API Error: ${upstream.status}`

            try {
                const j = JSON.parse(text)

                if (j?.message) msg = j.message
            } catch { }


            return NextResponse.json({ success: false, message: msg, raw: text }, { status: upstream.status })
        }

        // ✅ ส่งต่อผลลัพธ์แบบเดิม (มี data.schedules, page/size/... ตามตัวอย่าง)
        const json = JSON.parse(text)
        const res = NextResponse.json(json, { status: 200 })

        res.headers.set('Cache-Control', 'no-store')

        return res
    } catch (err: any) {
        const aborted = err?.name === 'AbortError'


        return NextResponse.json(
            { success: false, message: aborted ? 'Upstream timeout' : 'Internal server error' },
            { status: aborted ? 504 : 500 }
        )
    }
}

// POST: สร้าง schedule (ปรับให้ใช้ API_BASE และไม่ await cookies())
export async function POST(request: NextRequest) {
    try {
        const accessToken = (await cookies()).get('accessToken')?.value

        if (!accessToken) {
            return NextResponse.json({ success: false, message: 'Access token is missing' }, { status: 401 })
        }

        const body = await request.json()
        const url = new URL('/api/schedules', API_BASE)

        const upstream = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        const text = await upstream.text()

        if (!upstream.ok) {
            let msg = 'Remote API error'

            try {
                const j = JSON.parse(text)

                if (j?.message) msg = j.message
            } catch { }


            return NextResponse.json({ success: false, message: msg, raw: text }, { status: upstream.status })
        }

        const json = JSON.parse(text)
        const res = NextResponse.json(json, { status: 200 })

        res.headers.set('Cache-Control', 'no-store')

        return res
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
    }
}
