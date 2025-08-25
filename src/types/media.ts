// src/types/media.ts
export type MediaKind = 'video' | 'image';

export interface MediaItem {
    id: number
    title: string
    type: string | MediaKind   // หรือจะใช้แค่ string ก็ได้
    fileUrl: string | null
    thumbnailUrl: string | null
    duration: number | null
    fileSize: number | null
    status: number | null
    aspectRatio: string | null
}
