// middleware.ts
import { NextResponse } from 'next/server'
import cookies from 'next-cookies'

export function middleware(req: any) {
  // ดึง cookies จาก request
  const { accessToken } = cookies({ req })

  if (!accessToken) {
    // ถ้าไม่มี token ให้ส่งไปหน้า login
    return NextResponse.redirect('/pages/auth/login')
  }

  // ถ้ามี token ให้ส่งต่อไปยังหน้าอื่นๆ
  return NextResponse.next()
}
