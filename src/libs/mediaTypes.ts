export type MediaItem = {
    id: number
    title: string
    type: 'video' | 'image'
    fileUrl: string | null
    thumbnailUrl: string | null
    status?: number | null
    duration?: number | null
    fileSize?: number | null
    aspectRatio?: string | null
    description: string | null
}

export type UploadedFile = {
    file: File
    name: string
    size: number
    type: string
    preview?: string
    comments?: string
}

export type EditSchedulesContentNextPayload = {

    // payload จากหน้าที่ “เลือกสื่อ” (child → wrapper)
    selectedOldFiles?: MediaItem[]
    adName?: string; // ✅ เพิ่มฟิลด์นี้

}

export type EditSchedulesSubmitPayload = {

    // payload ที่ wrapper ส่งกลับ “พ่อ” (DataTable)
    scheduleId: number
    orientation: 'landscape' | 'portrait'
    selectedOldFiles: MediaItem[]
    uploadedFiles: UploadedFile[]
    adName: string
    adDescription: string
    startAt: string
    endAt: string
}
