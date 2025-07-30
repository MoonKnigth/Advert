'use client'

import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Alert,
  Tab,
  Checkbox,
  Button,
  Modal,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Fade,
  Backdrop,
  Paper,
  Stack,
  CardHeader,
  CardActions
} from '@mui/material'
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  AccessTime as TimeIcon,
  Storage as StorageIcon
} from '@mui/icons-material'
import type { SyntheticEvent } from 'react'
import Cookies from 'js-cookie'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

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

export default function MediaPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const cloud = 'https://cloud.softacular.net'

  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState<string>('1')
  const [selected, setSelected] = useState<number[]>([])
  const [deleting, setDeleting] = useState(false)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null)

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue)
    setSelected([])
  }

  const handleSelect = (id: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleSelectAll = () => {
    if (selected.length === filteredMedia.length) {
      setSelected([])
    } else {
      setSelected(filteredMedia.map(item => item.id))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const accessToken = Cookies.get('accessToken')
      if (!accessToken) {
        setError('No access token found')
        return
      }

      const res = await fetch('/api/auth/media/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selected })
      })

      if (res.ok) {
        const remaining = media.filter(item => !selected.includes(item.id))
        setMedia(remaining)
        setSelected([])
      } else {
        setError('Failed to delete media items')
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('Error occurred while deleting')
    } finally {
      setDeleting(false)
    }
  }

  const handleMediaClick = (item: MediaItem, event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('.MuiCheckbox-root')) {
      return
    }

    setCurrentMedia(item)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setCurrentMedia(null)
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const accessToken = Cookies.get('accessToken')

        if (!accessToken) {
          setError('No access token found')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/media', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        const rawText = await res.clone().text()
        let data
        try {
          data = JSON.parse(rawText)
        } catch (err) {
          console.error('Invalid JSON:', err)
          setError('Invalid JSON response')
          setLoading(false)
          return
        }

        if (res.ok && data?.data?.success && Array.isArray(data?.data?.data?.media)) {
          setMedia(data.data.data.media)
        } else {
          console.warn('Unexpected data format:', data)
          setError('Unexpected response structure (missing media array)')
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchMedia()
  }, [])

  if (loading) {
    return (
      <Box sx={{ p: 6 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant='h6' sx={{ color: 'text.secondary' }}>
              Loading Media Gallery...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 6 }}>
        <Alert severity='error' variant='filled' sx={{ borderRadius: 2 }}>
          <Typography variant='h6'>Something went wrong!</Typography>
          <Typography variant='body2'>{error}</Typography>
        </Alert>
      </Box>
    )
  }

  const filteredMedia = media.filter(
    item => item.status === 1 && (value === '1' ? item.type === 'video' : item.type === 'image')
  )

  return (
    <>
      <Typography variant='h4' sx={{ pb: 5, pl: 2, fontWeight: 600, color: 'text.primary' }}>
        Media Gallery
      </Typography>

      <Box sx={{ p: 0 }}>
        {/* Navigation Tabs */}
        <Card sx={{ mb: 0 }}>
          <TabContext value={value}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}>
              <TabList onChange={handleChange} variant='fullWidth'>
                <Tab
                  value='1'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VideoIcon />
                      <span>Videos</span>
                      <Chip
                        label={media.filter(item => item.type === 'video' && item.status === 1).length}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
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
                      <Chip
                        label={media.filter(item => item.type === 'image' && item.status === 1).length}
                        size='small'
                        color='secondary'
                        variant='outlined'
                      />
                    </Box>
                  }
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
              </TabList>
            </Box>
          </TabContext>
        </Card>

        {/* Actions Bar */}
        {filteredMedia.length > 0 && (
          <Card sx={{ mb: 6, mt: -2 }}>
            <CardContent sx={{ py: 5 }}>
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                <Button
                  variant={selected.length > 0 ? 'contained' : 'outlined'}
                  startIcon={<SelectAllIcon />}
                  onClick={handleSelectAll}
                  size='small'
                >
                  {selected.length === filteredMedia.length ? 'Deselect All' : 'Select All'}
                </Button>

                {selected.length > 0 && (
                  <Fade in={selected.length > 0}>
                    <Button
                      variant='contained'
                      color='error'
                      startIcon={<DeleteIcon />}
                      onClick={handleDelete}
                      disabled={deleting}
                      size='small'
                    >
                      {deleting ? 'Deleting...' : `Delete (${selected.length})`}
                    </Button>
                  </Fade>
                )}

                <Box sx={{ ml: 'auto' }}>
                  <Chip
                    label={
                      selected.length > 0
                        ? `${selected.length} of ${filteredMedia.length} selected`
                        : `${filteredMedia.length} items total`
                    }
                    variant='outlined'
                    color={selected.length > 0 ? 'primary' : 'default'}
                  />
                </Box>
              </Stack>
            </CardContent>
            <CardContent>
              {/* Media Grid */}
              {filteredMedia.length === 0 ? (
                <Paper sx={{ p: 8, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Avatar sx={{ mx: 'auto', mb: 3, bgcolor: 'grey.200', width: 64, height: 64 }}>
                    {value === '1' ? <VideoIcon sx={{ fontSize: 32 }} /> : <ImageIcon sx={{ fontSize: 32 }} />}
                  </Avatar>
                  <Typography variant='h6' sx={{ mb: 1, color: 'text.secondary' }}>
                    No {value === '1' ? 'videos' : 'images'} found
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    Upload some {value === '1' ? 'videos' : 'images'} to get started
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={6}>
                  {filteredMedia.map(item => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
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
                        {/* Selection Checkbox */}
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
                        {/* Media Preview */}
                        <Box
                          sx={{
                            position: 'relative',
                            height: 200,
                            bgcolor: 'grey.100',
                            overflow: 'hidden'
                          }}
                          onClick={e => handleMediaClick(item, e)}
                        >
                          <img
                            src={`${cloud}${item.thumbnailUrl || item.fileUrl}`}
                            alt={item.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />

                          {/* Video Play Overlay */}
                          {item.type === 'video' && (
                            <>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  width: 56,
                                  height: 56,
                                  borderRadius: '50%',
                                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                                    transform: 'translate(-50%, -50%) scale(1.1)'
                                  }
                                }}
                              >
                                <PlayIcon sx={{ color: 'white', fontSize: 28, ml: 0.5 }} />
                              </Box>

                              {/* Duration Badge */}
                              {item.duration && (
                                <Chip
                                  icon={<TimeIcon sx={{ fontSize: 14 }} />}
                                  label={formatDuration(item.duration)}
                                  size='small'
                                  sx={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                                    color: 'white',
                                    '& .MuiChip-icon': { color: 'white' }
                                  }}
                                />
                              )}
                            </>
                          )}
                        </Box>

                        {/* Card Content */}
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

                          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                            <StorageIcon sx={{ fontSize: 16, mr: 1 }} />
                            <Typography variant='caption'>{formatFileSize(item.fileSize)}</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Modal */}
        <Modal
          open={modalOpen}
          onClose={handleModalClose}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
            sx: { bgcolor: 'rgba(0, 0, 0, 0.8)' }
          }}
        >
          <Fade in={modalOpen}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '95vw', md: '80vw' },
                maxWidth: '1000px',
                maxHeight: '90vh',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 24,
                outline: 'none',
                overflow: 'auto'
              }}
            >
              {/* Modal Header */}
              <CardHeader
                title={currentMedia?.title}
                action={
                  <IconButton onClick={handleModalClose}>
                    <CloseIcon />
                  </IconButton>
                }
                sx={{ pb: 1 }}
              />

              <Divider />

              {/* Modal Content */}
              {currentMedia && (
                <CardContent sx={{ p: 3 }}>
                  {currentMedia.type === 'video' ? (
                    <video
                      controls
                      autoPlay
                      style={{
                        width: '100%',
                        maxHeight: '60vh',
                        borderRadius: 8,
                        backgroundColor: '#000'
                      }}
                    >
                      <source src={`${cloud}${currentMedia.fileUrl}`} type='video/mp4' />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <img
                        src={`${cloud}${currentMedia.fileUrl || currentMedia.thumbnailUrl}`}
                        alt={currentMedia.title}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '60vh',
                          objectFit: 'contain',
                          borderRadius: 8
                        }}
                      />
                    </Box>
                  )}

                  {/* Media Details */}
                  <Box sx={{ mt: 3, ml: 2 }}>
                    <Typography variant='h6' sx={{ mb: 2 }}>
                      Details
                    </Typography>
                    <Stack direction='row' spacing={2} flexWrap='wrap'>
                      <Chip
                        icon={currentMedia.type === 'video' ? <VideoIcon /> : <ImageIcon />}
                        label={currentMedia.type.toUpperCase()}
                        color={currentMedia.type === 'video' ? 'primary' : 'secondary'}
                      />
                      <Chip icon={<StorageIcon />} label={formatFileSize(currentMedia.fileSize)} variant='outlined' />
                      {currentMedia.duration && (
                        <Chip icon={<TimeIcon />} label={formatDuration(currentMedia.duration)} variant='outlined' />
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              )}

              {/* Modal Actions */}
              {/* <CardActions sx={{ justifyContent: 'flex-end', px: 3, pb: 3 }}>
              <Button startIcon={<DownloadIcon />} variant='outlined'>
                Download
              </Button>
              <Button onClick={handleModalClose} variant='contained'>
                Close
              </Button>
            </CardActions> */}
            </Box>
          </Fade>
        </Modal>
      </Box>
    </>
  )
}
