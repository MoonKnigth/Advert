// src/app/api/auth/refresh-token/route.ts
import { NextResponse } from 'next/server'

import { API_BASE } from '../../../../libs/apiConfig'

export async function POST(req: Request) {
    const body = await req.json().catch(() => ({}))

    // ดึง Authorization header จาก request
    const authHeader = req.headers.get('authorization')

    // 🔍 Log request data
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 [REFRESH TOKEN REQUEST]')
    console.log('📋 Request Body:', JSON.stringify(body, null, 2))
    console.log('🔐 Auth Header:', authHeader ? `Bearer ${authHeader.split(' ')[1]?.substring(0, 20)}...` : 'None')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
        const upstream = await fetch(`${API_BASE}/api/auth/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader && { 'Authorization': authHeader }) // ส่ง Authorization header ต่อไป
            },
            body: JSON.stringify(body)
        })

        const raw = await upstream.text()
        let data: any

        try {
            data = JSON.parse(raw)
        } catch {
            data = { raw }
        }

        // 🔍 Log response data
        console.log('📨 [REFRESH TOKEN RESPONSE]')
        console.log('📊 Status:', upstream.status)
        console.log('✅ Success:', data?.success || false)
        console.log('💬 Message:', data?.message || 'No message')

        if (data?.data) {
            console.log('📦 Response Data:')
            console.log('  🔑 Access Token:', data.data.access_token || 'None')
            console.log('  🔄 Refresh Token:', data.data.refresh_token || 'None')
            console.log('  ⏰ Expires In:', data.data.expires_in, 'seconds')
            console.log('  📅 Refresh Expires At:', data.data.refresh_token_expires_at)
        } else {
            console.log('❌ Raw Response:', raw?.substring(0, 500))
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        return NextResponse.json(data, { status: upstream.status })
    } catch (e: any) {
        console.error('💥 [REFRESH TOKEN ERROR]:', e.message)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        return NextResponse.json({ success: false, message: 'Failed to refresh token' }, { status: 500 })
    }
}
