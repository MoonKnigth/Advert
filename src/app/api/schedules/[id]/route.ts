
// api/schedules/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // ดึง accessToken จาก cookies
        const cookieStore = cookies()
        const accessToken = (await cookieStore).get('accessToken')?.value

        if (!accessToken) {
            return NextResponse.json(
                { success: false, message: 'Access token is missing' },
                { status: 401 }
            )
        }

        const { id } = params

        // เรียก API ของ signboard สำหรับ schedule เฉพาะ
        const response = await fetch(`http://signboard.softacular.net/api/schedules/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            return NextResponse.json(
                { success: false, message: `API Error: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error(`Error fetching schedule ${params.id}:`, error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
