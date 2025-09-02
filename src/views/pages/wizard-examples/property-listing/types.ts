export type UploadedFile = {
    file: File
    name: string
    size: number
    type: string
    preview?: string
}

// libs/media.ts
export type MediaItem = {
    id: number
    title: string
    type: 'video' | 'image'
    fileUrl: string | null
    thumbnailUrl: string | null
    duration: number | null
    fileSize: number | null
    aspectRatio: string | null
    description: string
    status: number | null   // ✅ field ที่จำเป็น
}
