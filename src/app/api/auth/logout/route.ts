// api/auth/logout/route.ts
import axios from 'axios'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  console.log('Proxy Request Body:', body)

  try {
    // 🔁 ส่งข้อมูลไปยัง API จริง
    const response = await axios.post('https://signboard.softacular.net/api/auth/logout', body)

    console.log('API Response:', response.data)

    // ✅ ตรวจสอบผลลัพธ์
    if (response.data?.success) {
      return NextResponse.json({ success: true, message: 'Logged out successfully.' }, { status: 200 })
    } else {
      return NextResponse.json(
        { success: false, message: response.data?.message || 'Unknown error' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Logout API Error:', error?.response?.data || error.message)

    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || 'Something went wrong'
      },
      { status: error?.response?.status || 500 }
    )
  }
}
