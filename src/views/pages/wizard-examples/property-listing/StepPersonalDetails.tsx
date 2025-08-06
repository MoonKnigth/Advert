import { useState, useEffect, ChangeEvent } from 'react' // Add ChangeEvent here
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import ListItemText from '@mui/material/ListItemText'
import Alert from '@mui/material/Alert'
import AppReactDatepicker from '@/libs/styles/AppReactDatepicker'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import Button from '@mui/material/Button'
import DirectionalIcon from '@components/DirectionalIcon'
import { Box, Chip, Dialog, DialogContent, DialogTitle } from '@mui/material'
import CardMedia from '@mui/material/CardMedia'
import CustomTextField from '@core/components/mui/TextField'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import Cookies from 'js-cookie'
import { useTheme } from '@mui/material/styles'
import { size } from '@floating-ui/react'

// Define Props type
interface Props {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  startDateTime: Date | null
  setStartDateTime: React.Dispatch<React.SetStateAction<Date | null>>
  endDateTime: Date | null
  setEndDateTime: React.Dispatch<React.SetStateAction<Date | null>>
  deviceInfo: any[]
  fetchDeviceInfo: () => void
  mediaList: any[]
  scheduleList: any[]
  selectedDeviceIds: string[]
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>
}

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8

const StepPersonalDetails = ({
  activeStep,
  handleNext,
  handlePrev,
  steps,
  startDateTime,
  setStartDateTime,
  endDateTime,
  setEndDateTime,
  deviceInfo,
  fetchDeviceInfo,
  mediaList,
  scheduleList,
  selectedDeviceIds,
  setSelectedDeviceIds
}: Props) => {
  const [error, setError] = useState('') // Store error message

  const theme = useTheme()
  const [selectedOption, setSelectedOption] = useState<string>('builder')
  const [isPasswordShown, setIsPasswordShown] = useState<boolean>(false)

  // Toggle password visibility
  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  // Handle option change (builder, owner, broker)
  const handleOptionChange = (prop: string | ChangeEvent<HTMLInputElement>) => {
    if (typeof prop === 'string') {
      setSelectedOption(prop)
    } else {
      setSelectedOption((prop.target as HTMLInputElement).value)
    }
  }

  // Fetch schedule assignments when the button is clicked
  const fetchScheduleAssignments = async () => {
    try {
      // Get accessToken from cookies
      const accessToken = Cookies.get('accessToken')
      if (!accessToken) {
        console.error('Access token is missing!')
        return
      }

      // Log the token to ensure it's being fetched properly
      // console.log('Access token:', accessToken)

      const res = await fetch('/api/auth/schedule-assignments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`, // Include the token in the Authorization header
          'Content-Type': 'application/json'
        }
      })

      const text = await res.text() // Read response as text
      // console.log('API Response:', text) // Log the raw response for debugging

      // Check if response is ok
      if (res.ok) {
        let data
        try {
          data = JSON.parse(text) // Try to parse JSON response
          // console.log('Parsed Data:', data)
        } catch (e) {
          console.error('Failed to parse JSON:', e)
        }
      } else {
        console.error('Error fetching API:', text) // Log error message from API
      }
    } catch (error) {
      console.error('Unexpected error:', error) // Catch unexpected errors
    }
  }

  const [openDialog, setOpenDialog] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null)
  const [selectedScheduleName, setSelectedScheduleName] = useState<string | null>(null)
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState<any | null>(null)
  const [selectedNameAd, setSelectedNameAd] = useState<string | null>(null)
  const [selectedAdsItems, setSelectedAdsItems] = useState<any[]>([])

  useEffect(() => {
    console.log('🖥️ ข้อมูลอุปกรณ์ทั้งหมด (deviceInfo):', deviceInfo)
  })

  // ปรับแก้ฟังก์ชัน handleBoxClick เพื่อแสดง adsItems.title และ adsItems.description
  const handleBoxClick = async (device: any) => {
    if (device.schedules_today) {
      const scheduleId = device.schedules_today.scheduleId

      console.log('🔍 Debug Info:')
      console.log('Device:', device)
      console.log('Schedule ID:', scheduleId)
      console.log('Schedule List:', scheduleList)

      // หา schedule ใน scheduleList
      const schedule = scheduleList.find((s: any) => s.id === scheduleId)
      console.log('Found Schedule:', schedule)

      // รายละเอียดอุปกรณ์
      setSelectedDescription(device.description || 'ไม่ทราบชื่อ')

      // ชื่อกำหนดการ - เอามาจาก scheduleName
      setSelectedScheduleName(device.schedules_today.scheduleName || 'ไม่มีตารางวันนี้')

      // ถ้าไม่มี schedule ใน scheduleList ให้ดึงข้อมูลใหม่
      if (!schedule) {
        console.log('⚠️ Schedule not found in list, fetching from API...')
        try {
          const accessToken = Cookies.get('accessToken')
          if (accessToken) {
            const response = await fetch(`/api/schedules/${scheduleId}`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })

            if (response.ok) {
              const data = await response.json()
              console.log('📥 Fresh schedule data:', data)

              // ใช้ข้อมูลที่เพิ่งดึงมา
              const scheduleData = data.data || data

              // ✅ เก็บ adsItems ทั้งหมด
              const adsItems = scheduleData?.adsItems || []
              const firstAdsItem = adsItems.length > 0 ? adsItems[0] : null

              console.log('📋 AdsItems:', adsItems)
              console.log('📋 First AdsItem:', firstAdsItem)

              // เก็บ adsItems ทั้งหมดไว้แสดงใน dialog
              setSelectedAdsItems(adsItems)

              setSelectedNameAd(firstAdsItem?.title || scheduleData?.title || 'ไม่มีข้อมูลสื่อ')
              setSelectedDescriptionAd(firstAdsItem?.description || scheduleData?.description || 'ไม่มีรายละเอียดโฆษณา')
              setSelectedScheduleDetail(scheduleData)
            } else {
              console.error('❌ Failed to fetch schedule:', response.status)
              setSelectedAdsItems([])
              setSelectedNameAd('ไม่สามารถดึงข้อมูลได้')
              setSelectedDescriptionAd('ไม่สามารถดึงข้อมูลได้')
            }
          }
        } catch (error) {
          console.error('❌ Error fetching schedule:', error)
          setSelectedAdsItems([])
          setSelectedNameAd('เกิดข้อผิดพลาด')
          setSelectedDescriptionAd('เกิดข้อผิดพลาด')
        }
      } else {
        // ใช้ข้อมูลจาก scheduleList
        console.log('✅ Using schedule from list')

        // ✅ เก็บ adsItems ทั้งหมด
        const adsItems = schedule?.adsItems || []
        const firstAdsItem = adsItems.length > 0 ? adsItems[0] : null

        console.log('📋 AdsItems from list:', adsItems)
        console.log('📋 First AdsItem from list:', firstAdsItem)

        // เก็บ adsItems ทั้งหมดไว้แสดงใน dialog
        setSelectedAdsItems(adsItems)

        let adTitle = firstAdsItem?.title || schedule?.title || schedule?.name || 'ไม่มีข้อมูลสื่อ'
        let adDescription = firstAdsItem?.description || schedule?.description || 'ไม่มีรายละเอียดโฆษณา'

        console.log('📋 Ad Title:', adTitle)
        console.log('📋 Ad Description:', adDescription)

        setSelectedNameAd(adTitle)
        setSelectedDescriptionAd(adDescription)
        setSelectedScheduleDetail(schedule)
      }

      setOpenDialog(true)
    }
  }
  const EnhancedDialog = () => (
    <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth='lg' fullWidth>
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}
      >
        🎬 รายละเอียดอุปกรณ์และกำหนดการ
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* รายละเอียดอุปกรณ์ */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
              border: '2px solid #2196f3'
            }}
          >
            <Typography variant='h6' sx={{ color: 'primary.main', mb: 2, fontWeight: 'bold' }}>
              📱 รายละเอียดอุปกรณ์
            </Typography>
            <Typography variant='body1' sx={{ fontSize: '1.1rem' }}>
              {selectedDescription || 'ไม่มีข้อมูลอุปกรณ์'}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f3e5f5 0%, #e8f5e8 100%)',
              border: '2px solid #4caf50'
            }}
          >
            <Typography variant='h6' sx={{ color: 'success.main', mb: 2, fontWeight: 'bold' }}>
              📅 ชื่อกำหนดการ
            </Typography>
            <Typography variant='body1' sx={{ fontSize: '1.1rem' }}>
              {selectedScheduleName || 'ไม่มีตารางวันนี้'}
            </Typography>
          </Box>

          {/* AdsItems Section */}
          {selectedAdsItems.length > 0 && (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
                border: '2px solid #ff9800'
              }}
            >
              <Typography
                variant='h6'
                sx={{
                  color: 'warning.main',
                  mb: 3,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                🎬 รายการโฆษณาทั้งหมด ({selectedAdsItems.length} รายการ)
              </Typography>

              <Grid container spacing={3}>
                {selectedAdsItems.map((adsItem, index) => (
                  <Grid size={{ xs: 12, md: selectedAdsItems.length === 1 ? 12 : 6 }} key={index}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: 2,
                        background: 'white',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        border: '1px solid #e0e0e0',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                        }
                      }}
                    >
                      {/* หมายเลขโฆษณา */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mb: 2,
                          pb: 1,
                          borderBottom: '2px solid #f0f0f0'
                        }}
                      >
                        <Chip
                          label={`โฆษณาที่ ${index + 1}`}
                          color='primary'
                          variant='filled'
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>

                      {/* ชื่อโฆษณา */}
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant='subtitle1'
                          sx={{
                            color: 'error.main',
                            fontWeight: 'bold',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          🎭 ชื่อโฆษณา
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{
                            p: 2,
                            backgroundColor: '#ffebee',
                            borderRadius: 1,
                            border: '1px solid #ffcdd2',
                            fontSize: '1rem',
                            fontWeight: 500
                          }}
                        >
                          {adsItem.title || 'ไม่มีชื่อโฆษณา'}
                        </Typography>
                      </Box>

                      {/* รายละเอียดโฆษณา */}
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{
                            color: 'error.main',
                            fontWeight: 'bold',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          📝 รายละเอียด
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{
                            p: 2,
                            backgroundColor: '#ffebee',
                            borderRadius: 1,
                            border: '1px solid #ffcdd2',
                            minHeight: '60px',
                            fontSize: '0.95rem',
                            lineHeight: 1.6
                          }}
                        >
                          {adsItem.description || 'ไม่มีรายละเอียด'}
                        </Typography>
                      </Box>

                      {/* เพิ่มข้อมูลเสริมถ้ามี */}
                      {(adsItem.duration || adsItem.fileSize || adsItem.type) && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f0f0f0' }}>
                          <Typography
                            variant='caption'
                            sx={{
                              color: 'text.secondary',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 2
                            }}
                          >
                            {adsItem.duration && <span>⏱️ ระยะเวลา: {adsItem.duration}s</span>}
                            {adsItem.fileSize && (
                              <span>💾 ขนาดไฟล์: {(adsItem.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            )}
                            {adsItem.type && <span>📁 ประเภท: {adsItem.type}</span>}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ถ้าไม่มี adsItems แสดงข้อมูลแบบเดิม */}
          {selectedAdsItems.length === 0 && (
            <>
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffebee 0%, #fff3e0 100%)',
                  border: '2px solid #f44336'
                }}
              >
                <Typography variant='h6' sx={{ color: 'error.main', mb: 2, fontWeight: 'bold' }}>
                  🎬 ชื่อโฆษณา
                </Typography>
                <Typography variant='body1' sx={{ fontSize: '1.1rem' }}>
                  {selectedNameAd || 'ไม่มีข้อมูลสื่อ'}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #ffebee 0%, #fff3e0 100%)',
                  border: '2px solid #f44336'
                }}
              >
                <Typography variant='h6' sx={{ color: 'error.main', mb: 2, fontWeight: 'bold' }}>
                  📝 รายละเอียดโฆษณา
                </Typography>
                <Typography
                  variant='body1'
                  sx={{
                    minHeight: '60px',
                    fontSize: '1rem',
                    lineHeight: 1.6
                  }}
                >
                  {selectedDescriptionAd || 'ไม่มีรายละเอียดโฆษณา'}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
  const handleBoxClickAlternative = (device: any) => {
    if (device.schedules_today) {
      const scheduleId = device.schedules_today.scheduleId
      const schedule = scheduleList.find((s: any) => s.id === scheduleId)

      // รายละเอียดอุปกรณ์
      setSelectedDescription(device.description || 'ไม่ทราบชื่อ')

      // ชื่อกำหนดการ - เอามาจาก scheduleName
      setSelectedScheduleName(device.schedules_today.scheduleName || 'ไม่มีตารางวันนี้')

      // ชื่อโฆษณาและรายละเอียด - เอาจากข้อมูล schedule ที่ได้จาก API /schedules/{id}
      setSelectedNameAd(schedule?.title || 'ไม่มีข้อมูลสื่อ')
      setSelectedDescriptionAd(schedule?.description || 'ไม่มีรายละเอียดโฆษณา')

      setSelectedScheduleDetail(schedule || null)
      setOpenDialog(true)
    }
  }

  const [selectedDescriptionAd, setSelectedDescriptionAd] = useState<string | null>(null)

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return 'ไม่ทราบชื่อ'
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }

  const handleToggleDevice = (deviceId: string) => {
    setSelectedDeviceIds(
      prev =>
        prev.includes(deviceId)
          ? prev.filter(id => id !== deviceId) // ถ้าเลือกแล้ว → เอาออก
          : [...prev, deviceId] // ถ้ายังไม่เลือก → เพิ่มเข้า
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <div className='flex gap-4 flex-col'>
          <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
            อุปกรณ์ที่ไม่ได้อยู่ในกลุ่ม
          </Typography>

          <CardContent>
            <Grid container spacing={2}>
              {deviceInfo.length > 0 ? (
                deviceInfo.map((device, index) => (
                  <Grid size={{ xs: 3 }} key={device.device_id || index}>
                    <Box
                      onClick={() => handleBoxClick(device)}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 2,
                        mx: 5,
                        cursor: device.schedules_today ? 'pointer' : 'default',
                        '&:hover': {
                          backgroundColor: device.schedules_today ? '#fef2f2' : 'inherit'
                        }
                      }}
                    >
                      <div onClick={e => e.stopPropagation()}>
                        <FormControlLabel
                          className='ms-5'
                          label=''
                          control={
                            <Checkbox
                              color='success'
                              checked={selectedDeviceIds.includes(device.device_id)}
                              onChange={() => handleToggleDevice(device.device_id)}
                            />
                          }
                        />
                      </div>

                      <img
                        src={device.schedules_today ? '/images/tv/Vector_red.svg' : '/images/tv/Vector.svg'}
                        height='100'
                        width='100'
                      />
                      <p>{device.device_id}</p>
                      <p>{device.name || 'ไม่ทราบชื่อ'}</p>
                      <p>{truncateText(device.description, 20)}</p>
                    </Box>
                  </Grid>
                ))
              ) : (
                <p>กำลังโหลดข้อมูล...</p>
              )}
            </Grid>

            {/* ✅ Enhanced Dialog Component */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth='md' fullWidth>
              <DialogTitle>รายละเอียดอุปกรณ์และกำหนดการ</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                  {/* รายละเอียดอุปกรณ์ */}
                  <Box>
                    <Typography variant='h6' sx={{ color: 'primary.main', mb: 1 }}>
                      📱 รายละเอียดอุปกรณ์
                    </Typography>
                    <Typography
                      variant='body1'
                      sx={{
                        p: 2,
                        backgroundColor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.300'
                      }}
                    >
                      {selectedDescription || 'ไม่มีข้อมูลอุปกรณ์'}
                    </Typography>
                  </Box>

                  {/* ชื่อกำหนดการ */}
                  <Box>
                    <Typography variant='h6' sx={{ color: 'primary.main', mb: 1 }}>
                      📅 ชื่อกำหนดการ
                    </Typography>
                    <Typography
                      variant='body1'
                      sx={{
                        p: 2,
                        backgroundColor: 'grey.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'grey.300'
                      }}
                    >
                      {selectedScheduleName || 'ไม่มีตารางวันนี้'}
                    </Typography>
                  </Box>

                  {/* รายการโฆษณา */}
                  {selectedAdsItems.length > 0 ? (
                    <Box>
                      <Typography variant='h6' sx={{ color: 'error.main', mb: 2 }}>
                        🎬 รายการโฆษณา ({selectedAdsItems.length} รายการ)
                      </Typography>
                      {selectedAdsItems.map((adsItem, index) => (
                        <Box key={index} sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant='subtitle1' sx={{ fontWeight: 'bold', mb: 1, color: 'error.main' }}>
                            โฆษณาที่ {index + 1}
                          </Typography>

                          <Box sx={{ mb: 2 }}>
                            <Typography variant='body2' sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              ชื่อ:
                            </Typography>
                            <Typography variant='body1'>{adsItem.title || 'ไม่มีชื่อ'}</Typography>
                          </Box>

                          <Box>
                            <Typography variant='body2' sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              รายละเอียด:
                            </Typography>
                            <Typography variant='body1'>{adsItem.description || 'ไม่มีรายละเอียด'}</Typography>
                          </Box>

                          {/* ข้อมูลเพิ่มเติม */}
                          {(adsItem.duration || adsItem.fileSize || adsItem.type) && (
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #ddd' }}>
                              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                {adsItem.duration && `ระยะเวลา: ${adsItem.duration}s `}
                                {adsItem.fileSize && `| ขนาด: ${(adsItem.fileSize / 1024 / 1024).toFixed(1)}MB `}
                                {adsItem.type && `| ประเภท: ${adsItem.type}`}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    // แสดงข้อมูลแบบเดิมถ้าไม่มี adsItems
                    <>
                      <Box>
                        <Typography variant='h6' sx={{ color: 'error.main', mb: 1 }}>
                          🎬 ชื่อโฆษณา
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{
                            p: 2,
                            backgroundColor: 'error.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'error.300'
                          }}
                        >
                          {selectedNameAd || 'ไม่มีข้อมูลสื่อ'}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant='h6' sx={{ color: 'error.main', mb: 1 }}>
                          📝 รายละเอียดโฆษณา
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{
                            p: 2,
                            backgroundColor: 'error.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'error.300',
                            minHeight: '60px'
                          }}
                        >
                          {selectedDescriptionAd || 'ไม่มีรายละเอียดโฆษณา'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </DialogContent>
            </Dialog>
          </CardContent>

          {error && (
            <Alert variant='outlined' severity='error'>
              {error}
            </Alert>
          )}

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
        </div>
      </Grid>

      <Grid size={{ xs: 12 }} className='flex items-center justify-between'>
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
      </Grid>
    </Grid>
  )
}

export default StepPersonalDetails
