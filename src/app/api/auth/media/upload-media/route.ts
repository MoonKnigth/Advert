// /src/app/api/auth/upload-media/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const contentType = req.headers.get('content-type') || ''
        const authHeader = req.headers.get('authorization') || ''

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': contentType,
                Authorization: authHeader
            },
            body: req.body,
            duplex: 'half'
        } as any

        const res = await fetch('https://signboard.softacular.net/api/media/upload', options)



        const text = await res.text()

        console.log('[Proxy Upload Response Raw]:', text)
        let result

        try {
            result = JSON.parse(text)
            console.log('[Proxy Upload Parsed JSON]:', result)
        } catch (jsonError) {
            // ไม่ใช่ json
            console.error('[❌ ไม่ใช่ JSON]', text)

            return NextResponse.json(
                {
                    success: false,
                    message: 'Invalid response from server. Raw data logged.',
                    raw: text
                },
                { status: 502 }
            )
        }


        return NextResponse.json(result, { status: res.status })

    } catch (err: any) {
        console.error('[❌ Upload Proxy Error]', err?.message || err)

        return NextResponse.json(
            { success: false, message: err?.message || 'Upload proxy failed' },
            { status: 500 }
        )
    }
}
