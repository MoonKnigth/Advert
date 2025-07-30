// React Imports
import { useState, useEffect } from 'react'

// MUI Imports
import Grid2 from '@mui/material/Grid'
import Grid from '@mui/material/Grid2'
import { CardMedia } from '@mui/material'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'

// Component Imports
import DirectionalIcon from '@components/DirectionalIcon'
import { Avatar, Box, Card, Divider, Container, CardContent } from '@mui/material'
import { Icon } from '@iconify/react'

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
}

type Props = {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  isInternal?: boolean
  orientation: 'landscape' | 'portrait'
  selectedOldFiles: MediaItem[]
  // ✅ เพิ่ม props สำหรับรับข้อมูลจาก StepPropertyDetails
  adName: string
  adDescription: string
  uploadedFiles: UploadedFile[]
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
}

const StepPropertyFeatures = ({
  activeStep,
  handleNext,
  handlePrev,
  steps,
  isInternal = true,
  orientation,
  selectedOldFiles,
  // ✅ รับข้อมูลใหม่
  adName,
  adDescription,
  uploadedFiles,
  setUploadedFiles
}: Props) => {
  // States
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<any>(null)
  const [currentImage, setCurrentImage] = useState<any>(null)

  const cloud = 'https://cloud.softacular.net'

  useEffect(() => {
    console.log('✅ Data received in StepPropertyFeatures:')
    console.log('Orientation:', orientation)
    console.log('Ad Name:', adName)
    console.log('Ad Description:', adDescription)
    console.log('Uploaded Files:', uploadedFiles)
    console.log('Selected Old Files:', selectedOldFiles)
  }, [orientation, adName, adDescription, uploadedFiles, selectedOldFiles])

  // แก้ไข useEffect สำหรับการสร้าง thumbnail และ URL
  useEffect(() => {
    uploadedFiles.forEach((video, index) => {
      const file = video.file
      if (file.type.startsWith('video/')) {
        // ตรวจสอบว่ามี URL อยู่แล้วหรือไม่
        if (video.url) return

        const videoElement = document.createElement('video')
        const videoUrl = URL.createObjectURL(file)

        videoElement.src = videoUrl
        videoElement.currentTime = 1

        videoElement.addEventListener('loadeddata', () => {
          const canvas = document.createElement('canvas')
          canvas.width = videoElement.videoWidth
          canvas.height = videoElement.videoHeight
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
          const thumbnail = canvas.toDataURL('image/jpeg')

          setUploadedFiles(prev => {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              preview: thumbnail,
              url: videoUrl // เก็บ URL ไว้ใช้
            }
            return updated
          })
        })

        videoElement.addEventListener('error', e => {
          console.error('Error loading video:', e)
        })
      }
    })

    // ✅ ลบ cleanup ที่ revoke URL ออก เพื่อให้สามารถเล่นวิดีโอได้
    // return () => {
    //   urlsToRevoke.forEach(url => {
    //     URL.revokeObjectURL(url)
    //   })
    // }
  }, [uploadedFiles, setUploadedFiles])

  // ✅ เพิ่ม cleanup เฉพาะเมื่อ component unmount
  useEffect(() => {
    return () => {
      // Cleanup URLs เมื่อ component unmount
      uploadedFiles.forEach(file => {
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url)
        }
      })
    }
  }, [])

  // ✅ แยกไฟล์วิดีโอและรูปภาพจาก uploadedFiles
  const uploadedVideos = uploadedFiles.filter(file => file.type.startsWith('video/'))
  const uploadedImages = uploadedFiles.filter(file => file.type.startsWith('image/'))

  // ✅ แยกไฟล์วิดีโอและรูปภาพจาก selectedOldFiles
  const selectedOldVideos = selectedOldFiles.filter(file => file.type === 'video')
  const selectedOldImages = selectedOldFiles.filter(file => file.type === 'image')

  // ✅ รวมไฟล์ทั้งหมด
  const allVideos = [...uploadedVideos, ...selectedOldVideos]
  const allImages = [...uploadedImages, ...selectedOldImages]

  // ✅ แก้ไขฟังก์ชัน handleVideoPlay สำหรับวิดีโอที่อัพโหลดใหม่
  const handleVideoPlay = (video: any) => {
    console.log('Playing video:', video) // สำหรับ debug

    // ถ้าเป็นวิดีโอที่อัพโหลดใหม่ และไม่มี URL ให้สร้างใหม่
    if (video.isUploaded && !video.url) {
      const uploadedVideo = uploadedFiles.find(f => f.name === video.name)
      if (uploadedVideo?.file) {
        const newUrl = URL.createObjectURL(uploadedVideo.file)
        video.url = newUrl
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <Typography variant='h3'>กำหนดขนาดของวิดีโอ</Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 12 }} sx={{ display: 'flex', justifyContent: 'space-around' }}>
        <Card
          sx={{
            py: 5,
            display: 'flex',
            width: '100%'
          }}
        >
          <Container>
            <Box display={'flex'} flexDirection={'column'} alignItems={'center'}>
              <img src='/images/tv/Vector_red_big.svg' height='300' width='300' />
              <Typography sx={{ mt: -9 }} variant='h5' color='initial'>
                แนวนอน/แนวตั้ง: {orientation === 'landscape' ? 'แนวนอน (16:9)' : 'แนวตั้ง (9:16)'}
              </Typography>
            </Box>
          </Container>
          <Divider
            orientation='vertical'
            flexItem
            sx={{
              width: '2px',
              backgroundColor: '#ccc',
              borderRadius: 1
            }}
          />
          <Container>
            <Box display={'flex'} alignItems={'center'} flexDirection={'column'}>
              <Box display={'flex'} flexDirection={'column'} sx={{ width: '80%' }}>
                {/* ✅ แสดงชื่อและคำอธิบายจากข้อมูลที่ส่งมา */}
                <Typography display={'flex'} variant='h3' color='initial'>
                  {adName || 'ไม่ได้ระบุชื่อ'}
                </Typography>
                <Typography variant='h6' color='secondary'>
                  {adDescription || 'ไม่มีคำอธิบาย'}
                </Typography>
                <Divider
                  sx={{
                    my: 5,
                    height: '1.5px',
                    backgroundColor: '#ccc',
                    borderRadius: 1
                  }}
                />
                <Box display={'flex'} justifyContent={'space-between'} sx={{ width: '80%' }}>
                  <Box display={'flex'}>
                    <Avatar sx={{ bgcolor: 'secondary' }} variant='rounded'>
                      <Icon icon='lucide:calendar-clock' color='red' width={22} />
                    </Avatar>
                    <Box display={'flex'} flexDirection={'column'} sx={{ ml: 2 }}>
                      <Typography variant='caption' color='secondary'>
                        วันที่เริ่มต้น
                      </Typography>
                      <Typography variant='caption' color='initial'>
                        10/07/2025
                      </Typography>
                    </Box>
                  </Box>
                  <Box display={'flex'} flexDirection={'column'} sx={{ ml: 2 }}>
                    <Typography variant='caption' color='secondary'>
                      วันที่สิ้นสุด
                    </Typography>
                    <Typography variant='caption' color='initial'>
                      17/07/2025
                    </Typography>
                  </Box>
                </Box>
                <Box display={'flex'} sx={{ mt: 5 }}>
                  <Avatar sx={{ bgcolor: 'secondary' }} variant='rounded'>
                    <Icon icon='fluent-mdl2:quantity' color='red' width={22} />
                  </Avatar>
                  <Box display={'flex'} flexDirection={'column'} sx={{ ml: 2 }}>
                    <Typography variant='caption' color='secondary'>
                      จำนวนโฆษณา
                    </Typography>
                    <Typography variant='caption' color='initial'>
                      {allVideos.length + allImages.length} รายการ
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box display={'flex'} justifyContent={'space-around'} sx={{ m: 4, width: '60%' }}>
                <Box display={'flex'} sx={{ m: 2 }}>
                  <Avatar sx={{ bgcolor: '#FAA84E' }} variant='rounded'>
                    <Icon icon='tabler:video' color='white' width={22} />
                  </Avatar>
                  <Box display={'flex'} flexDirection={'column'} sx={{ ml: 2 }}>
                    <Typography variant='caption' color='secondary'>
                      วิดีโอ
                    </Typography>
                    <Typography variant='caption' color='initial'>
                      {allVideos.length}
                    </Typography>
                  </Box>
                </Box>
                <Box display={'flex'} sx={{ m: 2 }}>
                  <Avatar sx={{ bgcolor: '#49AC00' }} variant='rounded'>
                    <Icon icon='material-symbols:image-outline' color='white' width={22} />
                  </Avatar>
                  <Box display={'flex'} flexDirection={'column'} sx={{ ml: 2 }}>
                    <Typography variant='caption' color='secondary'>
                      รูปภาพ
                    </Typography>
                    <Typography variant='caption' color='initial'>
                      {allImages.length}
                    </Typography>
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
      <Box>
        {/* ✅ ส่วนวิดีโอ - แสดงทั้งไฟล์ใหม่และไฟล์เก่า */}
        <Box display='flex' alignItems='center' mb={2} gap={1}>
          <Icon icon='mdi:play-box' color='red' width={24} />
          <Typography variant='h6'>ไฟล์วิดีโอ ({allVideos.length} รายการ)</Typography>
        </Box>

        <Grid container spacing={2}>
          {/* แสดงวิดีโอที่อัพโหลดใหม่// ✅ แก้ไขการส่งข้อมูลไปยัง handleVideoPlay สำหรับวิดีโอที่อัพโหลดใหม่ */}
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
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {video.name}
                  </Typography>
                  <Box display='flex' justifyContent='space-between' fontSize={12} mt={0.5}>
                    <Typography>ใหม่</Typography>
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
                        url: video.url || URL.createObjectURL(video.file), // ✅ fallback ถ้าไม่มี URL
                        file: video.file, // เพิ่ม file object
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
          {/* ✅ เพิ่มการ debug ใน Video Dialog */}
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
                <>
                  {process.env.NODE_ENV === 'development' && (
                    <Typography variant='caption' display='block' mb={1}>
                      URL: {currentVideo.url}
                    </Typography>
                  )}
                  <video
                    controls
                    width='100%'
                    style={{ maxHeight: '400px' }}
                    autoPlay
                    onError={e => {
                      console.error('Video playback error:', e)
                      console.log('Video URL:', currentVideo.url)
                    }}
                    onLoadStart={() => {
                      console.log('Video loading started')
                    }}
                  >
                    <source src={currentVideo.url} type='video/mp4' />
                    <source src={currentVideo.url} type='video/webm' />
                    <source src={currentVideo.url} type='video/ogg' />
                    Your browser does not support the video tag.
                  </video>
                </>
              )}
            </DialogContent>
          </Dialog>
          {/* แสดงวิดีโอเก่าที่เลือก */}
          {selectedOldVideos.map((video, index) => (
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
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
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

        {allImages.length > 0 && (
          <>
            <Divider
              sx={{
                my: 5,
                height: '2px',
                backgroundColor: '#ccc',
                borderRadius: 1
              }}
            />

            {/* ✅ ส่วนภาพ - แสดงทั้งไฟล์ใหม่และไฟล์เก่า */}
            <Box display='flex' alignItems='center' mb={2} gap={1}>
              <Icon icon='mdi:image' color='red' width={24} />
              <Typography variant='h6'>ไฟล์รูปภาพ ({allImages.length} รายการ)</Typography>
            </Box>

            <Grid container spacing={2}>
              {/* แสดงรูปภาพที่อัพโหลดใหม่ */}
              {uploadedImages.map((image, index) => (
                <Grid size={{ xs: 12, md: 3 }} key={`uploaded-image-${index}`}>
                  <Box display={'flex'} flexDirection={'column'} sx={{ alignItems: 'center' }}>
                    <Typography
                      variant='body2'
                      sx={{
                        textAlign: 'left',
                        mb: 1,
                        width: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {image.name}
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

              {/* แสดงรูปภาพเก่าที่เลือก */}
              {selectedOldImages.map((image, index) => (
                <Grid size={{ xs: 12, md: 3 }} key={`old-image-${image.id}`}>
                  <Box display={'flex'} flexDirection={'column'} sx={{ alignItems: 'center' }}>
                    <Typography variant='body2' sx={{ textAlign: 'center', mb: 1 }}>
                      {image.title}
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
      </Box>

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
            <video controls width='100%' style={{ maxHeight: '400px' }} autoPlay>
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
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '500px',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {isInternal && (
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
      )}
    </Grid>
  )
}

export default StepPropertyFeatures
