// src/pages/api/auth/refresh-token.ts
import axios from 'axios'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const body = await request.json()
    console.log('[🔁 REFRESH TOKEN] Incoming request:', body)

    try {
        const response = await axios.post('https://signboard.softacular.net/api/auth/refresh-token', body)
        console.log('[✅ API RESPONSE]', response.data)

        return NextResponse.json(response.data, { status: 200 })
    } catch (error: any) {
        console.error('[❌ REFRESH ERROR]', error?.response?.data || error.message)

        return NextResponse.json(
            {
                success: false,
                message: error?.response?.data?.message || 'Failed to refresh token'
            },
            { status: error?.response?.status || 401 }
        )
    }
}
