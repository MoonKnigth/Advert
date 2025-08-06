// api/proxy/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
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

        // เรียก API ของ signboard
        const response = await fetch('http://signboard.softacular.net/api/schedules', {
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
        console.error('Error fetching schedules:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST: สร้าง schedule ใหม่
export async function POST(request: NextRequest) {
    try {
        const accessToken = (await cookies()).get('accessToken')?.value

        if (!accessToken) {
            return NextResponse.json(
                { success: false, message: 'Access token is missing' },
                { status: 401 }
            )
        }

        const body = await request.json()

        const response = await fetch('http://signboard.softacular.net/api/schedules', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        const text = await response.text()

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Remote API error`,
                    raw: text
                },
                { status: response.status }
            )
        }

        const result = JSON.parse(text)
        return NextResponse.json(result)
    } catch (error) {
        console.error('Error creating schedule:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
