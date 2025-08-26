// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any))
  const { refresh_token, device_type = 'web' } = body || {}
  const authHeader = req.headers.get('authorization') // เอา Bearer จาก client

  if (!refresh_token) {
    return NextResponse.json(
      { success: false, message: 'refresh_token is required' },
      { status: 400 }
    )
  }

  try {
    const upstream = await fetch('https://signboard.softacular.net/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}) // forward Authorization -> upstream
      },
      body: JSON.stringify({ refresh_token, device_type }),
      cache: 'no-store'
    })

    const data = await upstream.json().catch(() => ({}))

    // ส่งต่อสถานะจริงจาก upstream (200/4xx/5xx)
    return NextResponse.json(data, { status: upstream.status })
  } catch (error: any) {
    console.error('Logout upstream error:', error?.message)

    return NextResponse.json(
      { success: false, message: 'Logout upstream error' },
      { status: 502 }
    )
  }
}
