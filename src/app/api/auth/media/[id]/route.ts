import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server'

// ใช้ env ได้: MEDIA_API_BASE=https://signboard.softacular.net/api
const API_BASE = process.env.MEDIA_API_BASE ?? 'https://signboard.softacular.net/api'

// ลด latency/cold start
export const runtime = 'edge'
export const preferredRegion = ['sin1', 'hkg1']
export const revalidate = 0

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params // ต้อง await ตาม error ที่เจอ

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing media id', data: null }, { status: 400 })
    }

    // เอา token จาก header (หรือ cookie ถ้าจำเป็น)
    const headerAuth = req.headers.get('authorization')
    const cookieToken = req.cookies.get('accessToken')?.value
    const authHeader = headerAuth || (cookieToken ? `Bearer ${cookieToken}` : '')

    if (!authHeader) {
        return NextResponse.json({ success: false, message: 'Unauthorized', data: null }, { status: 401 })
    }

    let payload: any = null

    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid JSON body', data: null }, { status: 400 })
    }

    // ส่งต่อเฉพาะ field ที่รองรับ
    const body: Record<string, any> = {}

    if (typeof payload?.title === 'string') body.title = payload.title
    if (typeof payload?.description === 'string') body.description = payload.description

    if (!Object.keys(body).length) {
        return NextResponse.json(
            { success: false, message: 'Nothing to update. Provide title and/or description.', data: null },
            { status: 400 }
        )
    }

    const upstream = await fetch(`${API_BASE}/media/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
        },
        body: JSON.stringify(body),

        // Edge fetch default: keepalive=false, no need special
    })

    let data: any = null

    try {
        data = await upstream.json()
    } catch {
        // กรณี upstream ไม่ส่ง JSON กลับ
    }

    return NextResponse.json(
        data ?? { success: upstream.ok, message: upstream.statusText, data: null },
        { status: upstream.status }
    )
}
