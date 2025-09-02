// File: app/api/proxy/schedule-assignments/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { API_BASE } from '../../../../libs/apiConfig'

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: 'Missing or malformed access token' }, { status: 401 })
        }

        const accessToken = authHeader.split(' ')[1]
        const body = await req.json()

        const response = await fetch(`${API_BASE}/api/schedule-assignments/create`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        const text = await response.text()

        if (!response.ok) {
            console.error('Error from external API:', text)

            return NextResponse.json({ success: false, message: text }, { status: response.status })
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
        console.error('Unexpected error:', error)

        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
    }
}
