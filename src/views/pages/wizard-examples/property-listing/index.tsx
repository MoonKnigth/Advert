'use client'

// React Imports
import { useEffect, useState } from 'react'

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
import CustomAvatar from '@core/components/mui/Avatar'
import StepPersonalDetails from './StepPersonalDetails'
import StepPropertyDetails from './StepPropertyDetails'
import StepPropertyFeatures from './StepPropertyFeatures'

import StepperWrapper from '@core/styles/stepper'
import Cookies from 'js-cookie'

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

interface DeviceApiResponse extends ApiResponse {
  data?: any[]
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

  const [startDateTime, setStartDateTime] = useState<Date | null>(getRoundedTime())
  // const [startDateTime, setStartDateTime] = useState<Date | null>(new Date())
  const [endDateTime, setEndDateTime] = useState<Date | null>(null)

  const [oldFiles, setOldFiles] = useState<MediaItem[]>([])
  const [selected, setSelected] = useState<number[]>([])

  // ✅ เพิ่ม state สำหรับข้อมูลที่ต้องส่งระหว่าง components
  const [adName, setAdName] = useState<string>('')
  const [adDescription, setAdDescription] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [deviceInfo, setDeviceInfo] = useState<any[]>([])
  const [scheduleAssignments, setScheduleAssignments] = useState<any[]>([])
  const selectedOldFiles = oldFiles.filter(file => selected.includes(file.id))
  const [mediaList, setMediaList] = useState<any[]>([])
  const [scheduleList, setScheduleList] = useState<any[]>([])
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([])

  const handleNext = () => {
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

  const fetchScheduleAssignments = async () => {
    try {
      const accessToken = Cookies.get('accessToken')
      if (!accessToken) {
        console.error('Access token is missing!')
        return
      }

      const res = await fetch('/api/auth/device', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      const text = await res.text()

      if (res.ok) {
        try {
          const data = JSON.parse(text) as DeviceApiResponse
          setDeviceInfo(data.data || [])
          console.log('Parsed Data:', data)
        } catch (e) {
          console.error('Failed to parse JSON:', e)
        }
      } else {
        console.error('Error fetching API:', text)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const accessToken = Cookies.get('accessToken')
    if (!accessToken) return

    try {
      const fetchJSON = async <T = any,>(url: string, method: 'GET' | 'POST'): Promise<T> => {
        const res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        const text = await res.text()
        if (!text.trim()) {
          throw new Error('Empty response')
        }
        if (text.trim().startsWith('<')) {
          throw new Error(`Received HTML response instead of JSON. Status: ${res.status}`)
        }

        try {
          return JSON.parse(text) as T
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`)
        }
      }

      let deviceData: DeviceApiResponse = { data: [] }
      let scheduleData: ScheduleApiResponse = { data: [] }
      let mediaData: MediaApiResponse = { data: { media: [] } }
      let scheduleListData: ScheduleListApiResponse = { data: { data: [] } }

      try {
        deviceData = await fetchJSON<DeviceApiResponse>('/api/auth/device', 'POST')
      } catch (err) {
        console.error('Device data fetch failed:', err)
      }

      try {
        scheduleData = await fetchJSON<ScheduleApiResponse>('/api/auth/schedule-assignments', 'POST')
      } catch (err) {
        console.error('Schedule data fetch failed:', err)
      }

      try {
        mediaData = await fetchJSON<MediaApiResponse>('/api/auth/media', 'GET')
      } catch (err) {
        console.warn('Media data fetch failed:', err)
      }

      try {
        scheduleListData = await fetchJSON<ScheduleListApiResponse>('/api/proxy/schedules', 'GET')
      } catch (err) {
        console.warn('Schedule list fetch failed:', err)
      }

      // ✅ ปรับปรุงการดึงรายละเอียด schedule
      const schedulesWithDetails: any[] = []
      console.log('📋 Processing schedules:', scheduleListData.data?.data)

      if (scheduleListData.data?.data) {
        for (const schedule of scheduleListData.data.data) {
          try {
            console.log(`🔄 Fetching details for schedule ID: ${schedule.id}`)
            const detailResponse = await fetch(`/api/schedules/${schedule.id}`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })

            if (detailResponse.ok) {
              const detailText = await detailResponse.text()
              const detailData = JSON.parse(detailText)
              console.log(`✅ Schedule ${schedule.id} details:`, detailData)

              // ✅ ตรวจสอบว่ามี adsItems หรือไม่
              const scheduleDetail = detailData.data || detailData
              console.log(`📋 AdsItems for schedule ${schedule.id}:`, scheduleDetail?.adsItems)

              if (scheduleDetail) {
                schedulesWithDetails.push(scheduleDetail)
              } else {
                schedulesWithDetails.push(detailData)
              }
            } else {
              console.warn(`⚠️ Failed to fetch details for schedule ${schedule.id}: ${detailResponse.status}`)
              schedulesWithDetails.push(schedule)
            }
          } catch (err) {
            console.warn(`❌ Error fetching details for schedule ${schedule.id}:`, err)
            schedulesWithDetails.push(schedule)
          }
        }
      }

      // console.log('📋 Final schedules with details:', schedulesWithDetails)

      const scheduleMap = new Map()
      scheduleData.data?.forEach((item: any) => {
        scheduleMap.set(item.device_id, item.schedules_today)
      })

      const mergedDevices =
        deviceData.data?.map((device: any) => ({
          ...device,
          schedules_today: scheduleMap.get(device.device_id) || null
        })) || []

      setDeviceInfo(mergedDevices)
      setMediaList(mediaData.data?.media || [])
      setScheduleList(schedulesWithDetails)
    } catch (err) {
      console.error('Error loading data:', err)
      setDeviceInfo([])
      setMediaList([])
      setScheduleList([])
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
            deviceInfo={deviceInfo}
            fetchDeviceInfo={fetchScheduleAssignments}
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
