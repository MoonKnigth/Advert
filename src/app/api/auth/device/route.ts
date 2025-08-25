// app/api/auth/device/route.ts
import { NextResponse } from 'next/server'

import axios from 'axios'

export async function POST(request: Request) {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    try {
        const response = await axios.get('https://signboard.softacular.net/api/device', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        return NextResponse.json(response.data)
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.response?.data?.message || 'Device fetch failed' },
            { status: error?.response?.status || 500 }
        )
    }
}
