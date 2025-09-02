// src/app/api/resend-otp/route.ts

import { NextResponse } from 'next/server'

import axios from 'axios'

import { API_BASE } from '../../../../libs/apiConfig'

export async function POST(req: Request) {
  const body = await req.json()

  console.log('[🔁 RESEND OTP] Proxy Request Body:', body)

  try {
    const response = await axios.post(`${API_BASE}/api/auth/resend-otp`, body)

    console.log('[✅ API RESPONSE]', response.data)

    return NextResponse.json(response.data, { status: 200 })
  } catch (error: any) {
    console.error('[❌ RESEND OTP ERROR]', error?.response?.data || error.message)

    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || 'Failed to resend OTP'
      },
      { status: error?.response?.status || 400 }
    )
  }
}
