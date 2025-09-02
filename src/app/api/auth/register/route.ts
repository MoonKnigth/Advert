// src/app/api/register/route.ts

import { NextResponse } from 'next/server'

import axios from 'axios'

import { API_BASE } from '../../../../libs/apiConfig'

export async function POST(req: Request) {
  const body = await req.json()

  try {
    const response = await axios.post(`${API_BASE}/api/auth/register`, body)

    return NextResponse.json(response.data, { status: 200 })
  } catch (error: any) {
    console.error('[❌ REGISTER ERROR]', error?.response?.data || error.message)

    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || 'Registration failed'
      },
      { status: error?.response?.status || 400 }
    )
  }
}
