import { NextResponse } from 'next/server'
// import Cookies from 'js-cookie' // REMOVE THIS LINE

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        // 1. Get the Authorization header from the incoming request
        const authHeader = req.headers.get('Authorization')

        // 2. Check if the header exists and is correctly formatted
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Missing or malformed access token' }, { status: 401 })
        }

        // 3. Extract the token from the "Bearer <token>" string
        const accessToken = authHeader.split(' ')[1]

        const response = await fetch('https://signboard.softacular.net/api/schedule-assignments', {
            method: 'GET', // Note: The external API call is a GET request
            headers: {
                // 4. Use the extracted token to authorize with the external API
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        })

        const contentType = response.headers.get('Content-Type')
        if (contentType && contentType.includes('text/html')) {
            return NextResponse.json({ success: false, message: 'Unexpected HTML response from API' }, { status: 500 })
        }

        const text = await response.text()
        if (!response.ok) {
            console.error('Error fetching API:', text)
            return NextResponse.json({ success: false, message: `Error from external API: ${text}` }, { status: response.status })
        }

        let data
        try {
            data = JSON.parse(text)
        } catch (e) {
            console.error('Failed to parse JSON:', e)
            return NextResponse.json({ success: false, message: 'Invalid JSON response from API' }, { status: 500 })
        }

        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        if (error instanceof Error) {
            console.error('Unexpected error:', error)
            return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 })
        } else {
            console.error('Unexpected error:', error)
            return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
        }
    }
}
