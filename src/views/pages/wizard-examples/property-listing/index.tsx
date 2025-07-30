'use client'

// React Imports
import { useState } from 'react'

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

  // const [value, setValue] = useState<string>('controlled-checked')
  // const theme = useTheme()
  const [oldFiles, setOldFiles] = useState<MediaItem[]>([])
  const [selected, setSelected] = useState<number[]>([])

  // ✅ เพิ่ม state สำหรับข้อมูลที่ต้องส่งระหว่าง components
  const [adName, setAdName] = useState<string>('')
  const [adDescription, setAdDescription] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const selectedOldFiles = oldFiles.filter(file => selected.includes(file.id))

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

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <StepPersonalDetails activeStep={step} handleNext={handleNext} handlePrev={handlePrev} steps={steps} />
      case 1:
        return (
          <StepPropertyDetails
            activeStep={step}
            handleNext={handleNext}
            handlePrev={handlePrev}
            steps={steps}
            onOrientationChange={setSelectedOrientation}
            isInternalEdit
            selectedOldFiles={selectedOldFiles}
            oldFiles={oldFiles}
            setOldFiles={setOldFiles}
            selected={selected}
            setSelected={setSelected} // ✅ เพิ่ม props สำหรับส่งข้อมูล
            adName={adName}
            setAdName={setAdName}
            adDescription={adDescription}
            setAdDescription={setAdDescription}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
          />
        )
      case 2:
        return (
          <StepPropertyFeatures
            activeStep={step}
            handleNext={handleNext}
            handlePrev={handlePrev}
            steps={steps}
            orientation={selectedOrientation}
            isInternal
            selectedOldFiles={selectedOldFiles}
            // ✅ เพิ่ม props สำหรับรับข้อมูล
            adName={adName}
            adDescription={adDescription}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles} // ✅ เพิ่มบรรทัดนี้
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
