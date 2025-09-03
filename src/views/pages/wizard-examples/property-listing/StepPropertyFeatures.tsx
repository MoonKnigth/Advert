//src/views/pages/wizard-examples/property-listing/StepPropertyFeatures.tsx

'use client'

// React Imports
import { useState, useEffect } from 'react'

// Next.js

// MUI Imports
import Grid from '@mui/material/Grid2'
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Container,
  Divider,
  Avatar,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Backdrop,
  CircularProgress,
  LinearProgress,
  Paper,
  Alert,
  Stack
} from '@mui/material'

// Component Imports
import { Icon } from '@iconify/react'

// Utils & APIs
import axios from 'axios'
import Cookies from 'js-cookie'
import { toast } from 'react-toastify'

import DirectionalIcon from '@components/DirectionalIcon'

/* ---------------------------------- Types ---------------------------------- */

type MediaItem = {
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

interface UploadedFile {
  file: File
  name: string
  size: number
  type: string
  preview?: string
  url?: string
  comments?: string
}

interface ScheduleItem {
  id: number
  type: string
  set_time: boolean
  set_date: boolean
  ad_run_at: string
  ad_run_at_to: string
  duration?: number
}

interface LoadingState {
  isOpen: boolean
  currentStep: number
  totalSteps: number
  stepLabel: string
  progress: number
  details?: string
  isCompleted?: boolean
  isSuccess?: boolean
}

interface ConflictInfo {
  range_a: [string, string]
  range_b: [string, string]
  schedule_id: number
  existing_schedule_id: number
}

type Props = {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  isInternal?: boolean
  orientation: 'landscape' | 'portrait'
  selectedOldFiles: MediaItem[]
  setSelectedOldFiles: React.Dispatch<React.SetStateAction<MediaItem[]>>
  adName: string
  adDescription: string
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  startDateTime: Date | null
  endDateTime: Date | null
  selectedDeviceIds: string[]
}

/* ------------------------------- Helpers/Utils ------------------------------ */

// แปลง Date -> 'YYYY-MM-DD' ตามเวลาเอเชีย/กรุงเทพ เพื่อเลี่ยงเหลื่อมจาก UTC
const formatLocalDateYYYYMMDD = (d: Date) => {
  const tz = 'Asia/Bangkok'
  const local = new Date(d.toLocaleString('en-US', { timeZone: tz }))
  const y = local.getFullYear()
  const m = String(local.getMonth() + 1).padStart(2, '0')
  const day = String(local.getDate()).padStart(2, '0')

  return `${y}-${m}-${day}`
}

// แปลงขนาดไฟล์
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1000
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// แปลงความยาววิดีโอ
const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/* --------------------------------- Component -------------------------------- */

const StepPropertyFeatures = ({
  activeStep,
  handlePrev,
  steps,
  isInternal = true,
  orientation,
  selectedOldFiles,
  adName,
  adDescription,
  uploadedFiles,
  setUploadedFiles,
  startDateTime,
  endDateTime,
  selectedDeviceIds
}: Props) => {
  const cloud = 'https://cloud.softacular.net'

  // Dialogs/Preview states
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<any>(null)
  const [currentImage, setCurrentImage] = useState<any>(null)

  // Conflict dialog state
  const [conflictDialog, setConflictDialog] = useState<{ open: boolean; info?: ConflictInfo; raw?: any }>({
    open: false
  })

  // Loading state
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isOpen: false,
    currentStep: 0,
    totalSteps: 0,
    stepLabel: '',
    progress: 0,
    details: ''
  })

  /* ------------------------------- Debug effect ------------------------------ */
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('✅ StepPropertyFeatures props', {
      orientation,
      adName,
      adDescription,
      uploadedFiles,
      selectedOldFiles,
      selectedDeviceIds
    })
  }, [orientation, adName, adDescription, uploadedFiles, selectedOldFiles, selectedDeviceIds])

  /* ------------------------ Build thumbnails for videos ---------------------- */
  useEffect(() => {
    uploadedFiles.forEach((video, index) => {
      const file = video.file

      if (!file?.type?.startsWith('video/')) return
      if (video.url) return // already prepared

      const videoElement = document.createElement('video')
      const videoUrl = URL.createObjectURL(file)

      videoElement.src = videoUrl
      videoElement.currentTime = 1

      const onLoaded = () => {
        const canvas = document.createElement('canvas')

        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
        const ctx = canvas.getContext('2d')

        ctx?.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
        const thumbnail = canvas.toDataURL('image/jpeg')

        setUploadedFiles(prev => {
          const updated = [...prev]

          updated[index] = { ...updated[index], preview: thumbnail, url: videoUrl }

          return updated
        })

        videoElement.removeEventListener('loadeddata', onLoaded)
      }

      const onError = (e: any) => {
        // eslint-disable-next-line no-console
        console.error('Error loading video:', e)
        videoElement.removeEventListener('error', onError)
      }

      videoElement.addEventListener('loadeddata', onLoaded)
      videoElement.addEventListener('error', onError)
    })
  }, [uploadedFiles, setUploadedFiles])

  useEffect(() => {
    // cleanup URLs on unmount
    return () => {
      uploadedFiles.forEach(file => {
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------------------------ Derived lists ------------------------------ */

  const uploadedVideos = uploadedFiles.filter(file => file.type.startsWith('video/'))
  const uploadedImages = uploadedFiles.filter(file => file.type.startsWith('image/'))

  const selectedOldVideos = selectedOldFiles.filter(file => file.type === 'video')
  const selectedOldImages = selectedOldFiles.filter(file => file.type === 'image')

  const allVideos = [...uploadedVideos, ...selectedOldVideos]
  const allImages = [...uploadedImages, ...selectedOldImages]

  /* ------------------------------ Loading helpers ---------------------------- */

  const updateLoadingState = (
    step: number,
    label: string,
    details?: string,
    progress?: number,
    isCompleted?: boolean,
    isSuccess?: boolean
  ) => {
    setLoadingState(prev => ({
      ...prev,
      currentStep: step,
      stepLabel: label,
      details: details || '',
      progress: typeof progress === 'number' ? progress : prev.totalSteps ? (step / prev.totalSteps) * 100 : 0,
      isCompleted: !!isCompleted,
      isSuccess: !!isSuccess
    }))
  }

  const startLoading = (totalSteps: number) => {
    setLoadingState({
      isOpen: true,
      currentStep: 0,
      totalSteps,
      stepLabel: 'เริ่มต้นกระบวนการ...',
      progress: 0,
      details: '',
      isCompleted: false,
      isSuccess: false
    })
  }

  const stopLoading = () => setLoadingState(prev => ({ ...prev, isOpen: false }))

  /* ---------------------------- Preview handlers ---------------------------- */

  const handleVideoPlay = (video: any) => {
    // ถ้าวิดีโอที่อัปโหลดใหม่ยังไม่มี url ให้สร้าง (สำรอง)
    if (video.isUploaded && !video.url) {
      const uploadedVideo = uploadedFiles.find(f => f.name === video.name)

      if (uploadedVideo?.file) {
        video.url = URL.createObjectURL(uploadedVideo.file)
      }
    }

    setCurrentVideo(video)
    setVideoDialogOpen(true)
  }

  const handleImageView = (image: any) => {
    setCurrentImage(image)
    setImageDialogOpen(true)
  }

  const handleVideoClose = () => {
    setVideoDialogOpen(false)
    setCurrentVideo(null)
  }

  const handleImageClose = () => {
    setImageDialogOpen(false)
    setCurrentImage(null)
  }

  /* ------------------------------ Main workflow ----------------------------- */

  const createScheduleAndAssign = async () => {
    const hasUpload = uploadedFiles.length > 0
    const totalSteps = hasUpload ? 3 : 2

    startLoading(totalSteps)

    try {
      let uploadedFileIds: MediaItem[] = []
      let currentStepNumber = 0

      // Step 1: Upload files (if any)
      if (hasUpload) {
        currentStepNumber++
        updateLoadingState(
          currentStepNumber,
          'กำลังอัปโหลดไฟล์สื่อ',
          `อัปโหลดไฟล์ ${uploadedFiles.length} รายการ`,
          (currentStepNumber / totalSteps) * 100
        )

        const formData = new FormData()

        uploadedFiles.forEach((file, index) => {
          formData.append(`media[${index}].name`, file.name)
          formData.append(`media[${index}].comments`, file.comments || '')
          formData.append(`media[${index}].file`, file.file)
        })

        const uploadRes = await axios.post('/api/auth/media/upload-media', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${Cookies.get('accessToken')}`
          }
        })

        if (!uploadRes.data?.success) {
          throw new Error(`Upload failed: ${uploadRes.data?.message || 'Unknown error'}`)
        }

        uploadedFileIds = uploadRes.data.data as MediaItem[]

        updateLoadingState(
          currentStepNumber,
          'อัปโหลดไฟล์สำเร็จ',
          `อัปโหลดสำเร็จ ${uploadedFileIds.length} ไฟล์`,
          (currentStepNumber / totalSteps) * 100,
          currentStepNumber === totalSteps,
          true
        )

        await new Promise(r => setTimeout(r, 600))
      }

      // Step 2: Create schedule
      currentStepNumber++
      updateLoadingState(
        currentStepNumber,
        'กำลังสร้าง Schedule',
        `สร้าง Schedule "${adName}"`,
        (currentStepNumber / totalSteps) * 100
      )

      if (!startDateTime || !endDateTime) {
        throw new Error('กรุณาระบุช่วงเวลาเริ่มต้น/สิ้นสุด')
      }

      // ใช้วันที่แบบ Local (Asia/Bangkok)
      const run_at = formatLocalDateYYYYMMDD(startDateTime)
      const run_at_to = formatLocalDateYYYYMMDD(endDateTime)

      const allMediaItems: ScheduleItem[] = []

      // New uploaded files
      uploadedFileIds.forEach(file => {
        allMediaItems.push({
          id: file.id,
          type: file.type,
          set_time: false,
          set_date: true,
          ad_run_at: run_at,
          ad_run_at_to: run_at_to,
          duration: file.type === 'image' ? 10 : undefined
        })
      })

      // Selected old files
      selectedOldFiles.forEach(file => {
        allMediaItems.push({
          id: file.id,
          type: file.type,
          set_time: false,
          set_date: true,
          ad_run_at: run_at,
          ad_run_at_to: run_at_to,
          duration: file.type === 'image' ? file.duration || 10 : undefined
        })
      })

      if (allMediaItems.length === 0) {
        throw new Error('ไม่มีไฟล์ที่สามารถใช้สร้าง Schedule ได้')
      }

      const normalizeOrientation = (value: string) =>
        value.toLowerCase() === 'landscape' ? 'horizontal' : value.toLowerCase() === 'portrait' ? 'vertical' : value

      const schedulePayload = {
        name: adName || 'Untitled Schedule',
        orientation: normalizeOrientation(orientation),
        run_at,
        run_at_to,
        schedule_items: allMediaItems
      }

      const scheduleRes = await axios.post('/api/proxy/schedules', schedulePayload, {
        headers: { 'Content-Type': 'application/json' }
      })

      const scheduleResult = scheduleRes.data

      if (!scheduleResult?.success) {
        throw new Error(`สร้าง Schedule ไม่สำเร็จ: ${scheduleResult?.message || 'Unknown error'}`)
      }

      const scheduleId = scheduleResult.data.id as number

      updateLoadingState(
        currentStepNumber,
        'สร้าง Schedule สำเร็จ',
        `Schedule ID: ${scheduleId}`,
        (currentStepNumber / totalSteps) * 100,
        currentStepNumber === totalSteps,
        true
      )

      await new Promise(r => setTimeout(r, 600))

      // Step 3: Assign schedule
      currentStepNumber++
      updateLoadingState(
        currentStepNumber,
        'กำลังมอบหมาย Schedule ให้ Device',
        `มอบหมายให้ ${selectedDeviceIds.length} เครื่อง`,
        (currentStepNumber / totalSteps) * 100
      )

      if (!selectedDeviceIds?.length) {
        throw new Error('ไม่พบ Device ที่เลือกไว้ ไม่สามารถ Assign Schedule ได้')
      }

      const assignPayload = {
        devices: selectedDeviceIds,
        groups: [],
        schedules: [{ id: scheduleId, group_id: null }]
      }

      const assignRes = await axios.post('/api/proxy/schedule-assignments', assignPayload, {
        headers: {
          Authorization: `Bearer ${Cookies.get('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })

      const assignResult = assignRes.data

      const isAssignSuccess =
        assignResult?.success === true ||
        assignResult?.success === 'true' ||
        assignResult?.message?.toLowerCase?.().includes('successfully') ||
        assignResult?.message?.toLowerCase?.().includes('assigned') ||
        assignRes.status === 200

      if (!isAssignSuccess) {
        throw new Error(`Assign failed: ${assignResult?.message || 'Unknown error'}`)
      }

      updateLoadingState(
        currentStepNumber,
        '🎉 ดำเนินการเสร็จสิ้น!',
        'สร้างและมอบหมาย Schedule สำเร็จแล้ว',
        100,
        true,
        true
      )

      await new Promise(r => setTimeout(r, 800))

      toast.success(
        <div>
          <div>🎉 สร้างและมอบหมาย Schedule สำเร็จ!</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            &quot;{scheduleResult.data.name || scheduleResult.data.scheduleNumber}&quot; → {selectedDeviceIds.length}{' '}
            Device
          </div>
        </div>,
        {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: { borderRadius: 8, fontSize: 14 }
        }
      )
    } catch (error: any) {
      // ปิดโหลดเพื่อให้ผู้ใช้ทำอย่างอื่นได้
      stopLoading()

      // ตรวจจับ 409 Overlap
      const isAxios = !!(error?.isAxiosError || (axios as any).isAxiosError?.(error))
      const status = isAxios ? error?.response?.status : undefined
      const data = isAxios ? error?.response?.data : undefined
      const msg = (data?.message || error?.message || '').toString().toLowerCase()

      if (status === 409 || msg.includes('overlap')) {
        setConflictDialog({
          open: true,
          info: data?.conflict as ConflictInfo,
          raw: data
        })

        return
      }

      // อื่น ๆ → แจ้งเตือนตามเดิม
      setLoadingState(prev => ({
        ...prev,
        isCompleted: true,
        isSuccess: false,
        stepLabel: '❌ เกิดข้อผิดพลาด',
        details: error?.message || 'Unknown error'
      }))

      toast.error(
        <div>
          <div>❌ เกิดข้อผิดพลาด</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{error?.message || 'Unknown error'}</div>
        </div>,
        {
          position: 'top-right',
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          style: { borderRadius: 8, fontSize: 14 }
        }
      )
    }
  }

  /* --------------------------- Pre-check & trigger --------------------------- */

  const checkUploadedFileStatus = async () => {
    if (!adName) {
      toast.error('กรุณาระบุชื่อ Schedule', { position: 'top-center', autoClose: 3000 })

      return
    }

    if (uploadedFiles.length === 0 && selectedOldFiles.length === 0) {
      toast.error('กรุณาเลือกไฟล์สื่อก่อนสร้าง Schedule', { position: 'top-center', autoClose: 3000 })

      return
    }

    if (!selectedDeviceIds?.length) {
      toast.error('กรุณาเลือก Device ก่อนสร้าง Schedule', { position: 'top-center', autoClose: 3000 })

      return
    }

    if (!startDateTime || !endDateTime) {
      toast.error('กรุณาระบุช่วงเวลาที่ต้องการเล่นโฆษณา', { position: 'top-center', autoClose: 3000 })

      return
    }

    await createScheduleAndAssign()
  }

  /* ------------------------------ Loading dialog ----------------------------- */

  const LoadingDialog = () => (
    <Backdrop
      sx={{ color: '#fff', zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      open={loadingState.isOpen}
      aria-live='polite'
      aria-busy={loadingState.isOpen}
    >
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, minWidth: 400, maxWidth: 500, textAlign: 'center' }}>
        <Box mb={3}>
          {loadingState.isCompleted && loadingState.isSuccess ? (
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                animation: 'bounce 0.6s ease-in-out'
              }}
            >
              <Icon icon='mdi:check-bold' color='white' width={32} height={32} />
            </Box>
          ) : (
            <CircularProgress size={60} thickness={4} />
          )}

          <Typography
            variant='h6'
            sx={{
              mt: 2,
              fontWeight: 'bold',
              color: loadingState.isCompleted && loadingState.isSuccess ? 'success.main' : 'inherit'
            }}
          >
            {loadingState.stepLabel}
          </Typography>

          {loadingState.details && (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
              {loadingState.details}
            </Typography>
          )}
        </Box>

        <Box mb={2}>
          <LinearProgress
            variant='determinate'
            value={loadingState.progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
          <Typography variant='body2' sx={{ mt: 1 }}>
            {Math.round(loadingState.progress)}% เสร็จสิ้น
          </Typography>
        </Box>

        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          ขั้นตอนที่ {loadingState.currentStep} / {loadingState.totalSteps}
          {loadingState.isCompleted && loadingState.isSuccess && (
            <Icon icon='mdi:check-circle' style={{ marginLeft: 8, verticalAlign: 'middle' }} />
          )}
        </Typography>

        <Box mt={2}>
          <Typography variant='caption' color='text.secondary'>
            {uploadedFiles.length > 0
              ? 'อัปโหลดไฟล์ → สร้างกำหนดการ → มอบหมาย Device'
              : 'สร้าง Schedule → มอบหมาย Device'}
          </Typography>
        </Box>

        {loadingState.isCompleted && (
          <Button
            variant='contained'
            color={loadingState.isSuccess ? 'success' : 'error'}
            sx={{ mt: 3 }}
            onClick={() => {
              stopLoading()
              window.location.reload()
            }}
            startIcon={<Icon icon={loadingState.isSuccess ? 'mdi:check' : 'mdi:close'} />}
          >
            {loadingState.isSuccess ? 'ดำเนินการต่อ' : 'ปิด'}
          </Button>
        )}
      </Paper>
    </Backdrop>
  )

  const truncate = (s: string, n = 20) => (s && s.length > n ? s.slice(0, n) + '…' : s)

  /* ---------------------------------- JSX ----------------------------------- */

  return (
    <>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 12 }}>
          <Typography variant='h3'>กำหนดขนาดของวิดีโอ</Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 12 }} sx={{ display: 'flex', justifyContent: 'space-around' }}>
          <Card sx={{ py: 5, display: 'flex', width: '100%' }}>
            <Container
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
              <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
                <Box
                  component='img'
                  src={
                    orientation === 'landscape' ? '/images/tv/Vector_red_big.svg' : '/images/tv/Vector_red_big_l.svg'
                  }
                  alt={orientation === 'landscape' ? 'แนวนอน (16:9)' : 'แนวตั้ง (9:16)'}
                  sx={{
                    mb: 3,
                    width: '100%',
                    height: 'auto',
                    maxWidth: '100%'
                  }}
                />
                <Typography variant='h5'>{orientation === 'landscape' ? 'แนวนอน (16:9)' : 'แนวตั้ง (9:16)'}</Typography>
              </Box>
            </Container>

            <Divider orientation='vertical' flexItem sx={{ width: 2, backgroundColor: '#ccc', borderRadius: 1 }} />

            <Container>
              <Box display='flex' alignItems='center' flexDirection='column'>
                <Box display='flex' flexDirection='column' sx={{ width: '80%' }}>
                  <Typography display='flex' variant='h3' sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {adName || 'ยังไม่ได้ระบุชื่อ'}
                  </Typography>
                  <Typography variant='h6' color='secondary' sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                    {adDescription || 'ยังไม่มีคำอธิบาย'}
                  </Typography>

                  <Divider sx={{ my: 5, height: 1.5, backgroundColor: '#ccc', borderRadius: 1 }} />

                  <Box display='flex' justifyContent='space-between' sx={{ width: '80%' }}>
                    <Box display='flex'>
                      <Avatar variant='rounded'>
                        <Icon icon='lucide:calendar-clock' color='red' width={22} />
                      </Avatar>
                      <Box display='flex' flexDirection='column' sx={{ ml: 2 }}>
                        <Typography variant='caption' color='secondary'>
                          วันที่เริ่มต้น
                        </Typography>
                        <Typography variant='caption' color='initial' suppressHydrationWarning>
                          {startDateTime ? new Date(startDateTime).toLocaleDateString('th-TH') : '-'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display='flex' flexDirection='column' sx={{ ml: 2 }}>
                      <Typography variant='caption' color='secondary'>
                        วันที่สิ้นสุด
                      </Typography>
                      <Typography variant='caption' color='initial' suppressHydrationWarning>
                        {endDateTime ? new Date(endDateTime).toLocaleDateString('th-TH') : '-'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box display='flex' sx={{ mt: 5 }}>
                    <Avatar variant='rounded'>
                      <Icon icon='fluent-mdl2:quantity' color='red' width={22} />
                    </Avatar>
                    <Box display='flex' flexDirection='column' sx={{ ml: 2 }}>
                      <Typography variant='caption' color='secondary'>
                        จำนวนโฆษณา
                      </Typography>
                      <Typography variant='caption' color='initial'>
                        {allVideos.length + allImages.length} รายการ
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box display='flex' justifyContent='space-around' sx={{ m: 4, width: '60%' }}>
                  <Box display='flex' sx={{ m: 2 }}>
                    <Avatar sx={{ bgcolor: '#FAA84E' }} variant='rounded'>
                      <Icon icon='tabler:video' color='white' width={22} />
                    </Avatar>
                    <Box display='flex' flexDirection='column' sx={{ ml: 2 }}>
                      <Typography variant='caption' color='secondary'>
                        วิดีโอ
                      </Typography>
                      <Typography variant='caption'>{allVideos.length}</Typography>
                    </Box>
                  </Box>

                  <Box display='flex' sx={{ m: 2 }}>
                    <Avatar sx={{ bgcolor: '#49AC00' }} variant='rounded'>
                      <Icon icon='material-symbols:image-outline' color='white' width={22} />
                    </Avatar>
                    <Box display='flex' flexDirection='column' sx={{ ml: 2 }}>
                      <Typography variant='caption' color='secondary'>
                        รูปภาพ
                      </Typography>
                      <Typography variant='caption'>{allImages.length}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Container>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant='h5'>รายการสื่อที่ใช้</Typography>
        </Grid>

        <Grid size={{ xs: 12 }}>
          {/* วิดีโอ */}
          {allVideos.length > 0 && (
            <Box display='flex' alignItems='center' mb={2} gap={1}>
              <Icon icon='mdi:play-box' color='red' width={24} />
              <Typography variant='h6'>ไฟล์วิดีโอ ({allVideos.length} รายการ)</Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            {uploadedVideos.map((video, index) => (
              <Grid size={{ md: 3 }} key={`uploaded-video-${index}`}>
                <Card>
                  <CardMedia
                    component='img'
                    image={video.preview || '/images/tv/default-video-thumbnail.jpg'}
                    height='200'
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={video.name}
                    >
                      {video.name}
                    </Typography>
                    <Box display='flex' justifyContent='space-between' fontSize={12} mt={0.5}>
                      <Typography sx={{ color: 'primary.main' }}>ใหม่</Typography>
                      <Typography>{formatFileSize(video.size)}</Typography>
                    </Box>
                    <Button
                      fullWidth
                      variant='outlined'
                      size='small'
                      sx={{ mt: 1 }}
                      onClick={() =>
                        handleVideoPlay({
                          name: video.name,
                          url: video.url || URL.createObjectURL(video.file),
                          file: video.file,
                          isUploaded: true
                        })
                      }
                    >
                      เล่นวิดีโอ
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {selectedOldVideos.map(video => (
              <Grid size={{ md: 3 }} key={`old-video-${video.id}`}>
                <Card>
                  <CardMedia
                    component='img'
                    image={`${cloud}${video.thumbnailUrl || video.fileUrl}`}
                    alt={video.title}
                    height='200'
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography
                      variant='body2'
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={video.title}
                    >
                      {video.title}
                    </Typography>
                    <Box display='flex' justifyContent='space-between' fontSize={12} mt={0.5}>
                      <Typography>{formatDuration(video.duration)}</Typography>
                      <Typography>{video.fileSize ? formatFileSize(video.fileSize) : 'N/A'}</Typography>
                    </Box>
                    <Button
                      fullWidth
                      variant='outlined'
                      size='small'
                      sx={{ mt: 1 }}
                      onClick={() =>
                        handleVideoPlay({
                          name: video.title,
                          url: `${cloud}${video.fileUrl}`,
                          isUploaded: false
                        })
                      }
                    >
                      เล่นวิดีโอ
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {allVideos.length > 0 && allImages.length > 0 && (
            <Divider sx={{ my: 5, height: 2, backgroundColor: '#ccc', borderRadius: 1 }} />
          )}
          {allImages.length > 0 && (
            <>
              {/* รูปภาพ */}
              <Box display='flex' alignItems='center' mb={2} gap={1}>
                <Icon icon='mdi:image' color='red' width={24} />
                <Typography variant='h6'>ไฟล์รูปภาพ ({allImages.length} รายการ)</Typography>
              </Box>

              <Grid container spacing={2}>
                {uploadedImages.map((image, index) => (
                  <Grid size={{ xs: 12, md: 3 }} key={`uploaded-image-${index}`}>
                    <Box display='flex' flexDirection='column' sx={{ alignItems: 'center' }}>
                      <Typography
                        variant='body2'
                        sx={{
                          textAlign: 'left',
                          mb: 1,
                          width: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={image.name}
                      >
                        {truncate(image.name, 28)}
                      </Typography>

                      <CardMedia
                        component='img'
                        image={image.preview}
                        alt={image.name}
                        sx={{ height: 200, objectFit: 'cover', borderRadius: 1 }}
                      />
                      <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Button
                          fullWidth
                          variant='outlined'
                          size='small'
                          sx={{ mt: 1, width: 80 }}
                          onClick={() =>
                            handleImageView({
                              name: image.name,
                              url: image.preview,
                              isUploaded: true
                            })
                          }
                        >
                          ดูรูปภาพ
                        </Button>
                      </CardContent>
                    </Box>
                  </Grid>
                ))}

                {selectedOldImages.map(image => (
                  <Grid size={{ xs: 12, md: 3 }} key={`old-image-${image.id}`}>
                    <Box display='flex' flexDirection='column' sx={{ alignItems: 'center' }}>
                      <Typography variant='body2' sx={{ textAlign: 'center', mb: 1 }} title={image.title}>
                        {truncate(image.title, 28)}

                        {/* {image.title} */}
                      </Typography>
                      <CardMedia
                        component='img'
                        image={`${cloud}${image.thumbnailUrl || image.fileUrl}`}
                        alt={image.title}
                        sx={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 1 }}
                      />
                      <CardContent sx={{ textAlign: 'center', py: 1 }}>
                        <Button
                          fullWidth
                          variant='outlined'
                          size='small'
                          sx={{ mt: 1, width: 80 }}
                          onClick={() =>
                            handleImageView({
                              name: image.title,
                              url: `${cloud}${image.fileUrl}`,
                              isUploaded: false
                            })
                          }
                        >
                          ดูรูปภาพ
                        </Button>
                      </CardContent>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Grid>

        {/* Video Dialog */}
        <Dialog open={videoDialogOpen} onClose={handleVideoClose} maxWidth='md' fullWidth>
          <DialogTitle>
            <Box display='flex' justifyContent='space-between' alignItems='center'>
              <Typography variant='h6'>{currentVideo?.name}</Typography>
              <IconButton onClick={handleVideoClose}>
                <Icon icon='material-symbols:close' />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {currentVideo && (
              <video controls width='100%' style={{ maxHeight: 400 }} autoPlay>
                <source src={currentVideo.url} type='video/mp4' />
                Your browser does not support the video tag.
              </video>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Dialog */}
        <Dialog open={imageDialogOpen} onClose={handleImageClose} maxWidth='md' fullWidth>
          <DialogTitle>
            <Box display='flex' justifyContent='space-between' alignItems='center'>
              <Typography variant='h6'>{currentImage?.name}</Typography>
              <IconButton onClick={handleImageClose}>
                <Icon icon='material-symbols:close' />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentImage.name}
                style={{ width: '100%', height: 'auto', maxHeight: 500, objectFit: 'contain' }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Footer actions */}
        {isInternal && (
          <Grid size={{ xs: 12 }}>
            <div className='flex items-center justify-between'>
              <Button
                variant='tonal'
                color='secondary'
                disabled={activeStep === 0 || loadingState.isOpen}
                onClick={handlePrev}
                startIcon={<DirectionalIcon ltrIconClass='bx-left-arrow-alt' rtlIconClass='bx-right-arrow-alt' />}
              >
                Previous
              </Button>

              <Button
                variant='contained'
                onClick={checkUploadedFileStatus}
                disabled={loadingState.isOpen}
                color={activeStep === steps.length - 1 ? 'success' : 'error'}
                endIcon={
                  loadingState.isOpen ? (
                    <CircularProgress size={20} color='inherit' />
                  ) : activeStep === steps.length - 1 ? (
                    <i className='bx-check' />
                  ) : (
                    <DirectionalIcon ltrIconClass='bx-right-arrow-alt' rtlIconClass='bx-left-arrow-alt' />
                  )
                }
              >
                {loadingState.isOpen ? 'กำลังดำเนินการ...' : 'Create Schedule & Assign'}
              </Button>
            </div>
          </Grid>
        )}
      </Grid>

      {/* Conflict / Overlap Dialog */}
      <Dialog open={conflictDialog.open} onClose={() => setConflictDialog({ open: false })} maxWidth='sm' fullWidth>
        <DialogTitle>
          <Box display='flex' alignItems='center' gap={1}>
            <Icon icon='mdi:alert' width={22} />
            ไม่สามารถมอบหมายได้ — พบการซ้อนทับของกำหนดการ
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity='error' icon={<Icon icon='mdi:calendar-alert' />} sx={{ alignItems: 'center' }}>
              ระบบพบช่วงเวลาที่ชนกันกับกำหนดการที่มีอยู่เดิม โปรดแก้ไขช่วงเวลาแล้วลองใหม่อีกครั้ง
            </Alert>

            {/* <Box>
              <Typography variant='subtitle2' color='text.secondary'>
                รายละเอียดที่ชนกัน
              </Typography>

              <Box mt={1}>
                <Typography variant='body2'>
                  <strong>Schedule ใหม่ (ID: {conflictDialog.info?.schedule_id ?? '-'})</strong>
                  <br />
                  {rangeToText(conflictDialog.info?.range_a)}
                </Typography>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant='body2'>
                  <strong>Schedule ที่มีอยู่ (ID: {conflictDialog.info?.existing_schedule_id ?? '-'})</strong>
                  <br />
                  {rangeToText(conflictDialog.info?.range_b)}
                </Typography>
              </Box>
            </Box> */}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ py: 3 }}>
          <Button variant='outlined' onClick={() => setConflictDialog({ open: false })} sx={{ mt: 3 }}>
            ปิด
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Dialog */}
      <LoadingDialog />
    </>
  )
}

export default StepPropertyFeatures
