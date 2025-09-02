//src/views/pages/data/editSchedules.tsx

'use client'

import type { ChangeEvent } from 'react'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'

import dynamic from 'next/dynamic'

import { VideoLibrary as VideoIcon, Image as ImageIcon } from '@mui/icons-material'
import Pagination from '@mui/material/Pagination'

// MUI
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Grid from '@mui/material/Grid2'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import { Box, FormControlLabel, Paper, Chip, TextField, Checkbox, CardContent, Card, Tab } from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'

// Others
import Cookies from 'js-cookie'
import { Icon } from '@iconify/react'

// แทนที่ import เดิม
import type {
  MediaItem,
  UploadedFile,
  EditSchedulesContentNextPayload,
  EditSchedulesSubmitPayload
} from '../../../libs/mediaTypes'

// import type { MediaItem } from '@/types/media'
import CustomTextField from '@core/components/mui/TextField'

// ===== Types =====
interface OrientationOption {
  id: 'landscape' | 'portrait'
  titleTh: string
  titleEn: string
  resolution: string
  aspectRatio: string
  isLandscape: boolean
}

// interface UploadedFile {
//   file: File
//   name: string
//   size: number
//   type: string
//   preview?: string
//   comments?: string
// }

// แก้ให้รองรับ Date ได้ด้วย
// แก้ไขฟังก์ชัน toLocalInputValue ให้แปลงวันที่ที่เลือกถูกต้อง
function toLocalInputValue(date?: string | Date) {
  if (!date) return ''

  let d: Date

  if (typeof date === 'string') {
    // ถ้าเป็น string ให้สร้าง Date object โดยไม่แปลง timezone
    if (date.includes('T')) {
      d = new Date(date)
    } else {
      // สำหรับ format "YYYY-MM-DD HH:mm:ss" ให้แปลงเป็น ISO format
      d = new Date(date.replace(' ', 'T'))
    }
  } else {
    d = date
  }

  if (isNaN(d.getTime())) return ''

  const pad = (n: number) => n.toString().padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

// แก้ไข onChange handler สำหรับ date picker
const handleDateChange = (date: Date | null, setter: React.Dispatch<React.SetStateAction<string>>) => {
  if (!date) {
    setter('')

    return
  }

  // ใช้วันที่และเวลาที่ผู้ใช้เลือกตรงๆ โดยไม่แปลง timezone
  const pad = (n: number) => n.toString().padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mi = pad(date.getMinutes())

  const localDateTimeString = `${yyyy}-${mm}-${dd}T${hh}:${mi}`

  setter(localDateTimeString)
}

// สำหรับแปลง string กลับเป็น Date object สำหรับ datepicker
function parseLocalDateTime(dateTimeString: string): Date | null {
  if (!dateTimeString) return null

  try {
    // แปลง "YYYY-MM-DDTHH:mm" เป็น Date object
    const date = new Date(dateTimeString)

    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

const AppReactDatepicker = dynamic(() => import('@/libs/styles/AppReactDatepicker'), { ssr: false })

// type MediaItem = {
//   id: number
//   title: string
//   type: 'video' | 'image'
//   status: number | null
//   fileUrl: string | null
//   thumbnailUrl: string | null
//   duration: number | null
//   fileSize: number | null
//   aspectRatio: string | null
//   description?: string | null
// }
type Props = {
  activeStep: number
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  isInternalEdit?: boolean
  onOrientationChange?: (value: 'landscape' | 'portrait') => void
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
  onNext?: (payload: EditSchedulesContentNextPayload) => void
  startAt: string
  setStartAt: React.Dispatch<React.SetStateAction<string>>
  endAt: string
  setEndAt: React.Dispatch<React.SetStateAction<string>>
  initialSelectedOldFiles?: MediaItem[]
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
const EditSchedulesContent = ({
  activeStep,

  // handleNext,
  handlePrev,
  isInternalEdit = true,
  onOrientationChange,
  oldFiles,
  setOldFiles,
  selected,
  setSelected,
  adName,
  setAdName,
  uploadedFiles,
  orientation,
  startAt, // ⬅️ เพิ่ม
  setStartAt, // ⬅️ เพิ่ม
  endAt, // ⬅️ เพิ่ม
  setEndAt, // ⬅️ เพิ่ม
  onNext, // ⬅️ เพิ่ม
  initialSelectedOldFiles
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

  const [tabValue, setTabValue] = useState<string>('1')
  const [showOldFiles, setShowOldFiles] = useState<boolean>(false)

  const cloud = 'https://cloud.softacular.net'

  // Storage usage
  const [usedByteInGB, setUsedByteInGB] = useState<number>(0)
  const [maxStorage, setMaxStorage] = useState<number>(0)

  // ✅ NEW: pagination ต่อแท็บ
  const [mediaPage, setMediaPage] = useState(0) // 0-based
  const [mediaSize] = useState(12)
  const [mediaTotalPages, setMediaTotalPages] = useState(1)
  const [mediaTotalElements, setMediaTotalElements] = useState(0)

  // ✅ NEW: cache สะสมทุกหน้าที่โหลด (id -> item) เพื่อส่ง selectedOldFiles ข้ามหน้าได้
  const mediaCacheRef = useRef<Map<number, MediaItem>>(new Map())

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

  // เติม cache ด้วยไฟล์ที่เลือกไว้จากรอบก่อน (ตอนย้อนกลับ)
  useEffect(() => {
    ;(initialSelectedOldFiles ?? []).forEach(item => {
      mediaCacheRef.current.set(item.id, item)
    })
  }, [initialSelectedOldFiles])

  useEffect(() => {
    fetchStorageUsage()
  }, [fetchStorageUsage])

  useEffect(() => {
    // เปิดโซนคลังอัตโนมัติ
    if (!showOldFiles) setShowOldFiles(true)

    // โหลดวิดีโอหน้าแรก
    fetchOldFilesPage(0, 'video')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ใน EditSchedulesContent (child)
  useEffect(() => {
    // เปิดและยิงโหลดคลังสื่อทันทีรอบแรก
    // handleOldFilesClick จะ toggle + fetch ให้เอง
    if (typeof handleOldFilesClick === 'function') {
      handleOldFilesClick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== Orientation =====
  const handleOrientationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'landscape' | 'portrait'

    onOrientationChange?.(value)
  }

  // ✅ NEW: แปลง snake_case → camelCase + เติม default
  const normalizeMedia = (m: any): MediaItem => ({
    id: Number(m?.id),
    title: String(m?.title ?? ''),
    type: (m?.type === 'video' ? 'video' : 'image') as 'video' | 'image',
    status: Number.isFinite(m?.status) ? Number(m?.status) : 1,
    fileUrl: m?.file_url ?? null,
    thumbnailUrl: m?.thumbnail_url ?? null,
    duration: m?.duration ?? null,
    fileSize: m?.file_size ?? null,
    aspectRatio: m?.aspect_ratio ?? null,
    description: m?.description ?? null
  })

  // ✅ NEW: เรียก API ตามแท็บ + เพจ (0-based)
  const fetchOldFilesPage = useCallback(
    async (page = 0, type: 'video' | 'image' = tabValue === '1' ? 'video' : 'image') => {
      const res = await fetch(`/api/auth/media?page=${page}&size=${mediaSize}&type=${type}`, {
        headers: { Authorization: `Bearer ${Cookies.get('accessToken')}`, 'Content-Type': 'application/json' }
      })

      const json = await res.json()
      const rawArr = json?.data?.media ?? []
      const normalized: MediaItem[] = rawArr.map(normalizeMedia)

      normalized.forEach(item => mediaCacheRef.current.set(item.id, item))

      setOldFiles(normalized)
      setMediaTotalPages(Number(json?.data?.total_pages ?? 1))
      setMediaTotalElements(Number(json?.data?.total_elements ?? normalized.length))
      setMediaPage(Number(json?.data?.page ?? page)) // 0-based
    },
    [mediaSize, tabValue, setOldFiles]
  )

  // ===== Old files toggle (แก้ให้เรียก fetch ตามแท็บ) =====
  const handleOldFilesClick = useCallback(async () => {
    const willExpand = !showOldFiles

    setShowOldFiles(willExpand)
    if (!willExpand) return

    // เปิดแล้วโหลดหน้าปัจจุบันของแท็บ
    const type = tabValue === '1' ? 'video' : 'image'

    await fetchOldFilesPage(0, type)
  }, [showOldFiles, tabValue, fetchOldFilesPage])

  // ===== Select toggle (คงเดิม) =====
  const handleSelect = (id: number) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  // ✅ คิด video/image จาก oldFiles (ซึ่งตอนนี้เป็น “หน้า” ของแท็บนั้น ๆ)
  const videoFiles = useMemo(() => oldFiles.filter(it => it.type === 'video' && it.status === 1), [oldFiles])
  const imageFiles = useMemo(() => oldFiles.filter(it => it.type === 'image' && it.status === 1), [oldFiles])

  // ===== เปลี่ยนแท็บ → reset page และโหลดใหม่ =====
  const handleTabChange = async (_: React.SyntheticEvent, val: string) => {
    setTabValue(val)
    setMediaPage(0)

    // โหลดเพจแรกของแท็บใหม่
    await fetchOldFilesPage(0, val === '1' ? 'video' : 'image')
  }

  // ===== render grid (แก้รูปหน้าปก) =====
  const renderMediaGrid = (mediaItems: MediaItem[]) => (
    <Grid container spacing={3}>
      {mediaItems.map(item => {
        // ✅ สร้าง src: ใช้ thumbnail ก่อน ถ้าไม่มี fallback ไป fileUrl
        const coverPath = item.thumbnailUrl || item.fileUrl || ''
        const coverSrc = coverPath.startsWith('http') ? coverPath : `${cloud}${coverPath}`

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
              {selected.includes(item.id) && (
                <Chip
                  label='เลือกแล้ว'
                  size='small'
                  color='success'
                  sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}
                />
              )}

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
              />

              <Box sx={{ position: 'relative', height: 200, bgcolor: 'grey.100', overflow: 'hidden' }}>
                <img
                  src={coverSrc}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    ;(e.currentTarget as HTMLImageElement).src =
                      item.type === 'video'
                        ? '/images/tv/default-video-thumbnail.jpg'
                        : '/images/tv/default-image-thumbnail.jpg'
                  }}
                />
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
  const handleAdNameChange = (e: ChangeEvent<HTMLInputElement>) => setAdName(e.target.value)

  // ===== Inline rename =====

  // ===== Helpers =====

  // ✅ NEW: กด Next → สร้าง selectedOldFiles จาก cache (ครบทุกหน้าที่เคยโหลด)
  const handleNextWithValidation = () => {
    // ... validation เดิม ...
    if (!adName.trim()) {
      alert('กรุณากรอกชื่อกำหนดการ')

      return
    }

    if (!startAt || !endAt) {
      alert('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด')

      return
    }

    if (new Date(startAt) > new Date(endAt)) {
      alert('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด')

      return
    }

    if (uploadedFiles.length === 0 && selected.length === 0) {
      alert('กรุณาอัพโหลดหรือเลือกไฟล์จากรายการเก่าอย่างน้อย 1 รายการ')

      return
    }

    const selectedOldFiles = selected.map(id => mediaCacheRef.current.get(id)).filter(Boolean) as MediaItem[]

    // ✅ ส่งให้พ่อผ่าน onNext เท่านั้น
    onNext?.({ selectedOldFiles })
  }

  // เรียงไฟล์: อันที่ถูกเลือก (checkbox true) มาก่อน แล้วค่อยเรียงชื่อ
  const withSelectedFirst = useCallback(
    (items: MediaItem[]) => {
      const sel = new Set(selected)

      return [...items].sort((a, b) => {
        const aa = sel.has(a.id) ? 1 : 0
        const bb = sel.has(b.id) ? 1 : 0

        if (aa !== bb) return bb - aa

        return (a.title ?? '').toLowerCase().localeCompare((b.title ?? '').toLowerCase())
      })
    },
    [selected]
  )

  const videoFilesSorted = useMemo(() => withSelectedFirst(videoFiles), [videoFiles, withSelectedFirst])
  const imageFilesSorted = useMemo(() => withSelectedFirst(imageFiles), [imageFiles, withSelectedFirst])

  // ===== Render =====
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12, lg: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
            เลือกกลุ่มทีวี
          </Typography>
          <Box sx={{ minWidth: 200 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              พื้นที่ใช้งาน {usedByteInGB.toFixed(2)} / {maxStorage.toFixed(2)} GB
            </Typography>
          </Box>
        </Box>
      </Grid>

      <Grid container spacing={3} size={{ xs: 12, md: 12, lg: 12 }}>
        {/* Start & End date-time */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <AppReactDatepicker
            showTimeSelect
            timeFormat='HH:mm'
            timeIntervals={15}
            selected={parseLocalDateTime(startAt)} // ใช้ selected แทน value
            id='start-date-time-picker'
            dateFormat='dd/MM/yyyy HH:mm'
            onChange={(date: Date | null) => handleDateChange(date, setStartAt)}
            customInput={<CustomTextField label='วันที่เริ่มต้น' fullWidth color='primary' />}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <AppReactDatepicker
            showTimeSelect
            timeFormat='HH:mm'
            timeIntervals={15}
            selected={parseLocalDateTime(endAt)} // ใช้ selected แทน value
            id='end-date-time-picker'
            dateFormat='dd/MM/yyyy HH:mm'
            onChange={(date: Date | null) => handleDateChange(date, setEndAt)}
            customInput={<CustomTextField label='วันที่สิ้นสุด' fullWidth color='primary' />}
          />
        </Grid>
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
              {/* แก้ข้อความรวมให้ใช้ meta จริง */}
              <Chip label={`${mediaTotalElements} ไฟล์ทั้งหมด`} color='secondary' variant='outlined' size='small' />
              {selected.length > 0 && (
                <Chip label={`${selected.length} ไฟล์ที่เลือก`} color='primary' variant='filled' size='small' />
              )}
            </Box>

            <Typography variant='body2' sx={{ color: 'text.disabled', mt: 1 }}>
              {showOldFiles ? 'คลิกเพื่อซ่อนรายการไฟล์' : 'คลิกเพื่อแสดงไฟล์ที่อัพโหลดไว้แล้ว'}
            </Typography>
          </Box>
        </OldFilesZone>

        {showOldFiles && oldFiles.length > 0 && (
          <Box sx={{ borderRadius: 2, overflow: 'hidden', mb: 2, backgroundColor: 'background.paper', boxShadow: 2 }}>
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

              <TabPanel value='1' sx={{ p: 3, maxHeight: 400, overflow: 'auto' }}>
                {videoFilesSorted.length > 0 ? (
                  <>
                    {renderMediaGrid(videoFilesSorted)}
                    {/* ✅ Rounded Pagination */}
                    {mediaTotalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination
                          count={mediaTotalPages}
                          page={mediaPage + 1}
                          onChange={async (_, p) => {
                            const page0 = p - 1

                            setMediaPage(page0)
                            await fetchOldFilesPage(page0, 'video')
                          }}
                          variant='tonal'
                          shape='rounded'
                          color='primary'
                          siblingCount={1}
                          boundaryCount={1}
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

              <TabPanel value='2' sx={{ p: 3, maxHeight: 400, overflow: 'auto' }}>
                {imageFilesSorted.length > 0 ? (
                  <>
                    {renderMediaGrid(imageFilesSorted)}
                    {mediaTotalPages > 1 && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination
                          count={mediaTotalPages}
                          page={mediaPage + 1}
                          onChange={async (_, p) => {
                            const page0 = p - 1

                            setMediaPage(page0)
                            await fetchOldFilesPage(page0, 'image')
                          }}
                          variant='tonal'
                          shape='rounded'
                          color='primary'
                          siblingCount={1}
                          boundaryCount={1}
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
          value={adName}
          onChange={handleAdNameChange}
        />
      </Grid>
      {/* <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label='คำอธิบาย'
          placeholder='ไม่บังคับ'
          value={adDescription}
          onChange={handleAdDescriptionChange}
        />
      </Grid> */}

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
              color='error'
              onClick={handleNextWithValidation}
              endIcon={<i className='bx bx-right-arrow-alt' />}
            >
              Next
            </Button>
          </div>
        </Grid>
      )}
    </Grid>
  )
}

export default EditSchedulesContent
type EditSchedulesProps = {
  row?: {
    name?: string
    schedule_id?: number
    direction?: { style?: string }
    start_date?: string
    end_date?: string
  }
  onClose?: () => void
  onNext?: (payload: EditSchedulesSubmitPayload) => void
  initialPayload?: EditSchedulesSubmitPayload // ⬅️ ใหม่
}

export function EditSchedules({ row, onNext, initialPayload }: EditSchedulesProps) {
  // ====== สร้าง state ที่คอมโพเนนต์เดิมต้องการ ======
  const [startAt, setStartAt] = useState<string>(toLocalInputValue(row?.start_date))
  const [endAt, setEndAt] = useState<string>(toLocalInputValue(row?.end_date))

  const [activeStep, setActiveStep] = useState(0)
  const steps = useMemo(() => [{ title: 'แก้ไขกำหนดการ', subtitle: '' }], [])

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(
    row?.direction?.style === 'แนวตั้ง' ? 'portrait' : 'landscape'
  )

  const [oldFiles, setOldFiles] = useState<MediaItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [adName, setAdName] = useState<string>(row?.name || '')
  const [adDescription, setAdDescription] = useState<string>('')
  const didInit = useRef(false)

  const handlePrev = () => setActiveStep(s => Math.max(0, s - 1))

  const handleNext = (payloadFromChild?: EditSchedulesContentNextPayload) => {
    const selectedOldFiles = payloadFromChild?.selectedOldFiles ?? oldFiles.filter(f => selected.includes(f.id))

    onNext?.({
      scheduleId: row?.schedule_id ?? 0,
      orientation,
      selectedOldFiles,
      uploadedFiles,
      adName,
      adDescription,
      startAt,
      endAt
    })
  }

  // editSchedules.tsx

  useEffect(() => {
    const id = row?.schedule_id

    if (!id) return // eslint-disable-next-line padding-line-between-statements
    ;(async () => {
      try {
        const res = await fetch(`/api/schedules/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${Cookies.get('accessToken')}`,
            Accept: 'application/json'
          },
          credentials: 'include'
        })

        if (!res.ok) throw new Error(`fetch schedule ${id} failed`)

        const json = await res.json()
        const ids = extractMediaIds(json)

        setSelected(prev => Array.from(new Set([...(prev ?? []), ...ids])))
      } catch (e) {
        console.error('load schedule medias error:', e)
      }
    })()
  }, [row?.schedule_id])

  function extractMediaIds(payload: any): number[] {
    const ads = payload?.data?.adsItems

    if (Array.isArray(ads)) {
      return ads.map((m: any) => Number(m?.id)).filter((n: number) => Number.isFinite(n))
    }

    return []
  }

  useEffect(() => {
    if (didInit.current || !initialPayload) return
    didInit.current = true

    setOrientation(initialPayload.orientation)
    setAdName(initialPayload.adName)
    setUploadedFiles(initialPayload.uploadedFiles)
    setStartAt(toLocalInputValue(initialPayload.startAt))
    setEndAt(toLocalInputValue(initialPayload.endAt))

    // กู้คืน id ที่เคยเลือกไว้
    setSelected(prev =>
      Array.from(new Set([...(prev ?? []), ...(initialPayload.selectedOldFiles || []).map(m => m.id)]))
    )
  }, [initialPayload])

  return (
    <EditSchedulesContent
      activeStep={activeStep}
      handlePrev={handlePrev}
      steps={steps}
      isInternalEdit
      onOrientationChange={setOrientation}
      oldFiles={oldFiles}
      setOldFiles={setOldFiles}
      selected={selected}
      setSelected={setSelected}
      adName={adName}
      setAdName={setAdName}
      adDescription={adDescription}
      setAdDescription={setAdDescription}
      uploadedFiles={uploadedFiles}
      setUploadedFiles={setUploadedFiles}
      orientation={orientation}
      startAt={startAt}
      setStartAt={setStartAt}
      endAt={endAt}
      setEndAt={setEndAt}
      onNext={payload => handleNext(payload)} // ✅ ส่งต่อ onNext จาก child
      initialSelectedOldFiles={initialPayload?.selectedOldFiles}
    />
  )
}
