//src/views/pages/wizard-examples/property-listing/index.tsx
'use client'

// React Imports
import { useCallback, useEffect, useRef, useState } from 'react'

import { Icon } from '@iconify/react'

// MUI Imports
import { styled } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stepper from '@mui/material/Stepper'
import MuiStep from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Typography from '@mui/material/Typography'
import type { StepProps } from '@mui/material/Step'

// Component Imports
import Cookies from 'js-cookie'

import CustomAvatar from '@core/components/mui/Avatar'
import StepPersonalDetails from './StepPersonalDetails'
import StepPropertyDetails from './StepPropertyDetails'
import StepPropertyFeatures from './StepPropertyFeatures'

import StepperWrapper from '@core/styles/stepper'
import type { MediaItem } from '@/types/media'

const steps = [
  {
    icon: 'fluent:calendar-clock-32-regular',
    title: 'มอบหมายกำหนดการ',
    subtitle: 'เลือกกลุ่มทีวี / กำหนดเวลา'
  },
  {
    icon: 'carbon:video-chat',
    title: 'จัดการสื่อโฆษณา',
    subtitle: 'ตั้งชื่อกำหนดการ / กำหนดขนาด'
  },
  {
    icon: 'hugeicons:note',
    title: 'สรุปรายการ',
    subtitle: 'รายละเอียดของกำหนดการ'
  }
]

// ---- helpers สำหรับ media (วางบนสุดของไฟล์) ----
const extractMediaArray = (payload: any): any[] => {
  if (!payload) return []

  const directCandidates: any[] = [
    payload?.data?.media,
    payload?.media,
    payload?.data?.data,
    payload?.data?.items,
    payload?.items,
    payload?.results
  ]

  for (const c of directCandidates) {
    if (Array.isArray(c)) return c
    if (c && typeof c === 'object' && Array.isArray((c as any).data)) return (c as any).data
  }

  // deep scan
  const seen = new Set<any>()
  const stack = [payload]

  while (stack.length) {
    const cur: any = stack.pop()

    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue
    seen.add(cur)

    if (Array.isArray(cur)) {
      if (
        cur.length > 0 &&
        typeof cur[0] === 'object' &&
        ('fileUrl' in cur[0] || 'file_url' in cur[0] || 'url' in cur[0] || 'title' in cur[0] || 'name' in cur[0])
      ) {
        return cur
      }

      continue
    }

    for (const v of Object.values(cur)) if (v && typeof v === 'object') stack.push(v)
  }

  return []
}

const normalizeMedia = (m: any) => {
  const typeRaw = (m?.type ?? m?.fileType ?? '').toString().toLowerCase()
  const type = typeRaw === 'video' ? 'video' : 'image'

  return {
    id: Number(m?.id ?? m?.media_id ?? m?.mediaId ?? 0),
    title: m?.title ?? m?.name ?? '',
    type,
    fileUrl: m?.fileUrl ?? m?.file_url ?? m?.url ?? '',
    thumbnailUrl: m?.thumbnailUrl ?? m?.thumbnail_url ?? m?.thumb_url ?? undefined,
    duration: m?.duration != null ? Number(m.duration) : null,
    videoType: m?.videoType ?? m?.mime ?? null
  }
}

type UploadedFile = {
  file: File
  name: string
  size: number
  type: string
  preview?: string
}

// Add proper type definitions for API responses
interface ApiResponse<T = any> {
  data?: T
}

interface ScheduleApiResponse extends ApiResponse {
  data?: any[]
}

interface MediaApiResponse extends ApiResponse {
  data?: {
    media?: any[]
  }
}

interface ScheduleListApiResponse extends ApiResponse {
  data?: {
    data?: any[]
  }
}

const Step = styled(MuiStep)<StepProps>({
  '&:not(:has(.Mui-active)):not(:has(.Mui-completed)) .MuiAvatar-root, & .step-label .step-title': {
    color: 'var(--mui-palette-text-secondary)'
  },
  '& .step-label .step-subtitle': {
    color: 'var(--mui-palette-text-disabled)'
  },
  '&.Mui-completed .step-title , &.Mui-completed .step-subtitle': {
    color: 'var(--mui-palette-text-disabled)'
  },
  '& .Mui-active .step-title': {
    color: 'var(--mui-palette-error-main)'
  },
  '& .Mui-active .step-label .step-subtitle': {
    color: 'var(--mui-palette-text-secondary)'
  }
})

// ---- SCHEDULE HELPERS ----

const PropertyListingWizard = () => {
  const [activeStep, setActiveStep] = useState<number>(0)
  const [selectedOrientation, setSelectedOrientation] = useState<'landscape' | 'portrait'>('landscape')

  const getRoundedTime = (date: Date = new Date()): Date => {
    const rounded = new Date(date)
    const minutes = rounded.getMinutes()
    const remainder = 15 - (minutes % 15)

    if (remainder < 15) {
      rounded.setMinutes(minutes + remainder)
    } else {
      rounded.setMinutes(minutes)
    }

    rounded.setSeconds(0)
    rounded.setMilliseconds(0)

    return rounded
  }

  // อย่างน้อย 15 นาที
  const MIN_GAP_MS = 15 * 60 * 1000

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ensureMinEnd = useCallback(
    (start: Date | null, end: Date | null) => {
      if (!start) return end
      const minEnd = new Date(start.getTime() + MIN_GAP_MS)

      if (!end || end < minEnd) return minEnd

      return end
    },
    [MIN_GAP_MS]
  )

  const [startDateTime, setStartDateTime] = useState<Date | null>(getRoundedTime())

  const [endDateTime, setEndDateTime] = useState<Date | null>(null)

  const [oldFiles, setOldFiles] = useState<MediaItem[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [selectedOldFiles, setSelectedOldFiles] = useState<MediaItem[]>([])

  // ✅ เพิ่ม state สำหรับข้อมูลที่ต้องส่งระหว่าง components
  const [adName, setAdName] = useState<string>('')
  const [adDescription, setAdDescription] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [deviceInfo, setDeviceInfo] = useState<any[] | null>(null)
  const [mediaList, setMediaList] = useState<any[]>([])
  const [scheduleList, setScheduleList] = useState<any[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  const handleNext = () => {
    // ตรวจตอนออกจากสเต็ปที่ 0
    if (activeStep === 0) {
      setEndDateTime(prev => ensureMinEnd(startDateTime, prev))
    }

    if (activeStep !== steps.length - 1) {
      setActiveStep(activeStep + 1)
    } else {
      alert('Submitted..!!')
    }
  }

  const handlePrev = () => {
    if (activeStep !== 0) {
      setActiveStep(activeStep - 1)
    }
  }

  // ✅ ให้รองรับทั้ง data.devices, data, และ payload.devices
  const extractDevicesArray = (payload: any) => {
    if (!payload) return []
    const d = (payload as any).data

    if (Array.isArray(d?.devices)) return d.devices
    if (Array.isArray(d)) return d
    if (Array.isArray((payload as any).devices)) return (payload as any).devices

    return []
  }

  // ✅ ใช้โครงสร้างเดียวกับ UI (today = 1 รายการ, coming = array)
  const normalizeSchedule = (s: any) => ({
    schedule_id: s?.schedule_id ?? s?.id ?? s?.scheduleId ?? null,
    schedule_name: s?.schedule_name ?? s?.name ?? '',
    schedule_number: s?.schedule_number ?? s?.number ?? s?.code ?? '',
    run_at: s?.run_at ?? s?.runAt ?? null,
    run_at_to: s?.run_at_to ?? s?.runAtTo ?? null
  })

  // ปรับ type ให้รองรับทั้ง 2 โครงสร้าง
  interface DeviceApiResponse extends ApiResponse {
    data?: any[] | { devices?: any[]; [k: string]: any }
  }

  // const fetchScheduleAssignments = async () => {
  //   try {
  //     const accessToken = Cookies.get('accessToken')

  //     if (!accessToken) {
  //       console.error('Access token is missing!')

  //       return
  //     }

  //     const res = await fetch('/api/auth/device', {
  //       method: 'POST',
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         'Content-Type': 'application/json'
  //       }
  //     })

  //     const text = await res.text()

  //     if (res.ok) {
  //       try {
  //         const data = JSON.parse(text) as DeviceApiResponse
  //         const devices = extractDevicesArray(data)

  //         setDeviceInfo(devices)
  //         console.log('Parsed Devices:', devices.length, devices.slice(0, 2))
  //       } catch (e) {
  //         console.error('Failed to parse JSON:', e)
  //       }
  //     } else {
  //       console.error('Error fetching API:', text)
  //     }
  //   } catch (error) {
  //     console.error('Unexpected error:', error)
  //   }
  // }

  // เมื่อ start เปลี่ยน ให้ตั้ง end ขั้นต่ำ = start + 15 นาที
  useEffect(() => {
    setEndDateTime(prev => ensureMinEnd(startDateTime, prev))
  }, [ensureMinEnd, startDateTime])

  // กันกรณีผู้ใช้กรอก end ที่สั้นกว่า 15 นาที
  useEffect(() => {
    if (!startDateTime || !endDateTime) return
    const minEnd = new Date(startDateTime.getTime() + MIN_GAP_MS)

    if (endDateTime < minEnd) setEndDateTime(minEnd)
  }, [MIN_GAP_MS, endDateTime, startDateTime])
  const didFetchRef = useRef(false)

  useEffect(() => {
    if (didFetchRef.current) return
    didFetchRef.current = true
    fetchData()
  }, [])
  const inFlightRef = useRef(false)

  const fetchData = async () => {
    const accessToken = Cookies.get('accessToken')

    if (!accessToken) return
    if (inFlightRef.current) return // กันซ้ำ
    inFlightRef.current = true

    try {
      const fetchJSON = async <T = any,>(url: string, method: 'GET' | 'POST'): Promise<T> => {
        const res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        })

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        const text = await res.text()

        if (!text.trim()) throw new Error('Empty response')
        if (text.trim().startsWith('<')) throw new Error(`Received HTML instead of JSON. Status: ${res.status}`)

        return JSON.parse(text) as T
      }

      let deviceData: DeviceApiResponse = { data: [] }
      let scheduleData: ScheduleApiResponse = { data: [] }
      let mediaData: MediaApiResponse = { data: { media: [] } }
      let scheduleListData: ScheduleListApiResponse = { data: { data: [] } }

      // 👇 เพิ่มตัวแปรให้มี scope ภายนอก try ภายในย่อย

      // devices
      try {
        deviceData = await fetchJSON<DeviceApiResponse>('/api/auth/device', 'POST')
      } catch (err) {
        console.error('Device data fetch failed:', err)
      }

      // schedules (แบบรายอุปกรณ์)
      try {
        scheduleData = await fetchJSON<ScheduleApiResponse>('/api/auth/schedule-assignments?raw=1', 'GET')
      } catch (err) {
        console.error('Schedule data fetch failed:', err)
      }

      // media
      try {
        mediaData = await fetchJSON<MediaApiResponse>('/api/auth/media', 'GET')
        const parsed = extractMediaArray(mediaData).map(normalizeMedia)

        console.log('[Wizard] parsed media:', parsed.length, parsed)
        setMediaList(parsed)
      } catch (err) {
        console.warn('Media data fetch failed:', err)
        setMediaList([])
      }

      // schedules list (อีก endpoint)
      try {
        scheduleListData = await fetchJSON<ScheduleListApiResponse>('/api/proxy/schedules?page=0&size=10', 'GET')

        // ✅ โครงสร้างใหม่: { success, data: { schedules: [...] } }
        const raw = (scheduleListData as any)?.data?.schedules ?? []

        const schedulesArr = Array.isArray(raw)
          ? raw.map((s: any) => ({
              ...s,

              // map ให้ DataTable ใช้ได้เสมอ
              schedule_id: s.schedule_id ?? s.id ?? null,
              schedule_name: s.name ?? s.title ?? '',
              schedule_number: s.scheduleNumber ?? s.number ?? s.code ?? '',
              run_at: s.runAt ?? s.run_at ?? null,
              run_at_to: s.runAtTo ?? s.run_at_to ?? null
            }))
          : []

        console.log('📋 [/api/proxy/schedules] count:', schedulesArr.length, schedulesArr)

        // ✅ ตั้ง state ให้ StepPersonalDetails รับได้แล้ว
        setScheduleList(schedulesArr)
      } catch (err) {
        console.warn('Schedule list fetch failed:', err)
        setScheduleList([])
      }

      // ⬇️ สร้าง map: device_id -> today/coming (normalize ให้เรียบร้อย)
      const schedulePerDeviceItems = extractDevicesArray(scheduleData)

      const scheduleTodayMap = new Map<string, any | null>()
      const scheduleComingMap = new Map<string, any[]>()

      for (const item of schedulePerDeviceItems) {
        const devKey = String(item.device_id ?? item.deviceId ?? item.id ?? item.device?.id ?? '').trim()

        if (!devKey) continue

        const rawToday = Array.isArray(item.schedules_today)
          ? (item.schedules_today[0] ?? null)
          : (item.schedules_today ?? item.schedulesToday ?? null)

        const rawComing = (item.schedules_coming ?? item.schedulesComing ?? []) as any[]

        scheduleTodayMap.set(devKey, rawToday ? normalizeSchedule(rawToday) : null)
        scheduleComingMap.set(devKey, rawComing.map(normalizeSchedule))
      }

      // ✅ รวมเข้า devices หลัก
      const devicesArr = extractDevicesArray(deviceData)

      const mergedDevices = devicesArr.map((device: any) => {
        const key = String(device.device_id ?? device.deviceId ?? device.id ?? '').trim()

        return {
          ...device,
          schedules_today: scheduleTodayMap.get(key) ?? null,
          schedules_coming: scheduleComingMap.get(key) ?? []
        }
      })

      setDeviceInfo(mergedDevices)
    } catch (err) {
      console.error('Error loading data:', err)
      setDeviceInfo([])
      setMediaList([])
      setScheduleList([])
    } finally {
      inFlightRef.current = false
    }
  }

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <StepPersonalDetails
            activeStep={step}
            handleNext={handleNext}
            handlePrev={handlePrev}
            steps={steps}
            startDateTime={startDateTime}
            setStartDateTime={setStartDateTime}
            endDateTime={endDateTime}
            setEndDateTime={setEndDateTime}
            deviceInfo={deviceInfo ?? []}
            fetchDeviceInfo={fetchData}
            mediaList={mediaList}
            scheduleList={scheduleList}
            selectedDeviceIds={selectedDeviceIds}
            setSelectedDeviceIds={setSelectedDeviceIds}
          />
        )
      case 1:
        return (
          <StepPropertyDetails
            activeStep={step}
            handleNext={handleNext}
            handlePrev={handlePrev}
            steps={steps}
            onOrientationChange={setSelectedOrientation} // ✅ ส่งฟังก์ชันอัปเดต
            isInternalEdit
            selectedOldFiles={selectedOldFiles}
            setSelectedOldFiles={setSelectedOldFiles}
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
            orientation={selectedOrientation} // ✅ ส่ง state หลักไป
          />
        )
      case 2:
        return (
          <StepPropertyFeatures
            activeStep={step}
            handleNext={handleNext}
            handlePrev={handlePrev}
            steps={steps}
            orientation={selectedOrientation} // ✅ ใช้ selectedOrientation จาก main state
            isInternal
            selectedOldFiles={selectedOldFiles}
            setSelectedOldFiles={setSelectedOldFiles}
            adName={adName}
            adDescription={adDescription}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            startDateTime={startDateTime}
            endDateTime={endDateTime}
            selectedDeviceIds={selectedDeviceIds}
          />
        )
      default:
        return null
    }
  }

  return (
    <Card className='flex flex-col lg:flex-row'>
      <CardContent className='max-lg:border-be lg:border-ie lg:min-is-[300px]'>
        <StepperWrapper>
          <Stepper
            activeStep={activeStep}
            orientation='vertical'
            connector={<></>}
            className='flex flex-col gap-4 min-is-[220px]'
          >
            {steps.map((label, index) => (
              <Step key={index} onClick={() => setActiveStep(index)}>
                <StepLabel icon={<></>} className='p-1 cursor-pointer'>
                  <div className='step-label'>
                    <CustomAvatar
                      variant='rounded'
                      skin={activeStep === index ? 'filled' : 'light'}
                      {...(activeStep >= index && { color: 'error' })}
                      {...(activeStep === index && { className: 'shadow-primarySm' })}
                      size={38}
                    >
                      <Icon icon={label.icon} width={22} />
                    </CustomAvatar>
                    <div className='flex flex-col'>
                      <Typography color='text.primary' className='step-title'>
                        {label.title}
                      </Typography>
                      <Typography className='step-subtitle'>{label.subtitle}</Typography>
                    </div>
                  </div>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </StepperWrapper>
      </CardContent>
      <CardContent className='flex-1 pbs-6'>{getStepContent(activeStep)}</CardContent>
    </Card>
  )
}

export default PropertyListingWizard
