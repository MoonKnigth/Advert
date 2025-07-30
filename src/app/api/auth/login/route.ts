import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: Request) {
  const body = await request.json()
  console.log('Proxy Request Body:', body)

  try {
    const response = await axios.post('https://signboard.softacular.net/api/auth/login', body)
    const data = response.data

    console.log('API Response:', data)

    if (data && data.success) {
      return NextResponse.json(data, { status: 200 })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Invalid email or password'
        },
        { status: 401 }
      )
    }
  } catch (error: any) {
    // ✅ ตรวจจับ error ที่มาจาก API
    console.error('Login error:', error?.response?.data || error.message)

    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || 'Internal server error'
      },
      { status: error?.response?.status || 500 }
    )
  }
}
