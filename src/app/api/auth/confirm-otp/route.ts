import { NextResponse } from 'next/server'

import axios from 'axios'

import { API_BASE } from '../../../../libs/apiConfig'

export async function POST(req: Request) {
  const body = await req.json()

  console.log('Proxying confirm-otp with body:', body)

  try {
    const response = await axios.post(`${API_BASE}/api/auth/confirm-otp`, body)

    console.log('API Response:', response.data)

    return NextResponse.json(response.data, { status: 200 })
  } catch (error: any) {
    console.error('API Error:', error?.response?.data || error.message)

    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || 'Something went wrong'
      },
      { status: error?.response?.status || 500 }
    )
  }
}
