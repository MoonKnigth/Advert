// src/app/api/schedules/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Get cookies and params
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('accessToken')?.value
        const { id } = await context.params

        // Debug logging
        console.log('🔍 Debug Info:')
        console.log('- Received ID:', id)
        console.log('- ID type:', typeof id)
        console.log('- Access token exists:', !!accessToken)

        // Validate access token
        if (!accessToken) {
            console.error('❌ Access token is missing')
            return NextResponse.json(
                { success: false, message: 'Access token is missing' },
                { status: 401 }
            )
        }

        // Validate and sanitize ID
        if (!id || id === 'undefined' || id === 'null' || id.trim() === '') {
            console.error('❌ Invalid schedule ID:', id)
            return NextResponse.json(
                { success: false, message: 'Valid schedule ID is required' },
                { status: 400 }
            )
        }

        // Additional ID validation (must be numeric or valid format)
        const sanitizedId = id.toString().trim()
        if (!/^[0-9]+$/.test(sanitizedId)) {
            console.error('❌ Schedule ID must be numeric:', sanitizedId)
            return NextResponse.json(
                { success: false, message: 'Schedule ID must be a valid number' },
                { status: 400 }
            )
        }

        const apiUrl = `http://signboard.softacular.net/api/schedules/${sanitizedId}`
        console.log('🚀 Calling API:', apiUrl)

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })

        console.log('📡 API Response Status:', response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ API Error Response:', errorText)

            return NextResponse.json(
                {
                    success: false,
                    message: `API Error: ${response.status} - ${response.statusText}`,
                    details: errorText
                },
                { status: response.status }
            )
        }

        const data = await response.json()
        console.log('✅ API Success - Data received:', Object.keys(data))

        return NextResponse.json(data)

    } catch (error) {
        console.error('💥 Unexpected error in schedule API:', error)

        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

// เพิ่ม PUT และ DELETE methods ถ้าต้องการ
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('accessToken')?.value
        const { id } = await context.params

        if (!accessToken) {
            return NextResponse.json(
                { success: false, message: 'Access token is missing' },
                { status: 401 }
            )
        }

        if (!id || id === 'undefined' || !/^[0-9]+$/.test(id.toString().trim())) {
            return NextResponse.json(
                { success: false, message: 'Valid schedule ID is required' },
                { status: 400 }
            )
        }

        const body = await req.json()

        const response = await fetch(`http://signboard.softacular.net/api/schedules/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
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
        console.error('Error updating schedule:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('accessToken')?.value
        const { id } = await context.params

        if (!accessToken) {
            return NextResponse.json(
                { success: false, message: 'Access token is missing' },
                { status: 401 }
            )
        }

        if (!id || id === 'undefined' || !/^[0-9]+$/.test(id.toString().trim())) {
            return NextResponse.json(
                { success: false, message: 'Valid schedule ID is required' },
                { status: 400 }
            )
        }

        const response = await fetch(`http://signboard.softacular.net/api/schedules/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
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
        console.error('Error deleting schedule:', error)
        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        )
    }
}
