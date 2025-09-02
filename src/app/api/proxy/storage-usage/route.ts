import { NextResponse } from "next/server";


export const runtime = 'nodejs'
import { API_BASE } from '../../../../libs/apiConfig'


export async function GET(req: Request) {
    try {
        const accessToken = req.headers.get('Authorization')?.split(' ')[1]

        if (!accessToken) {
            return NextResponse.json(
                { success: false, message: 'Missing access token' },
                { status: 401 }
            )
        }

        const response = await fetch(`${API_BASE}/api/info/storage-usage`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })


        if (!response.ok) {
            const errorText = await response.text()


            return NextResponse.json(
                { success: false, message: errorText || 'Failed to fetch storeage usage' },
                { status: response.status }
            )
        }

        const data = await response.json()


        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching storage usage:', error);

        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        )

    }
}
