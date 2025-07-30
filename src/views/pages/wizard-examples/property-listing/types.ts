export type UploadedFile = {
    file: File
    name: string
    size: number
    type: string
    preview?: string
}

export type MediaItem = {
    id: number
    title: string
    type: string
    fileUrl: string | null
    thumbnailUrl: string | null
    duration: number | null
    fileSize: number | null
    status: number | null
    aspectRatio: string | null
}
