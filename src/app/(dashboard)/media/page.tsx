'use client'

import React, { useEffect, useMemo, useState, startTransition } from 'react'

import type { SyntheticEvent } from 'react'

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
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Snackbar
} from '@mui/material'

// MUI extras
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

// Icons
import {
  PlayArrow as PlayIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon,
  Download as DownloadIcon,
  AccessTime as TimeIcon,
  Storage as StorageIcon,
  Edit as EditIcon
} from '@mui/icons-material'

import Cookies from 'js-cookie'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

import DialogCloseButton from '@/components/dialogs/DialogCloseButton'
import CustomTextField from '@/@core/components/mui/TextField'

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
  description: string | null
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

  // Preview Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null)

  // Edit Dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editMedia, setEditMedia] = useState<MediaItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Actions menu (เผื่อใช้ภายหลัง)
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null)
  const [actionItem, setActionItem] = useState<MediaItem | null>(null)

  // Toast
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success'
  })

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue)
    setSelected([])
  }

  const handleSelect = (id: number, event?: React.MouseEvent) => {
    event?.stopPropagation()
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
        setMedia(prev => prev.filter(item => !selected.includes(item.id)))
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

    if (target.closest('.MuiCheckbox-root')) return
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

  // ✅ memo ช่วยลดงานกรองทุกครั้งที่ re-render
  const filteredMedia = useMemo(
    () => media.filter(item => item.status === 1 && (value === '1' ? item.type === 'video' : item.type === 'image')),
    [media, value]
  )

  useEffect(() => {
    if (editOpen && editMedia) {
      setEditTitle(editMedia.title ?? '')
      setEditDescription(editMedia.description ?? '')
    }

    // ปิด dialog แล้วไม่ต้องไปแตะค่าอีก
  }, [editOpen, editMedia])

  const handleEditClick = (item: MediaItem) => {
    setEditMedia(item)
    setEditOpen(true)
  }

  const handleEditClose = () => {
    setEditOpen(false)
    setEditMedia(null)
  }

  // ✅ optimistic + partial payload + timeout + rollback
  const handleEditSave = async () => {
    if (!editMedia) return

    // partial payload เฉพาะ field ที่เปลี่ยน
    const payload: Partial<Pick<MediaItem, 'title' | 'description'>> = {}

    if (editTitle !== (editMedia.title ?? '')) payload.title = editTitle
    if (editDescription !== (editMedia.description ?? '')) payload.description = editDescription

    if (!Object.keys(payload).length) {
      setEditOpen(false)

      return
    }

    const accessToken = Cookies.get('accessToken')

    // optimistic update ทันที + ปิด dialog
    const previous = media

    startTransition(() => {
      setMedia(prev => prev.map(m => (m.id === editMedia.id ? { ...m, ...payload } : m)))
    })
    setEditOpen(false)

    // network with timeout
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 8000)

    try {
      setIsSaving(true)

      const res = await fetch(`/api/auth/media/${editMedia.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(t)

      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.success === false) throw new Error(json?.message || 'Update failed')

      setToast({ open: true, msg: 'Updated successfully', sev: 'success' })
    } catch (e: any) {
      clearTimeout(t)

      // rollback
      startTransition(() => setMedia(previous))
      setToast({ open: true, msg: e?.message || 'Update failed', sev: 'error' })
      setError(e?.message || 'Network error occurred while updating media')
    } finally {
      setIsSaving(false)
    }
  }

  // actions menu helpers (ยังไม่ได้ใช้ใน UI — เผื่ออนาคต)

  const handleCloseActions = () => {
    setActionAnchor(null)
    setActionItem(null)
  }

  const handleEditFromMenu = () => {
    if (!actionItem) return
    handleEditClick(actionItem)
    handleCloseActions()
  }

  const handleDeleteSingle = async (id: number) => {
    setDeleting(true)

    try {
      const accessToken = Cookies.get('accessToken')

      if (!accessToken) {
        setError('No access token found')

        return
      }

      const res = await fetch('/api/auth/media/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] })
      })

      if (res.ok) setMedia(prev => prev.filter(m => m.id !== id))
      else setError('Failed to delete media item')
    } catch (err) {
      console.error(err)
      setError('Error occurred while deleting')
    } finally {
      setDeleting(false)
      handleCloseActions()
    }
  }

  const isUnchanged =
    !!editMedia && editTitle === (editMedia.title || '') && editDescription === (editMedia.description || '')

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

  return (
    <>
      <Typography variant='h4' sx={{ pb: 5, pl: 2, fontWeight: 600, color: 'text.primary' }}>
        Media Gallery
      </Typography>

      <Box sx={{ p: 0 }}>
        {/* Tabs */}
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

            {/* Grid */}
            <CardContent>
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
                          '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
                        }}
                      >
                        {/* Select checkbox */}
                        <Tooltip title='Select'>
                          <Checkbox
                            checked={selected.includes(item.id)}
                            onChange={() => handleSelect(item.id)}
                            onClick={e => e.stopPropagation()}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              zIndex: 2,
                              bgcolor: 'background.paper',
                              borderRadius: 1,
                              boxShadow: 2,
                              '&:hover': { bgcolor: 'background.paper' }
                            }}
                          />
                        </Tooltip>

                        {/* Edit (desktop) */}
                        {!isMobile ? (
                          <Tooltip title='Edit'>
                            <IconButton
                              size='small'
                              aria-label='Edit'
                              onClick={e => {
                                e.stopPropagation()
                                handleEditClick(item)
                              }}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                zIndex: 2,
                                bgcolor: 'background.paper',
                                boxShadow: 5,
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                              <EditIcon fontSize='small' />
                            </IconButton>
                          </Tooltip>
                        ) : null}

                        {/* Thumbnail / Video */}
                        <Box
                          sx={{ position: 'relative', height: 200, bgcolor: 'grey.100', overflow: 'hidden' }}
                          onClick={e => handleMediaClick(item, e)}
                        >
                          <img
                            src={`${cloud}${item.thumbnailUrl || item.fileUrl}`}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />

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

                              {item.duration && (
                                <Chip
                                  icon={<TimeIcon sx={{ fontSize: 14 }} />}
                                  label={formatDuration(item.duration)}
                                  size='small'
                                  sx={{
                                    position: 'absolute',
                                    bottom: 8,
                                    right: 8,
                                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                                    color: 'white',
                                    '& .MuiChip-icon': { color: 'white' }
                                  }}
                                />
                              )}
                            </>
                          )}
                        </Box>

                        {/* Card body */}
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
                            {item.id} / {item.title}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant='caption'>{formatFileSize(item.fileSize)}</Typography>
                            <Typography variant='caption'>Size : {item.aspectRatio} px</Typography>
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

        {/* Preview Modal */}
        <Modal
          open={modalOpen}
          onClose={handleModalClose}
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{ timeout: 500, sx: { bgcolor: 'rgba(0, 0, 0, 0.8)' } }}
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
              {/* Close btn */}
              <DialogCloseButton
                onClick={handleModalClose}
                disableRipple
                sx={{
                  position: 'absolute',
                  top: 15,
                  right: 15,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'),
                  backdropFilter: 'blur(6px)',
                  color: 'text.primary',
                  boxShadow: 3,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  '&:hover': { boxShadow: 4 }
                }}
              >
                <i className='bx-x' />
              </DialogCloseButton>

              <CardHeader title={currentMedia?.title} sx={{ pb: 1, pr: 10 }} />
              <Divider />

              {currentMedia && (
                <CardContent sx={{ p: 3 }}>
                  {currentMedia.type === 'video' ? (
                    <video
                      controls
                      autoPlay
                      style={{ width: '100%', maxHeight: '60vh', borderRadius: 8, backgroundColor: '#000' }}
                    >
                      <source src={`${cloud}${currentMedia.fileUrl}`} type='video/mp4' />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <img
                        src={`${cloud}${currentMedia.fileUrl || currentMedia.thumbnailUrl}`}
                        alt={currentMedia.title}
                        style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }}
                      />
                    </Box>
                  )}

                  <Box sx={{ mt: 3, ml: 2 }}>
                    <Typography variant='h6' sx={{ mb: 2 }}>
                      Details :{' '}
                      {currentMedia.description && currentMedia.description.trim() !== ''
                        ? currentMedia.description
                        : '-'}
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
            </Box>
          </Fade>
        </Modal>

        {/* Edit Dialog */}
        <Dialog
          open={editOpen}
          onClose={handleEditClose}
          closeAfterTransition={false}
          sx={{ '& .MuiDialog-paper': { overflow: 'visible' } }}
          fullWidth
          maxWidth='sm'
        >
          <DialogCloseButton onClick={handleEditClose} disableRipple>
            <i className='bx-x' />
          </DialogCloseButton>

          <DialogTitle variant='h4' className='flex flex-col gap-2 text-center p-6 sm:pbs-16 sm:pbe-6 sm:pli-16'>
            Edit Media
            <Typography component='span' className='flex flex-col text-center'>
              Edit data
            </Typography>
          </DialogTitle>

          <form
            onSubmit={e => {
              e.preventDefault()
              handleEditSave()
            }}
          >
            <DialogContent className='overflow-visible pbs-0 p-6 sm:pli-16'>
              <Grid container spacing={6}>
                <Grid item xs={12}>
                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
                    Type
                  </Typography>
                  <Typography variant='body1' sx={{ fontWeight: 600 }}>
                    {editMedia?.type?.toUpperCase() || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <CustomTextField
                    fullWidth
                    autoComplete='off'
                    label='Title'
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    variant='standard'
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    rows={4}
                    multiline
                    label='Description'
                    variant='outlined'
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions className='justify-center pbs-0 p-6 sm:pbe-16 sm:pli-16'>
              <Button variant='contained' type='submit' disabled={isSaving || !!isUnchanged}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant='tonal' type='button' color='secondary' onClick={handleEditClose}>
                Cancel
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>

      {/* Actions menu (ยังไม่แสดงปุ่มเรียกในการ์ด) */}
      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={handleCloseActions}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClick={e => e.stopPropagation()}
      >
        <MenuItem onClick={handleEditFromMenu}>
          <ListItemIcon>
            <EditIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => actionItem && handleDeleteSingle(actionItem.id)} disabled={deleting}>
          <ListItemIcon>
            <DeleteIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>{deleting ? 'Deleting...' : 'Delete'}</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleCloseActions()

            // TODO: download if needed
            // window.open(`${cloud}${actionItem?.fileUrl}`, '_blank')
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize='small' />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.sev}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  )
}
