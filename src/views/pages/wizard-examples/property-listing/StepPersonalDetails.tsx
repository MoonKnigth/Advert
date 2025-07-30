//// React Imports
//src/views/pages/wizard-examples/property-listing/StepPersonalDetails.tsx
import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import Alert from '@mui/material/Alert'
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import Grid2 from '@mui/material/Grid'
import Button from '@mui/material/Button'
import DirectionalIcon from '@components/DirectionalIcon'
import { Box, Chip } from '@mui/material'
import CardMedia from '@mui/material/CardMedia'
import CustomTextField from '@core/components/mui/TextField'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useTheme } from '@mui/material/styles'

// MUI Imports

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { CustomInputVerticalData } from '@core/components/custom-inputs/types'
import { flexRender } from '@tanstack/react-table'

// Component Imports
const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8

type Props = {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
}
const MenuProps = {
  PaperProps: {
    style: {
      width: 250,
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP
    }
  }
}

const names = ['ห้าง A - ชั้น 1', 'ห้าง A - หน้าประตูทางเข้า', 'ห้าง B - ชั้น 2', 'ห้าง B - หน้า Food Court']

// Vars
const data: CustomInputVerticalData[] = [
  {
    title: 'I am the Builder',
    value: 'builder',
    content: 'List property as Builder, list your project and get highest reach very fast.',
    asset: 'bx-building-house',
    isSelected: true
  },
  {
    title: 'I am the Owner',
    value: 'owner',
    content: 'Submit property as an Individual. Lease, Rent or Sell at the best price.',
    asset: 'bx-crown'
  },
  {
    title: 'I am the broker',
    value: 'broker',
    content: 'Earn highest commission by listing your clients properties at the best price.',
    asset: 'bx-briefcase'
  }
]

const StepPersonalDetails = ({ activeStep, handleNext, handlePrev, steps }: Props) => {
  const [deviceInfo, setDeviceInfo] = useState<any[]>([])

  useEffect(() => {
    const storedDevices = localStorage.getItem('deviceInfo')
    if (storedDevices) {
      setDeviceInfo(JSON.parse(storedDevices))
    }
  }, [])
  // States
  // States

  const handleChange = (event: SelectChangeEvent<unknown>, _: React.ReactNode) => {
    const value = event.target.value as string[]
    setPersonName(value)
  }
  const handleChangeRadio = (event: ChangeEvent<HTMLInputElement>) => {
    setValue((event.target as HTMLInputElement).value)
  }

  const handleChangeMultipleNative = (event: ChangeEvent<HTMLSelectElement>) => {
    const { options } = event.target
    const value: string[] = []

    for (let i = 0, l = options.length; i < l; i += 1) {
      if (options[i].selected) {
        value.push(options[i].value)
      }
    }
    setPersonNameNative(value)
  }
  const [startDateTime, setStartDateTime] = useState<Date | null | undefined>(new Date())
  const [endDateTime, setEndDateTime] = useState<Date | null | undefined>(new Date())
  const theme = useTheme() // เข้าถึงธีมที่กำหนด
  const [value, setValue] = useState<string>('controlled-checked')
  const [personName, setPersonName] = useState<string[]>([])
  const [personNameNative, setPersonNameNative] = useState<string[]>([])
  // Vars
  const initialSelectedOption: string = data.filter(item => item.isSelected)[
    data.filter(item => item.isSelected).length - 1
  ].value

  // States
  const [selectedOption, setSelectedOption] = useState<string>(initialSelectedOption)
  const [isPasswordShown, setIsPasswordShown] = useState<boolean>(false)

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const handleOptionChange = (prop: string | ChangeEvent<HTMLInputElement>) => {
    if (typeof prop === 'string') {
      setSelectedOption(prop)
    } else {
      setSelectedOption((prop.target as HTMLInputElement).value)
    }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <div className='flex gap-4 flex-col'>
          {/* <h2 className='text-black'>เลือกกลุ่มทีวี</h2> */}
          {/* <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
            เลือกกลุ่มทีวี
          </Typography>
          <div>
            <CustomTextField
              select
              fullWidth
              color='error'
              label='ตำแหน่ง'
              value={personName}
              id='demo-multiple-checkbox'
              slotProps={{
                select: {
                  MenuProps,
                  multiple: true,
                  onChange: handleChange,
                  renderValue: selected => (selected as string[]).join(' | ')
                }
              }}
            >
              {names.map(name => (
                <MenuItem key={name} value={name}>
                  <Checkbox color='success' checked={personName.indexOf(name) > -1} />
                  <ListItemText primary={name} />
                </MenuItem>
              ))}
            </CustomTextField>
          </div>

          <Grid size={{ xs: 12, md: 12 }}>
            <Chip
              label='สามารถเลือกทั้งกลุ่มทีวี และอุปกรณ์ที่ไม่ได้อยู่ในกลุ่มได้พร้อมกัน (กลุ่มทีวี หรือ รายตัว)'
              color='secondary'
              variant='tonal'
            />
          </Grid> */}

          <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
            อุปกรณ์ที่ไม่ได้อยู่ในกลุ่ม
          </Typography>
          <CardContent>
            <Grid container spacing={2} justifyContent='space-between'>
              {deviceInfo.map((device, index) => (
                <Grid2 xs={3} sm={3} md={3} key={device.device_id || index}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 2,
                      mx: 5
                    }}
                  >
                    <FormControlLabel
                      className='ms-5'
                      label=''
                      value={device.device_id}
                      control={<Radio color='success' />}
                    />
                    <img src='/images/tv/Vector_red.svg' height='100' width='100' />
                    <p>{device.device_id}</p>
                    <p>{device.name || 'ไม่ทราบชื่อ'}</p>
                  </Box>
                </Grid2>
              ))}
            </Grid>
          </CardContent>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <AppReactDatepicker
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={15}
                selected={startDateTime}
                id='start-date-time-picker'
                dateFormat='MM/dd/yyyy h:mm aa'
                onChange={(date: Date | null) => setStartDateTime(date)}
                customInput={<CustomTextField label='วันที่เริ่มต้น' fullWidth color='error' />}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <AppReactDatepicker
                showTimeSelect
                timeFormat='HH:mm'
                timeIntervals={15}
                selected={endDateTime}
                id='end-date-time-picker'
                dateFormat='MM/dd/yyyy h:mm aa'
                onChange={(date: Date | null) => setEndDateTime(date)}
                customInput={<CustomTextField label='วันที่สิ้นสุด' fullWidth color='error' />}
              />
            </Grid>
          </Grid>
          <Alert variant='outlined' severity='error'>
            "กรุณาเลือกวิธีการเลือกอุปกรณ์","กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด","วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น"
          </Alert>
          {/* <Grid size={{ xs: 12 }}>
            <div className='flex items-center justify-end'>
              <Button
                variant='contained'
                color={activeStep === steps.length - 1 ? 'success' : 'error'}
                onClick={handleNext}
                endIcon={
                  activeStep === steps.length - 1 ? (
                    <i className='bx-check' />
                  ) : (
                    <DirectionalIcon ltrIconClass='bx-right-arrow-alt' rtlIconClass='bx-left-arrow-alt' />
                  )
                }
              >
                {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
              </Button>
            </div>
          </Grid> */}
        </div>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center justify-between'>
          <Button
            variant='tonal'
            color='secondary'
            disabled={activeStep === 0}
            onClick={handlePrev}
            startIcon={<DirectionalIcon ltrIconClass='bx-left-arrow-alt' rtlIconClass='bx-right-arrow-alt' />}
          >
            Previous
          </Button>
          <Button
            variant='contained'
            color={activeStep === steps.length - 1 ? 'success' : 'error'}
            onClick={handleNext}
            endIcon={
              activeStep === steps.length - 1 ? (
                <i className='bx-check' />
              ) : (
                <DirectionalIcon ltrIconClass='bx-right-arrow-alt' rtlIconClass='bx-left-arrow-alt' />
              )
            }
          >
            {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </div>
      </Grid>
    </Grid>
  )
}

export default StepPersonalDetails
