// src/app/api/auth/media/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const token = req.cookies.get('accessToken')?.value

    if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const apiRes = await fetch('http://signboard.softacular.net/api/media', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (!apiRes.ok) {
            return NextResponse.json({ success: false, error: 'Failed to fetch from source' }, { status: 403 })
        }

        const data = await apiRes.json()
        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Fetch error' }, { status: 500 })
    }
}
