import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Interface for the expected response from the external API
interface DeviceUsageResponse {
    success: boolean;
    message: string;
    data: {
        device_used: number;
        max_devices: number;
    };
}

export async function GET(req: NextRequest) {
    try {
        const accessToken = req.headers.get('Authorization')

        if (!accessToken || !accessToken.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Missing or malformed token', error: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        const token = accessToken.split(' ')[1]

        // Validate token format
        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Invalid token format', error: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        console.log('Making request to external API with token:', token.substring(0, 10) + '...')

        const response = await fetch('https://signboard.softacular.net/api/info/device-usage', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'NextJS-Proxy/1.0'
            },

            // Add timeout
            signal: AbortSignal.timeout(10000) // 10 seconds timeout
        })

        console.log('External API response status:', response.status)
        console.log('External API response headers:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
            const errorText = await response.text()

            console.error('External API error response:', errorText)

            return NextResponse.json(
                {
                    success: false,
                    message: `External API error: ${response.statusText}`,
                    error: errorText,
                    status: response.status
                },
                { status: response.status }
            )
        }

        const contentType = response.headers.get('content-type') || ''

        if (!contentType.includes('application/json')) {
            const text = await response.text()

            console.error('Non-JSON response from external API:', text)

            return NextResponse.json(
                {
                    success: false,
                    message: 'External API returned non-JSON response',
                    error: text
                },
                { status: 502 }
            )
        }

        const data: DeviceUsageResponse = await response.json()

        console.log('External API JSON response:', data)

        // Validate the response structure
        if (!data || typeof data !== 'object') {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid response structure from external API',
                    error: 'INVALID_RESPONSE'
                },
                { status: 502 }
            )
        }

        // Return the data with proper structure
        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })

    } catch (error: any) {
        console.error('[Device Usage Proxy Error]', {
            message: error.message,
            stack: error.stack,
            name: error.name
        })

        // Handle specific error types
        if (error.name === 'AbortError') {
            return NextResponse.json(
                { success: false, message: 'Request timeout', error: 'TIMEOUT' },
                { status: 504 }
            )
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return NextResponse.json(
                { success: false, message: 'Network error', error: 'NETWORK_ERROR' },
                { status: 503 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
            },
            { status: 500 }
        )
    }
}

// Add OPTIONS method for CORS if needed
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
