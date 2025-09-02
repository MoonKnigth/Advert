'use client'

import React, { useEffect, useMemo, useState, startTransition } from 'react'

import type { SyntheticEvent } from 'react'

import { styled, useTheme } from '@mui/material/styles'

import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Alert,
  Tab,
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
  Snackbar,
  Pagination
} from '@mui/material'

// MUI extras
import Tooltip from '@mui/material/Tooltip'
import MuiMenu from '@mui/material/Menu'
import MuiMenuItem from '@mui/material/MenuItem'
import type { MenuProps } from '@mui/material/Menu'
import type { MenuItemProps } from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

// Icons
import {
  PlayArrow as PlayIcon,
  VideoLibrary as VideoIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  AccessTime as TimeIcon,
  Storage as StorageIcon,
  Edit as EditIcon
} from '@mui/icons-material'

import Cookies from 'js-cookie'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'

import useMediaQuery from '@mui/material/useMediaQuery'

import DialogCloseButton from '@/components/dialogs/DialogCloseButton'
import CustomTextField from '@/@core/components/mui/TextField'

type MediaItem = {
  id: number
  title: string
  type: 'video' | 'image'
  fileUrl: string | null
  thumbnailUrl: string | null
  duration: number | null
  fileSize: number | null
  status: number | null
  aspectRatio: string | null
  description: string | null
}

const normalizeMedia = (m: any): MediaItem => {
  const rawType = String(m?.type ?? m?.file_type ?? '').toLowerCase()
  const type: 'video' | 'image' = rawType === 'video' ? 'video' : 'image'

  return {
    id: Number(m?.id ?? 0),
    title: m?.title ?? m?.name ?? '',
    type,
    fileUrl: m?.fileUrl ?? m?.file_url ?? null,
    thumbnailUrl: m?.thumbnailUrl ?? m?.thumbnail_url ?? null,
    duration: m?.duration != null ? Number(m.duration) : null,
    fileSize: m?.file_size != null ? Number(m.file_size) : m?.fileSize != null ? Number(m.fileSize) : null,
    status: m?.status ?? null,
    aspectRatio: m?.aspect_ratio ?? m?.aspectRatio ?? null,
    description: m?.description ?? null
  }
}

type ServerMediaResponse = {
  success?: boolean
  data?: {
    media?: any[]
    page?: number // 0-based (ของ server)
    size?: number // server page size ที่แท้จริง
    total_elements?: number
    total_pages?: number
  }
}

const fetchServerMediaPage = async (
  p: number,
  size: number,
  type: 'video' | 'image',
  token?: string
): Promise<{ list: any[]; meta: NonNullable<ServerMediaResponse['data']> }> => {
  const res = await fetch(`/api/auth/media?page=${p}&size=${size}&type=${type}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    credentials: 'include',
    cache: 'no-store'
  })

  const text = await res.text()

  if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
  const json = (text ? JSON.parse(text) : {}) as ServerMediaResponse
  const meta = json.data || {}
  const arr = Array.isArray(meta.media) ? meta.media : []

  return { list: arr, meta }
}

export default function MediaPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const cloud = 'https://cloud.softacular.net'

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

  // Pagination state
  const [page, setPage] = useState(1) // หน้าเริ่มที่ 1 (MUI)
  const [rowsPerPage, setRowsPerPage] = useState(12) // จำนวนการ์ดต่อหน้า
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuItemId, setMenuItemId] = useState<number | null>(null)

  const [totalPages, setTotalPages] = useState(1)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ถ้ามีแท็บ Videos/Images และอยากกรองที่ฝั่ง server:
  // '1' = video, '2' = image (ตามโค้ดเดิมของคุณ)
  const [value, setValue] = useState<'1' | '2'>('1')

  // Toast
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({
    open: false,
    msg: '',
    sev: 'success'
  })

  const Menu = styled(MuiMenu)<MenuProps>({
    '& .MuiMenu-paper': {
      border: '1px solid var(--mui-palette-divider)'
    }
  })

  // Styled MenuItem component
  const MenuItem = styled(MuiMenuItem)<MenuItemProps>({
    '&:focus': {
      backgroundColor: 'var(--mui-palette-primary-main)',
      '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
        color: 'var(--mui-palette-common-white)'
      }
    }
  })

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue)
    setSelected([])
  }

  // const handleSelect = (id: number, event?: React.MouseEvent) => {
  //   event?.stopPropagation()
  //   setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  // }

  const dropdownPaperSx = {
    borderRadius: 2,
    boxShadow: 5,
    mt: 1,
    minWidth: 160,
    '& .MuiMenuItem-root': {
      fontSize: 14,
      '&:hover': { bgcolor: 'action.hover' }
    },
    '& .MuiMenuItem-root.Mui-selected, & .MuiMenuItem-root.Mui-selected:hover': {
      bgcolor: 'primary.main',
      color: 'common.white',
      '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
        color: 'common.white'
      }
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

  // const handleSelectAll = () => {
  //   const pageIds = pagedMedia.map(item => item.id)
  //   const allSelectedOnPage = pageIds.every(id => selected.includes(id))

  //   if (allSelectedOnPage) {
  //     // เอา id ของ "หน้านี้" ออก
  //     setSelected(prev => prev.filter(id => !pageIds.includes(id)))
  //   } else {
  //     // รวมของเดิม + id ของ "หน้านี้"
  //     setSelected(prev => Array.from(new Set([...prev, ...pageIds])))
  //   }
  // }

  // const handleSelectAll = () => {
  //   if (selected.length === filteredMedia.length) {
  //     setSelected([])
  //   } else {
  //     setSelected(filteredMedia.map(item => item.id))
  //   }
  // }

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
    const fetchTypedPage = async () => {
      try {
        setLoading(true)
        setError(null)

        // '1' = video, '2' = image
        const currentType: 'video' | 'image' = value === '1' ? 'video' : 'image'
        const apiPage = Math.max(0, page - 1) // UI 1-based -> API 0-based
        const token = Cookies.get('accessToken')

        const res = await fetch(`/api/auth/media?page=${apiPage}&size=${rowsPerPage}&type=${currentType}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          cache: 'no-store'
        })

        const text = await res.text()

        if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
        const json = text ? JSON.parse(text) : {}
        const payload = json?.data ?? {}

        // ใช้รายการจาก server ตามหน้าแล้ว (ไม่ slice ซ้ำ, ไม่วนหลายหน้า)
        const raw = Array.isArray(payload.media) ? payload.media : []

        setMedia(raw.map(normalizeMedia))

        // คำนวณจำนวนหน้าจาก meta ของ server
        const total = Number(payload.total_elements ?? 0)
        const pagesFromTotal = Math.max(1, Math.ceil(total / rowsPerPage))
        const pagesFromServer = Number(payload.total_pages ?? pagesFromTotal)

        setTotalPages(pagesFromServer || pagesFromTotal)
      } catch (err: any) {
        setError(err?.message || 'Network error')
        setMedia([])
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    fetchTypedPage()
  }, [page, rowsPerPage, value])

  // const displayMedia = useMemo(() => media.filter(item => item.status === 1), [media])

  // ✅ กำหนดชนิดจากแท็บ: '1' = video, '2' = image
  const currentType: 'video' | 'image' = value === '1' ? 'video' : 'image'

  // ✅ แสดงเฉพาะชนิดที่เลือก + active (status === 1)
  const displayMedia = useMemo(
    () => media.filter(item => item.status === 1 && item.type === currentType),
    [media, currentType]
  )

  // รีเซ็ตเป็นหน้า 1 เมื่อเปลี่ยนแท็บหรือตัวเลือก per-page เท่านั้น (ไม่ผูกกับ media มิฉะนั้นจะเด้งหน้า 1 ตลอด)
  useEffect(() => {
    setPage(1)
  }, [value, rowsPerPage])

  // หนีบหน้าไม่ให้เกินจำนวนหน้ารวมใหม่
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages]) // ผูกกับ totalPages ก็พอ

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
    try {
      setDeleting(true)

      // เรียก API route ฝั่ง Next ของคุณ (อ่าน token จาก cookie ให้อัตโนมัติแล้ว)
      const res = await fetch(`/api/auth/media/${id}`, { method: 'DELETE' })
      const text = await res.text()

      let data: any = null

      try {
        data = text ? JSON.parse(text) : null
      } catch {}

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Delete failed (${res.status})`)
      }

      // เอา item ออกจาก list บนจอ
      setMedia(prev => prev.filter(m => m.id !== id))

      // Toast สำเร็จ
      setToast({ open: true, msg: data?.message || 'Media deleted successfully', sev: 'success' })
    } catch (err: any) {
      // Toast/แจ้ง error
      setToast({ open: true, msg: err?.message || 'Delete failed', sev: 'error' })
    } finally {
      setDeleting(false)
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: number) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setMenuItemId(id)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setMenuItemId(null)
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
                      {/* <Chip
                        label={media.filter(item => item.type === 'video' && item.status === 1).length}
                        size='small'
                        color='primary'
                        variant='outlined'
                      /> */}
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
                      {/* <Chip
                        label={media.filter(item => item.type === 'image' && item.status === 1).length}
                        size='small'
                        color='secondary'
                        variant='outlined'
                      /> */}
                    </Box>
                  }
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
              </TabList>
            </Box>
          </TabContext>
        </Card>

        {/* Actions Bar */}
        {displayMedia.length > 0 && (
          <Card sx={{ mb: 6, mt: -2 }}>
            <CardContent sx={{ py: 5 }}>
              <Stack
                display={'flex'}
                justifyContent={'space-between'}
                flexDirection={{ xs: 'column', md: 'row' }}
                alignItems={'center'}
                spacing={2}
                gap={2}
              >
                <Box display={'flex'} gap={2}>
                  {/* <Button
                    variant={selected.length > 0 ? 'contained' : 'outlined'}
                    startIcon={<SelectAllIcon />}
                    onClick={handleSelectAll}
                    size='small'
                  >
                    {selected.length === filteredMedia.length ? 'Deselect All' : 'Select All'}
                  </Button> */}

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

                  <Box>
                    <Chip
                      label={
                        selected.length > 0
                          ? `${selected.length} of ${displayMedia.length} selected`
                          : `${displayMedia.length} items total`
                      }
                      variant='outlined'
                      color={selected.length > 0 ? 'primary' : 'default'}
                    />
                  </Box>
                </Box>
                <TextField
                  select
                  sx={{ width: 120 }}
                  size='small'
                  label='Items per page'
                  value={rowsPerPage}
                  onChange={e => {
                    setRowsPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: { sx: { ...dropdownPaperSx } }
                    }
                  }}
                >
                  <MenuItem value={8}>8</MenuItem>
                  <MenuItem value={12}>12</MenuItem>
                  <MenuItem value={24}>24</MenuItem>
                  <MenuItem value={48}>48</MenuItem>
                </TextField>
              </Stack>
            </CardContent>

            {/* Grid */}
            <CardContent>
              {displayMedia.length === 0 ? (
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
                  {displayMedia.map(item => (
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
                        {/* <Tooltip title='Select'>
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
                        </Tooltip> */}

                        {/* Edit (desktop) */}
                        {!isMobile ? (
                          <>
                            <Tooltip title='More'>
                              <IconButton
                                aria-label='more'
                                aria-controls='long-menu'
                                aria-haspopup='true'
                                onClick={e => handleMenuOpen(e, item.id)}
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
                                <i className='bx-dots-vertical-rounded' />
                              </IconButton>
                            </Tooltip>
                            <Menu
                              keepMounted
                              elevation={0}
                              anchorEl={menuAnchor}
                              id='customized-menu'
                              onClose={handleMenuClose}
                              open={Boolean(menuAnchor) && menuItemId === item.id}
                              anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'center'
                              }}
                              transformOrigin={{
                                vertical: 'top',
                                horizontal: 'center'
                              }}
                            >
                              <MenuItem
                                onClick={() => {
                                  handleEditClick(item)
                                  handleMenuClose()
                                }}
                              >
                                <ListItemIcon>
                                  <i className='bx-edit text-xl' />
                                </ListItemIcon>
                                <ListItemText primary='Edit' />
                              </MenuItem>
                              <MenuItem
                                disabled={deleting}
                                onClick={async e => {
                                  e.stopPropagation()
                                  await handleDeleteSingle(item.id) // ← ยิง API
                                  handleMenuClose() // ← ปิดเมนู
                                }}
                              >
                                <ListItemIcon>
                                  <i className='bx-trash text-xl' />
                                </ListItemIcon>
                                <ListItemText primary={deleting ? 'Deleting...' : 'Delete'} />
                              </MenuItem>
                            </Menu>
                          </>
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
                  {totalPages > 1 && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                        <Pagination
                          shape='rounded'
                          color='primary'
                          variant='tonal'
                          count={totalPages}
                          page={page}
                          onChange={(_, p) => setPage(p)}
                          showFirstButton
                          showLastButton
                        />
                      </Box>
                    </Grid>
                  )}
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
                  <CustomTextField
                    fullWidth
                    autoComplete='off'
                    label='Description'
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    variant='standard'
                    multiline
                    minRows={3}
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
