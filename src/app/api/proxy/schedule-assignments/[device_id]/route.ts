import { NextResponse } from 'next/server'

// GET /api/schedule-assignments/[device_id]
export async function GET(
    request: Request,
    { params }: { params: { device_id: string } }
) {
    try {
        const { device_id } = params

        // ไปเรียก API backend จริง
        const response = await fetch(`https://signboard.softacular.net/api/schedule-assignments/${device_id}`, {
            headers: {
                Authorization: request.headers.get('Authorization') || ''
            }
        })

        const data = await response.json()

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { message: 'Failed to fetch schedules', error: String(error) },
            { status: 500 }
        )
    }
}
