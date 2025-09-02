// lib/mediaService.ts
import { API_BASE } from '../../libs/apiConfig'

export interface RawMediaItem {
    id: number
    title: string
    description: string
    type: 'video' | 'photo'
    fileUrl: string
    thumbnailUrl: string
    duration: number
    fileSize: number
}

export async function fetchMedia(): Promise<RawMediaItem[]> {
    const res = await fetch(`${API_BASE}/api/media`)
    const result = await res.json()

    if (result.success && Array.isArray(result.data?.media)) {
        return result.data.media
    } else {
        throw new Error('Invalid media format or API error')
    }
}
