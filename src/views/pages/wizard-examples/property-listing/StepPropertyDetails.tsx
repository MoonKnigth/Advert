//src/views/pages/wizard-examples/property-listing/StepPropertyDetails.tsx

'use client'

import type { ChangeEvent, DragEvent } from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'

import { VideoLibrary as VideoIcon, Image as ImageIcon } from '@mui/icons-material'
import Pagination from '@mui/material/Pagination'

// MUI
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import {
  Box,
  FormControlLabel,
  Paper,
  IconButton,
  Alert,
  Chip,
  TextField,
  Checkbox,
  CardContent,
  Card,
  Tab,
  CircularProgress
} from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'

// Others
import Cookies from 'js-cookie'
import { Icon } from '@iconify/react'

import type { MediaItem } from '@/types/media'

// ===== Types =====
interface OrientationOption {
  id: 'landscape' | 'portrait'
  titleTh: string
  titleEn: string
  resolution: string
  aspectRatio: string
  isLandscape: boolean
}

interface UploadedFile {
  file: File
  name: string
  size: number
  type: string
  preview?: string
  comments?: string
}

type InputOrTA = HTMLInputElement | HTMLTextAreaElement

type Props = {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  isInternalEdit?: boolean
  onOrientationChange?: (value: 'landscape' | 'portrait') => void
  selectedOldFiles: MediaItem[]
  setSelectedOldFiles: React.Dispatch<React.SetStateAction<MediaItem[]>> // ✅ เพิ่มบรรทัดนี้ฃ
  oldFiles: MediaItem[]
  setOldFiles: React.Dispatch<React.SetStateAction<MediaItem[]>>
  selected: number[]
  setSelected: React.Dispatch<React.SetStateAction<number[]>>
  adName: string
  setAdName: React.Dispatch<React.SetStateAction<string>>
  adDescription: string
  setAdDescription: React.Dispatch<React.SetStateAction<string>>
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  orientation: 'landscape' | 'portrait'
}

// ป้องกัน URL เป็น cloud.softacular.netundefined
const buildCloudUrl = (cloud: string, part?: string | null) => {
  if (!part) return null
  const prefix = cloud.replace(/\/$/, '')
  const suffix = part.startsWith('/') ? part : `/${part}`

  return `${prefix}${suffix}`
}

// ทำให้โครงสร้าง media สม่ำเสมอ

const normalizeMedia = (m: any): MediaItem => {
  const rawType = String(m?.type ?? m?.file_type ?? '').toLowerCase()
  const type: 'video' | 'image' = rawType === 'video' ? 'video' : 'image'

  // ✅ แปลง status ให้เป็น number หรือ null
  const status = typeof m?.status === 'number' ? m.status : m?.status != null ? Number(m.status) : null

  return {
    id: Number(m?.id ?? 0),
    title: m?.title ?? m?.name ?? '',
    type,
    fileUrl: m?.file_url ?? m?.fileUrl ?? null,
    thumbnailUrl: m?.thumbnail_url ?? m?.thumbnailUrl ?? null,
    duration: m?.duration != null ? Number(m.duration) : null,
    fileSize: m?.file_size != null ? Number(m.file_size) : m?.fileSize != null ? Number(m.fileSize) : null,
    aspectRatio: m?.aspect_ratio ?? m?.aspectRatio ?? null,
    status // ✅ เติมให้ตรงกับ MediaItem
  }
}

// ===== Styled =====
const OrientationCard = styled(Paper, {
  shouldForwardProp: prop => prop !== 'selected'
})<{ selected?: boolean }>(({ theme, selected }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  border: `3px solid ${selected ? theme.palette.error.main : theme.palette.grey[300]}`,
  '&:hover': {
    borderColor: selected ? theme.palette.error.main : theme.palette.grey[400],
    boxShadow: theme.shadows[2]
  }
}))

const UploadZone = styled(Box, {
  shouldForwardProp: prop => prop !== 'isDragging' && prop !== 'hasError'
})<{ isDragging?: boolean; hasError?: boolean }>(({ theme, isDragging, hasError }) => ({
  border: `2px dashed ${
    hasError ? theme.palette.error.main : isDragging ? theme.palette.primary.main : theme.palette.grey[300]
  }`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  backgroundColor: isDragging ? theme.palette.primary.main + '08' : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.main + '04'
  }
}))

const FilePreview = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.grey[300]}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  backgroundColor: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: theme.spacing(2)
}))

const OldFilesZone = styled(Box, {
  shouldForwardProp: prop => prop !== 'isExpanded'
})<{ isExpanded?: boolean }>(({ theme, isExpanded }) => ({
  border: `2px dashed ${theme.palette.secondary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease-in-out',
  backgroundColor: isExpanded ? theme.palette.secondary.main + '08' : 'transparent',
  marginBottom: theme.spacing(2),
  '&:hover': {
    borderColor: theme.palette.secondary.dark,
    backgroundColor: theme.palette.secondary.main + '12',
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4]
  }
}))

// ===== Component =====
const StepPropertyDetails = ({
  activeStep,
  handleNext,
  handlePrev,
  steps,
  isInternalEdit = true,
  onOrientationChange,
  oldFiles,
  setOldFiles,
  setSelectedOldFiles,
  selected,
  setSelected,
  adName,
  setAdName,
  adDescription,
  setAdDescription,
  uploadedFiles,
  setUploadedFiles,
  orientation
}: Props) => {
  const orientationOptions: OrientationOption[] = [
    {
      id: 'landscape',
      titleTh: 'แนวนอน',
      titleEn: 'Landscape',
      resolution: '1920x1080 px',
      aspectRatio: '16:9',
      isLandscape: true
    },
    {
      id: 'portrait',
      titleTh: 'แนวตั้ง',
      titleEn: 'Portrait',
      resolution: '1080x1920 px',
      aspectRatio: '9:16',
      isLandscape: false
    }
  ]

  // Local states
  const [isDragging, setIsDragging] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [tabValue, setTabValue] = useState<'1' | '2'>('1')
  const [showOldFiles, setShowOldFiles] = useState<boolean>(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newFileName, setNewFileName] = useState<string>('')

  // ⬇️ Alert ลอย Top-Center
  const [topAlert, setTopAlert] = useState<{
    open: boolean
    msg: string
    sev: 'success' | 'error' | 'warning' | 'info'
  }>({ open: false, msg: '', sev: 'warning' })

  const alertTimerRef = useRef<number | null>(null)

  const showTopAlert = useCallback((msg: string, sev: 'success' | 'error' | 'warning' | 'info' = 'warning') => {
    setTopAlert({ open: true, msg, sev })
    if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
    alertTimerRef.current = window.setTimeout(
      () => setTopAlert(s => ({ ...s, open: false })),
      4000
    ) as unknown as number
  }, [])

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
    }
  }, [])

  // แยกตาม type จาก oldFiles (ถ้าเก็บแยกอยู่แล้ว ข้ามสองบรรทัดนี้)
  const videoFiles = oldFiles.filter(f => f.type === 'video')
  const imageFiles = oldFiles.filter(f => f.type === 'image')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaCacheRef = useRef<Map<number, MediaItem>>(new Map())
  const adNameRef = useRef<InputOrTA>(null)
  const adDescRef = useRef<InputOrTA>(null)
  const cloud = 'https://cloud.softacular.net'

  // Storage usage
  const [, setUsedByteInGB] = useState<number>(0)
  const [, setMaxStorage] = useState<number>(0)

  const [mediaPage, setMediaPage] = useState(0) // 0-based (ตรงกับ API)
  const [mediaSize, setMediaSize] = useState(12)
  const [mediaTotalPages, setMediaTotalPages] = useState(0)
  const [mediaTotalElements, setMediaTotalElements] = useState(0)
  const [mediaLoading, setMediaLoading] = useState(false)

  const fetchOldFilesPage = useCallback(
    async (page = 0, forcedType?: 'video' | 'image') => {
      try {
        setMediaLoading(true)
        const type = forcedType || (tabValue === '1' ? 'video' : 'image')
        const token = Cookies.get('accessToken') || ''

        console.log(`Fetching ${type} files for page ${page}`) // ✅ เพิ่ม debug log

        const res = await fetch(`/api/auth/media?page=${page}&size=${mediaSize}&type=${type}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          cache: 'no-store'
        })

        if (!res.ok) throw new Error('Failed to fetch media')

        const data = await res.json()
        const rawList = data?.data?.media ?? data?.media ?? []
        const normalized = Array.isArray(rawList) ? rawList.map(normalizeMedia) : []

        normalized.forEach(item => mediaCacheRef.current.set(item.id, item))
        setOldFiles(normalized)

        // ✅ ต้องแน่ใจว่า page state อัพเดทถูกต้อง
        const actualPage = data?.data?.page ?? page
        const actualTotalPages = data?.data?.total_pages ?? 0
        const actualTotalElements = data?.data?.total_elements ?? 0

        setMediaPage(actualPage)
        setMediaSize(data?.data?.size ?? mediaSize)
        setMediaTotalPages(actualTotalPages)
        setMediaTotalElements(actualTotalElements)

        console.log('Fetched page:', actualPage, 'Total pages:', actualTotalPages) // debug
      } catch (e) {
        console.error('fetchOldFilesPage error:', e)
        setOldFiles([])
        setMediaTotalPages(0)
        setMediaTotalElements(0)
      } finally {
        setMediaLoading(false)
      }
    },
    [tabValue, mediaSize, setOldFiles] // ✅ เพิ่ม setOldFiles ใน dependenciesฃ
  )

  const fetchStorageUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/proxy/storage-usage', {
        headers: { Authorization: `Bearer ${Cookies.get('accessToken')}` }
      })

      if (!response.ok) {
        const errorText = await response.text()

        console.error('Failed to fetch storage usage:', errorText)

        return
      }

      const data = await response.json()

      setUsedByteInGB((data?.data?.used_byte ?? 0) / (1000 * 1000 * 1000))
      setMaxStorage((data?.data?.max_storage ?? 0) / (1000 * 1000 * 1000))
    } catch (error) {
      console.error('Error fetching storage usage:', error)
    }
  }, [])

  useEffect(() => {
    fetchStorageUsage()
  }, [fetchStorageUsage])

  useEffect(() => {
    if (showOldFiles) {
      const t: 'video' | 'image' = tabValue === '1' ? 'video' : 'image'

      fetchOldFilesPage(0, t) // อ้างประเภทปัจจุบันแบบ explicit
    }
  }, [showOldFiles, tabValue, fetchOldFilesPage])

  // ===== File validation & uploads =====
  const validateFile = (file: File): string | null => {
    const maxSize = 120 * 1000 * 1000 // 120MB
    const allowed = ['video/mp4', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']

    if (!allowed.includes(file.type)) return 'รองรับเฉพาะไฟล์ .mp4 หรือไฟล์ภาพ (JPG, PNG, WEBP, GIF)'
    if (file.size > maxSize) return 'ขนาดไฟล์ต้องไม่เกิน 120MB'

    return null
  }

  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const next: UploadedFile[] = []
      const errs: string[] = []
      const dedupe = new Set(uploadedFiles.map(f => `${f.name}__${f.size}`))

      Array.from(files).forEach(file => {
        const err = validateFile(file)

        if (err) {
          errs.push(`${file.name}: ${err}`)

          return
        }

        const sig = `${file.name.replace(/\.[^/.]+$/, '')}__${file.size}`

        if (dedupe.has(sig)) {
          errs.push(`${file.name}: มีไฟล์ซ้ำในรายการอัปโหลด`)

          return
        }

        next.push({
          file,
          name: file.name.replace(/\.[^/.]+$/, ''),
          size: file.size,
          type: file.type,
          preview: URL.createObjectURL(file)
        })
        dedupe.add(sig)
      })

      setUploadedFiles(prev => [...prev, ...next])
      setUploadErrors(errs)
    },
    [setUploadedFiles, uploadedFiles]
  )

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files)
    if (event.target) event.target.value = ''
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFileUpload(event.dataTransfer.files)
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => {
      const copy = [...prev]
      const target = copy[index]

      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview)
      copy.splice(index, 1)

      return copy
    })
  }

  const handleRemoveAll = () => {
    setUploadedFiles(prev => {
      prev.forEach(f => f.preview?.startsWith('blob:') && URL.revokeObjectURL(f.preview))

      return []
    })
  }

  // ===== Orientation =====
  const handleOrientationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'landscape' | 'portrait'

    onOrientationChange?.(value)
  }

  const handleOldFilesClick = useCallback(() => {
    const next = !showOldFiles

    setShowOldFiles(next)

    if (next) {
      setMediaPage(0) // ✅ reset page state
      fetchOldFilesPage(0) // เริ่มหน้า 0
    }
  }, [showOldFiles, fetchOldFilesPage])

  const handleTabChange = (_: React.SyntheticEvent, val: string) => {
    setTabValue(val as '1' | '2')
    setMediaPage(0) // ✅ reset page เป็น 0 เมื่อเปลี่ยน tab

    if (showOldFiles) {
      fetchOldFilesPage(0, val === '1' ? 'video' : 'image')
    }
  }

  const handlePageChange = useCallback(
    (_: React.ChangeEvent<unknown>, newPage: number) => {
      const zeroBasedPage = newPage - 1
      const t: 'video' | 'image' = tabValue === '1' ? 'video' : 'image'

      fetchOldFilesPage(zeroBasedPage, t)
    },
    [fetchOldFilesPage, tabValue]
  )

  const handleSelect = (id: number) => {
    // หาตัว item จากหน้าที่แสดงอยู่ (หรือจาก cache ถ้ามี)
    const item = mediaCacheRef.current.get(id)

    if (!item) return

    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

    // อัปเดต selectedOldFiles แบบ toggle โดยใช้ตัว item จริงทันที
    setSelectedOldFiles(prev => {
      const exists = prev.some(m => m.id === id)

      return exists ? prev.filter(m => m.id !== id) : [...prev, item]
    })
  }

  // เดิม: const renderMediaGrid = (mediaItems: MediaItem[]) => (
  const renderMediaGrid = (mediaItems: MediaItem[]) => (
    <Grid container spacing={3}>
      {mediaItems.map(item => {
        const src = buildCloudUrl(cloud, item.thumbnailUrl || item.fileUrl) // ✅ กัน undefined

        return (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
            <Card
              onClick={() => handleSelect(item.id)}
              sx={{
                position: 'relative',
                height: '100%',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                border: selected.includes(item.id) ? 2 : 1,
                borderColor: selected.includes(item.id) ? 'primary.main' : 'divider',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
              }}
            >
              <Checkbox
                checked={selected.includes(item.id)}
                onChange={() => handleSelect(item.id)}
                onClick={e => e.stopPropagation()}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: 2,
                  '&:hover': { bgcolor: 'background.paper' }
                }}
              />{' '}
              <Box sx={{ position: 'relative', height: 200, bgcolor: 'grey.100', overflow: 'hidden' }}>
                {src ? (
                  <img
                    src={src}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'text.disabled'
                    }}
                  >
                    ไม่มีพรีวิว
                  </Box>
                )}
              </Box>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography
                  variant='h6'
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={item.title}
                >
                  {item.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )

  // ===== Ad name/desc =====
  // const handleAdNameChange = (e: ChangeEvent<HTMLInputElement>) => setAdName(e.target.value)
  // const handleAdDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => setAdDescription(e.target.value)

  // ===== Inline rename =====
  const handleEditClick = (index: number) => {
    setEditingIndex(index)
    setNewFileName(uploadedFiles[index].name)
  }

  // helper เดิมของคุณ
  const sanitizeName = (s: string) =>
    s
      .normalize('NFC')
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

  useEffect(() => {
    if (adNameRef.current) adNameRef.current.value = adName || ''
  }, [adName])

  useEffect(() => {
    if (adDescRef.current) adDescRef.current.value = adDescription || ''
  }, [adDescription])
  const allowedOneChar = /[\p{L}\p{N}\p{M} _-]/u

  const handleBeforeInput: React.InputEventHandler<InputOrTA> = e => {
    const { data } = e

    // ตรวจทุกตัวอักษร (เผื่อ paste ได้หลายตัว)
    for (const ch of data) {
      if (!allowedOneChar.test(ch)) {
        e.preventDefault()

        // TODO: แจ้งเตือนผู้ใช้ถ้าต้องการ
        return
      }
    }
  }

  // ตอนเปลี่ยนค่า: sanitize ถ้ามีตัวที่ไม่อนุญาต (แทน alert เดิม)
  // const handleAdNameChange = (e: ChangeEvent<HTMLInputElement>) => {
  //   const raw = e.target.value
  //   const clean = sanitizeName(raw)

  //   if (raw !== clean) {
  //     showTopAlert('ลบอักขระที่ไม่อนุญาตออกให้อัตโนมัติ', 'info')
  //   }

  //   setAdName(clean)
  // }

  // เก็บงานหลังพิมพ์เสร็จ (เช่นมีช่องว่างเกิน) — optional
  // const handleAdNameBlur = () => {
  //   setAdName(prev => sanitizeName(prev))
  // }

  const handleSave = () => {
    if (editingIndex === null) return

    const sanitized = newFileName
      .normalize('NFC')
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!sanitized) return setEditingIndex(null)
    setUploadedFiles(prev => {
      const updated = [...prev]

      updated[editingIndex].name = sanitized

      return updated
    })
    setEditingIndex(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditingIndex(null)
  }

  const handleCancel = () => setEditingIndex(null)

  // ===== Upload via Proxy (optional trigger elsewhere)

  // ===== Helpers =====
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 Bytes'
    const k = 1000
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const handleNextWithValidation = () => {
    // 1) อ่านค่าจาก input ที่ไม่ถูกควบคุม
    const rawName = adNameRef.current?.value ?? ''
    const rawDesc = adDescRef.current?.value ?? ''

    // 2) ทำความสะอาดชื่อ
    const name = sanitizeName(rawName)

    if (adNameRef.current) adNameRef.current.value = name // ให้ UI ตรงกับผล sanitize

    // 3) sync กลับไปยัง state ที่ต้องส่งต่อ (กันลืม setAdName / setAdDescription)
    setAdName(name)
    setAdDescription(rawDesc.trim())

    // 4) ตรวจสอบเงื่อนไขเดิม ๆ
    const msgs: string[] = []

    if (uploadedFiles.length === 0 && selected.length === 0) {
      msgs.push('กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์ (จากคลังหรืออัปโหลด)')
    }

    if (!name) {
      msgs.push('กรุณากรอกชื่อกำหนดการโฆษณา')
    } else if (!/^[\p{L}\p{N}\p{M} _-]+$/u.test(name)) {
      msgs.push('ชื่อกำหนดการฯ อนุญาตเฉพาะตัวอักษรทุกภาษา/ตัวเลข และสัญลักษณ์: เว้นวรรค, _ , -')
    }

    if (msgs.length > 0) {
      showTopAlert(msgs.join(' • '), 'warning')

      return
    }

    // 5) ผ่านทั้งหมด → ไปต่อ
    handleNext()
  }

  // ===== Render =====
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
            เลือกกลุ่มทีวี
          </Typography>
          {/* <StorageBar used={usedByteInGB} max={maxStorage} /> */}
        </Box>
      </Grid>

      {/* Orientation */}
      <Grid size={{ xs: 12, md: 12 }}>
        <RadioGroup value={orientation} onChange={handleOrientationChange} sx={{ gap: 2 }}>
          {orientationOptions.map(option => (
            <OrientationCard
              key={option.id}
              selected={orientation === option.id}
              onClick={() => onOrientationChange?.(option.id)}
              elevation={0}
            >
              <Box
                sx={{
                  p: '20px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  gap: 20
                }}
              >
                <Box display='flex' alignItems='center' gap={2}>
                  <FormControlLabel
                    value={option.id}
                    control={<Radio sx={{ p: 0, '&.Mui-checked': { color: 'success.main' } }} />}
                    label=''
                    sx={{ m: 0 }}
                  />
                  <Box>
                    <Typography variant='h3' sx={{ fontWeight: 600, mb: 0.5 }}>
                      {option.titleTh}
                    </Typography>
                    <Typography variant='h4' sx={{ color: 'text.secondary', mb: 1 }}>
                      {option.titleEn}
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                      {option.resolution}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}
                >
                  <img
                    src={option.isLandscape ? '/images/tv/Landscape.svg' : '/images/tv/Portrait.svg'}
                    height='200'
                    width='200'
                    style={{ pointerEvents: 'none' }}
                    alt={option.titleEn}
                  />
                  <Box sx={{ position: 'absolute', bottom: 100 }}>
                    <Typography variant='caption' sx={{ fontWeight: 600, color: 'grey.600' }}>
                      {option.aspectRatio}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </OrientationCard>
          ))}
        </RadioGroup>
      </Grid>

      {/* Old Files */}
      <Grid size={{ xs: 12 }}>
        <OldFilesZone isExpanded={showOldFiles} onClick={handleOldFilesClick}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '2.5rem', color: 'secondary.main' }}>
              <Icon icon='mdi:folder-multiple' />
              <Typography variant='h5' sx={{ color: 'text.secondary' }}>
                เลือกไฟล์จากคลัง
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={mediaLoading ? 'กำลังโหลด…' : `${mediaTotalElements} ไฟล์ทั้งหมด`}
                color='secondary'
                variant='outlined'
                size='small'
              />
              {selected.length > 0 && (
                <Chip label={`${selected.length} ไฟล์ที่เลือก`} color='primary' variant='filled' size='small' />
              )}
            </Box>

            <Typography variant='body2' sx={{ color: 'text.disabled', mt: 1 }}>
              {showOldFiles ? 'คลิกเพื่อซ่อนรายการไฟล์' : 'คลิกเพื่อแสดงไฟล์ที่อัพโหลดไว้แล้ว'}
            </Typography>
          </Box>
        </OldFilesZone>

        {showOldFiles && (
          <TabContext value={tabValue}>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                position: 'sticky',
                top: 0,
                bgcolor: 'background.paper',
                zIndex: 1
              }}
            >
              <TabList onChange={handleTabChange} variant='fullWidth'>
                <Tab
                  value='1'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VideoIcon />
                      <span>วิดีโอ</span>
                      <Chip label={videoFiles.length} size='small' color='primary' variant='outlined' />
                    </Box>
                  }
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
                <Tab
                  value='2'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ImageIcon />
                      <span>รูปภาพ</span>
                      <Chip label={imageFiles.length} size='small' color='secondary' variant='outlined' />
                    </Box>
                  }
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
              </TabList>
            </Box>

            {/* ใน TabPanel value='1' */}
            <TabPanel value='1' sx={{ p: 3, maxHeight: 400, overflow: 'auto' }}>
              {mediaLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : videoFiles.length > 0 ? (
                <>
                  {renderMediaGrid(videoFiles)}
                  {mediaTotalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={mediaTotalPages}
                        page={mediaPage + 1} // แปลงเป็น 1-based สำหรับ UI
                        onChange={handlePageChange}
                        variant='tonal'
                        shape='rounded'
                        color='primary'
                        siblingCount={1}
                        boundaryCount={1}
                        disabled={mediaLoading}
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                  <Typography
                    variant='caption'
                    sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}
                  >
                    หน้า {mediaPage + 1} / {Math.max(1, mediaTotalPages)} • ทั้งหมด {mediaTotalElements} ไฟล์
                  </Typography>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <VideoIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color='text.secondary'>ไม่มีไฟล์วิดีโอ</Typography>
                </Box>
              )}
            </TabPanel>

            {/* ใน TabPanel value='2' */}
            <TabPanel value='2' sx={{ p: 3, maxHeight: 400, overflow: 'auto' }}>
              {mediaLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : imageFiles.length > 0 ? (
                <>
                  {renderMediaGrid(imageFiles)}
                  {mediaTotalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Pagination
                        count={mediaTotalPages}
                        page={mediaPage + 1} // แปลงเป็น 1-based สำหรับ UI
                        onChange={handlePageChange}
                        variant='tonal'
                        shape='rounded'
                        color='primary'
                        siblingCount={1}
                        boundaryCount={1}
                        disabled={mediaLoading}
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                  <Typography
                    variant='caption'
                    sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}
                  >
                    หน้า {mediaPage + 1} / {Math.max(1, mediaTotalPages)} • ทั้งหมด {mediaTotalElements} ไฟล์
                  </Typography>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ImageIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color='text.secondary'>ไม่มีไฟล์รูปภาพ</Typography>
                </Box>
              )}
            </TabPanel>
          </TabContext>
        )}
      </Grid>

      {/* Upload zone */}
      <Grid size={{ xs: 12, md: 12 }}>
        <input
          ref={fileInputRef}
          type='file'
          accept='video/mp4,image/*'
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          multiple
        />
        <UploadZone
          isDragging={isDragging}
          hasError={uploadErrors.length > 0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role='button'
          aria-label='อัปโหลดไฟล์'
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', fontSize: '3rem', color: 'secondary.main', alignItems: 'center' }}>
              <i className='bx bx-cloud-upload' />
              <Typography variant='h5' sx={{ color: 'text.secondary', pl: 5 }}>
                ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์
              </Typography>
            </Box>
            <Typography variant='body2' sx={{ color: 'text.disabled' }}>
              รองรับไฟล์ภาพทุกชนิด และ .mp4, ขนาดวิดีโอไม่เกิน 120MB
            </Typography>
          </Box>
        </UploadZone>

        {uploadErrors.length > 0 && (
          <Alert severity='error' sx={{ mt: 2 }}>
            <strong>อัปโหลดบางไฟล์ไม่สำเร็จ:</strong>
            <Box component='ul' sx={{ pl: 3, mb: 0 }}>
              {uploadErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </Box>
          </Alert>
        )}

        {/* Uploaded list */}
        {uploadedFiles.map((file, index) => (
          <FilePreview key={`${file.name}-${file.size}-${index}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
              {/* thumbnail/ไอคอนซ้าย — คงเดิม ไม่ถูกซ่อน */}
              {file.type.startsWith('image/') ? (
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'grey.100',
                    color: 'primary.main'
                  }}
                >
                  <i className='bx bx-image' style={{ fontSize: 24 }} />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'grey.100',
                    color: 'primary.main'
                  }}
                >
                  <i className='bx bx-video' style={{ fontSize: 24 }} />
                </Box>
              )}

              {/* ✅ โซนชื่อไฟล์ + ขนาดไฟล์ (ทำเป็น relative เพื่อซ้อน TextField ทับได้) */}
              <Box
                sx={{
                  position: 'relative',
                  flex: 1, // ให้กินพื้นที่ที่เหลือ
                  minWidth: { xs: 200, sm: 320, md: 450 }
                }}
              >
                {/* โหมดแสดงผลปกติ */}
                <Box
                  sx={{
                    opacity: editingIndex === index ? 0 : 1,
                    transition: 'opacity .15s',
                    width: '600px'
                  }}
                >
                  <Typography
                    variant='h6'
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {formatFileSize(file.size)}
                  </Typography>
                </Box>

                {/* ✅ โหมดแก้ไข: ซ้อน TextField ทับเต็มพื้นที่ */}
                {editingIndex === index && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0, // เต็มกล่องชื่อไฟล์
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <TextField
                      value={newFileName}
                      onChange={e => setNewFileName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      variant='outlined'
                      size='small'
                      fullWidth // เต็มความกว้างจริง
                      autoFocus
                      sx={{
                        bgcolor: 'background.paper' // สีพื้นหลังทับข้อความเดิม
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>

            {/* ไอคอนฝั่งขวา — คุณบอกว่า "ไม่ต้องซ่อน icon" ฝั่งนี้ยังอยู่ครบ */}
            <Box display='flex' alignItems='center' gap={1}>
              {editingIndex === index ? (
                <>
                  <IconButton onClick={handleSave} color='success' sx={{ ml: 0.5 }}>
                    <i className='bx bx-check' />
                  </IconButton>
                  <IconButton onClick={handleCancel} color='error'>
                    <i className='bx bx-x' />
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton onClick={() => handleEditClick(index)} sx={{ color: 'warning.main' }} title='แก้ไขชื่อ'>
                    <i className='bx bx-edit' />
                  </IconButton>
                  <IconButton onClick={() => handleRemoveFile(index)} sx={{ color: 'error.main' }} title='ลบไฟล์นี้'>
                    <i className='bx bx-trash' />
                  </IconButton>
                </>
              )}
            </Box>
          </FilePreview>
        ))}

        {uploadedFiles.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
            <Button
              size='small'
              color='error'
              variant='outlined'
              onClick={handleRemoveAll}
              startIcon={<i className='bx bx-x' />}
            >
              ลบทั้งหมด
            </Button>
          </Box>
        )}
      </Grid>

      {/* Ad Name/Desc */}
      <Grid size={{ xs: 12, md: 12 }}>
        <Typography variant='h5' component='h3' sx={{ color: 'text.primary', mb: 2 }}>
          <strong>กำหนดชื่อกำหนดการโฆษณา</strong>
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label='ชื่อ'
          placeholder='ตั้งชื่อตามต้องการ'
          defaultValue={adName} // ✅ ใช้ defaultValue
          inputRef={adNameRef} // ✅ เก็บ DOM ref
          inputProps={{ onBeforeInput: handleBeforeInput }} // ✅ กันอักษรต้องห้ามระหว่างพิมพ์
          onBlur={() => {
            // sanitize ที่ตัว input โดยไม่ต้อง setState เพื่อลื่นสุด
            const v = sanitizeName(adNameRef.current?.value || '')

            if (adNameRef.current) adNameRef.current.value = v

            // ถ้าต้องการให้ state ด้านข้าง (เช่น preview card) อัปเดตตอน blur ด้วย ก็ปลดคอมเมนต์บรรทัดล่าง
            // setAdName(v)
          }}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label='คำอธิบาย'
          placeholder='ไม่บังคับ'
          defaultValue={adDescription} // ✅ ใช้ defaultValue
          inputRef={adDescRef} // ✅ เก็บ DOM ref (textarea)
          // ไม่ต้อง onChange เพื่อเลี่ยง re-render ทุกคีย์
        />
      </Grid>

      {/* Footer */}
      {isInternalEdit && (
        <Grid size={{ xs: 12 }}>
          <div className='flex items-center justify-between'>
            <Button
              variant='tonal'
              color='secondary'
              disabled={activeStep === 0}
              onClick={handlePrev}
              startIcon={<i className='bx bx-left-arrow-alt' />}
            >
              Previous
            </Button>
            <Button
              variant='contained'
              color={activeStep === steps.length - 1 ? 'success' : 'error'}
              onClick={handleNextWithValidation}
              endIcon={
                activeStep === steps.length - 1 ? <i className='bx-check' /> : <i className='bx bx-right-arrow-alt' />
              }
            >
              {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </div>
        </Grid>
      )}
      {topAlert.open && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: theme => theme.zIndex.modal + 1,
            width: { xs: '90%', sm: 'auto' }
          }}
        >
          <Alert
            variant='filled'
            severity={topAlert.sev}
            onClose={() => setTopAlert(s => ({ ...s, open: false }))}
            sx={{ boxShadow: 3 }}
          >
            {topAlert.msg}
          </Alert>
        </Box>
      )}
    </Grid>
  )
}

export default StepPropertyDetails
