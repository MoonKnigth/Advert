// React Imports
import { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react'
import { PlayArrow as PlayIcon, VideoLibrary as VideoIcon, Image as ImageIcon } from '@mui/icons-material'

// MUI Imports
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
  Tabs
} from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'

// Component Imports
import Cookies from 'js-cookie'
import { Icon } from '@iconify/react'
import axios from 'axios'

// Define Types
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

interface MediaItem {
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

// Props for component
type Props = {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  isInternalEdit?: boolean
  onOrientationChange?: (value: 'landscape' | 'portrait') => void
  selectedOldFiles: MediaItem[]
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

// Styled Components
const Content = styled(Typography)(({ theme }) => ({
  ...theme.typography.body2,
  textAlign: 'center'
}))

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
  border: `2px dashed ${hasError ? theme.palette.error.main : isDragging ? theme.palette.primary.main : theme.palette.grey[300]}`,
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

const StepPropertyDetails = ({
  activeStep,
  handleNext,
  handlePrev,
  steps,
  isInternalEdit = true,
  onOrientationChange,
  selectedOldFiles,
  oldFiles,
  setOldFiles,
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
  // ---- Options
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

  // ---- State
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')
  const [tabValue, setTabValue] = useState<string>('1')
  const [showOldFiles, setShowOldFiles] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cloud = 'https://cloud.softacular.net'

  // ---- File Validation
  const validateFile = (file: File): string | null => {
    const maxSize = 120 * 1024 * 1024 // 120MB
    const allowedTypes = ['video/mp4', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']

    if (!allowedTypes.includes(file.type)) return 'รองรับเฉพาะไฟล์ .mp4 หรือไฟล์ภาพ (JPG, PNG, WEBP, GIF)'
    if (file.size > maxSize) return 'ขนาดไฟล์ต้องไม่เกิน 120MB'
    return null
  }

  // ---- Upload Logic
  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return
      setUploadError('')
      const newFiles: UploadedFile[] = []
      Array.from(files).forEach((file: File) => {
        const error = validateFile(file)
        if (error) {
          setUploadError(error)
          return
        }
        const uploadedFile: UploadedFile = {
          file,
          name: file.name.replace(/\.[^/.]+$/, ''),
          size: file.size,
          type: file.type,
          preview: URL.createObjectURL(file)
        }
        newFiles.push(uploadedFile)
      })
      setUploadedFiles(prev => [...prev, ...newFiles])
      if (newFiles.length > 0) console.log('Uploaded Files:', newFiles)
    },
    [setUploadedFiles]
  )

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files)
    if (event.target) event.target.value = ''
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
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
      const newFiles = [...prev]
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview!)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  // ---- Orientation
  const handleOrientationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as 'landscape' | 'portrait'
    onOrientationChange?.(value)
  }

  // ---- Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // ---- Edit file name
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newFileName, setNewFileName] = useState<string>('')
  const handleEditClick = (index: number) => {
    setEditingIndex(index)
    setNewFileName(uploadedFiles[index].name)
  }
  const handleSave = () => {
    if (editingIndex !== null) {
      const sanitizedName = newFileName.replace(/[^a-zA-Z0-9 _-]/g, '')

      setUploadedFiles(prev => {
        const updatedFiles = [...prev]
        updatedFiles[editingIndex].name = sanitizedName
        return updatedFiles
      })

      setEditingIndex(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
  }
  const handleCancel = () => setEditingIndex(null)

  // ---- Upload via Proxy
  const uploadViaProxy = async () => {
    const formData = new FormData()
    uploadedFiles.forEach((file, index) => {
      formData.append(`media[${index}].name`, file.name)
      formData.append(`media[${index}].comments`, file.comments || '')
      formData.append(`media[${index}].file`, file.file)
    })
    try {
      const res = await axios.post('/api/auth/upload-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${Cookies.get('accessToken')}`
        }
      })
      if (res.data.success && Array.isArray(res.data.data)) {
        ;(res.data.data as MediaItem[]).forEach((item: MediaItem) => {
          console.log('[📦 Uploaded]', {
            id: item.id,
            title: item.title,
            type: item.type,
            fileUrl: item.fileUrl,
            fileSize: item.fileSize
          })
        })
      } else {
        console.warn('[❗️ Upload failed]', res.data.message, res.data.raw)
      }
    } catch (err: any) {
      console.error('❌ Upload via proxy failed:', err?.response?.data?.message ?? err.message, err)
    }
  }

  const checkUploadedFileStatus = async () => {
    if (uploadedFiles.length > 0) {
      await uploadViaProxy()
    } else {
      console.log('2') // ไม่มีการอัปโหลดไฟล์
    }
  }

  // ---- Old file & Media select
  const handleOldFilesClick = async () => {
    setShowOldFiles(!showOldFiles)
    if (!showOldFiles) {
      try {
        const res = await fetch('/api/auth/media', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${Cookies.get('accessToken')}`,
            'Content-Type': 'application/json'
          }
        })
        if (res.ok) {
          const data = await res.json()
          const files = data?.data?.data?.media || []
          setOldFiles(files)
          console.log('Old files:', files)
        } else {
          console.error('Failed to fetch old files')
        }
      } catch (err) {
        console.error('Error fetching old files', err)
      }
    }
  }

  const handleSelect = (id: number) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => setTabValue(newValue)
  const videoFiles = oldFiles.filter((item: MediaItem) => item.type === 'video' && item.status === 1)
  const imageFiles = oldFiles.filter((item: MediaItem) => item.type === 'image' && item.status === 1)

  const renderMediaGrid = (mediaItems: MediaItem[]) => (
    <Grid container spacing={3}>
      {mediaItems.map((item: MediaItem) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item.id}>
          <Card
            sx={{
              position: 'relative',
              height: '100%',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              border: selected.includes(item.id) ? 2 : 1,
              borderColor: selected.includes(item.id) ? 'primary.main' : 'divider',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}
          >
            <Checkbox
              checked={selected.includes(item.id)}
              onChange={e => handleSelect(item.id)}
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
                src={`${cloud}${item.thumbnailUrl || item.fileUrl}`}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
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
              >
                {item.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )

  // ---- Ad Name/Desc Change
  const handleAdNameChange = (event: ChangeEvent<HTMLInputElement>) => setAdName(event.target.value)
  const handleAdDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => setAdDescription(event.target.value)

  // ---- Validation before next
  const handleNextWithValidation = async () => {
    if (!adName.trim()) {
      alert('กรุณากรอกชื่อกำหนดการ')
      return
    }
    if (uploadedFiles.length === 0 && selected.length === 0) {
      alert('กรุณาอัพโหลดหรือเลือกไฟล์จากรายการเก่าอย่างน้อย 1 รายการ')
      return
    }
    handleNext()
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
          เลือกกลุ่มทีวี
        </Typography>
      </Grid>
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
                  padding: '20px ',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  zIndex: 1
                }}
              >
                <Box display='flex' alignItems='center' gap={2}>
                  <FormControlLabel
                    value={option.id}
                    control={
                      <Radio
                        sx={{
                          p: 0,
                          '&.Mui-checked': { color: 'success.main' }
                        }}
                      />
                    }
                    label=''
                    sx={{ m: 0 }}
                  />
                  <Box>
                    <Typography variant='h3' component='h1' sx={{ fontWeight: 600, mb: 0.5 }}>
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
                <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img
                    src={option.isLandscape ? '/images/tv/Landscape.svg' : '/images/tv/Portrait.svg'}
                    height='200'
                    width='200'
                    style={{ pointerEvents: 'none' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                      marginTop: '-20px'
                    }}
                  >
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
          hasError={!!uploadError}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', fontSize: '3rem', color: 'secondary.main', alignItems: 'center' }}>
              <i className='bx bx-cloud-upload' />
              <Typography variant='h5' sx={{ color: 'text.secondary', pl: 5 }}>
                ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อเลือกไฟล์
              </Typography>
            </Box>
          </Box>
        </UploadZone>
        {uploadError && (
          <Alert severity='error' sx={{ mt: 2 }}>
            {uploadError}
          </Alert>
        )}
        {/* File Preview */}
        {uploadedFiles.map((file, index) => (
          <FilePreview key={`${file.name}-${index}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ fontSize: '1.5rem', color: 'primary.main' }}>
                <i className={file.type.startsWith('image/') ? 'bx bx-image' : 'bx bx-video'} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{
                    width: '450px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {file.name.replace(/\.[^/.]+$/, '')}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
            </Box>
            <Box display='flex'>
              {editingIndex === index ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    width: '100%'
                  }}
                >
                  <TextField
                    value={newFileName}
                    onChange={e => setNewFileName(e.target.value)}
                    variant='outlined'
                    size='small'
                    sx={{ minWidth: '200px' }}
                    onKeyDown={handleKeyDown}
                  />
                  <IconButton onClick={handleSave} color='success'>
                    <i className='bx bx-check' />
                  </IconButton>
                  <IconButton onClick={handleCancel} color='error'>
                    <i className='bx bx-x' />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    width: '100%'
                  }}
                >
                  <IconButton onClick={() => handleEditClick(index)} sx={{ color: 'error.main' }}>
                    <i className='bx bx-edit' />
                  </IconButton>
                  <IconButton onClick={() => handleRemoveFile(index)} sx={{ color: 'error.main' }}>
                    <i className='bx bx-x' />
                  </IconButton>
                </Box>
              )}
            </Box>
          </FilePreview>
        ))}
      </Grid>
      <Grid size={{ xs: 12, md: 12 }}>
        <Chip
          label='รองรับไฟล์ภาพทุกชนิด และ .mp4, ขนาดวิดีโอที่อัพโหลดต้องไม่เกิน 120MB'
          color='secondary'
          variant='tonal'
        />
      </Grid>
      {/* Old Files Section */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Grid size={{ xs: 12 }}>
            <Button variant='outlined' onClick={handleOldFilesClick} sx={{ width: '100%' }}>
              <Icon icon='mdi:file' width={22} />
              ไฟล์เก่า
            </Button>
            {/* <Button variant='outlined' onClick={checkUploadedFileStatus} sx={{ width: '100%', mt: 5 }}>
              Check Upload Files Test
            </Button> */}
          </Grid>
          {showOldFiles && (
            <Chip
              label={selected.length > 0 ? `${selected.length} selected` : `${oldFiles.length} items total`}
              variant='outlined'
              color={selected.length > 0 ? 'primary' : 'default'}
              sx={{ ml: 5 }}
            />
          )}
        </Box>
        {/* Tabbed Media Selection */}
        {showOldFiles && oldFiles.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <TabContext value={tabValue}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
                <TabList onChange={handleTabChange} variant='fullWidth'>
                  <Tab
                    value='1'
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VideoIcon />
                        <span>Videos</span>
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
                        <span>Images</span>
                        <Chip label={imageFiles.length} size='small' color='secondary' variant='outlined' />
                      </Box>
                    }
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                </TabList>
              </Box>
              <TabPanel value='1' sx={{ p: 3 }}>
                {videoFiles.length > 0 ? renderMediaGrid(videoFiles) : <Typography>ไม่มีวิดีโอ</Typography>}
              </TabPanel>
              <TabPanel value='2' sx={{ p: 3 }}>
                {imageFiles.length > 0 ? renderMediaGrid(imageFiles) : <Typography>ไม่มีรูปภาพ</Typography>}
              </TabPanel>
            </TabContext>
          </Card>
        )}
      </Grid>
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
      <Grid size={{ xs: 12 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label='คำอธิบาย'
          placeholder='ไม่บังคับ'
          value={adDescription}
          onChange={handleAdDescriptionChange}
        />
      </Grid>
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
    </Grid>
  )
}

export default StepPropertyDetails
