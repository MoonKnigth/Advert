// src/views/pages/wizard-examples/property-listing/StepPersonalDetails.tsx
'use client'

import { useState, useEffect, memo, useMemo, useCallback } from 'react'

import dynamic from 'next/dynamic'

import { styled } from '@mui/material/styles'

import MuiMenu from '@mui/material/Menu'
import MuiMenuItem from '@mui/material/MenuItem'
import type { MenuProps } from '@mui/material/Menu'
import type { MenuItemProps } from '@mui/material/MenuItem'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid2'
import Button from '@mui/material/Button'
import {
  Box,
  Card,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  CardContent,
  CardMedia,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material'
import Cookies from 'js-cookie'

import CustomAvatar from '@/@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import DirectionalIcon from '@components/DirectionalIcon'

// -------- Lazy styles for the datepicker (Next.js ssr: false)
const AppReactDatepicker = dynamic(() => import('@/libs/styles/AppReactDatepicker'), { ssr: false })

// ======================================================
// =============== Types & Shared Helpers ===============
// ======================================================

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
  mediaList: any[] // จาก API /api/media
  scheduleList: any[]
  selectedDeviceIds: string[]
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>
}

type AdsItem = {
  id: number
  title: string
  type: 'image' | 'video' | string
  duration: string | number
  start_time?: string | null
  ad_run_at?: string | null
  ad_run_at_to?: string | null
}

type ScheduleDetail = {
  id: number
  scheduleNumber: string
  name: string
  playOrientation: 'HORIZONTAL' | 'VERTICAL' | string
  runAt?: string
  runAtTo?: string
  adsItems: AdsItem[]
}

export type ScheduleLite = {
  schedule_id: number | string
  schedule_name: string
  schedule_number: string
  run_at?: string
  run_at_to?: string
}

type MediaItem = {
  id: number
  title: string
  description?: string
  type: 'image' | 'video'
  fileUrl: string
  videoType?: string | null
  thumbnailUrl?: string | null
  width?: number | null
  height?: number | null
  duration?: number | null
  fileSize?: number | null
}

const RAW_BASE = process.env.NEXT_PUBLIC_SIGNBOARD_BASE_URL ?? 'https://cloud.softacular.net'
const BASE_URL = RAW_BASE.replace('http://', 'https://')
const toAbs = (u?: string | null) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u}`)
const normalizeTitle = (t?: string) => (t || '').trim().toLowerCase()

const normalizeMedia = (m: any): MediaItem => {
  const typeRaw = (m?.type ?? m?.fileType ?? '').toString().toLowerCase()
  const type: 'image' | 'video' = typeRaw === 'video' ? 'video' : 'image'

  return {
    id: Number(m?.id ?? m?.media_id ?? m?.mediaId ?? 0),
    title: m?.title ?? m?.name ?? '',
    description: m?.description ?? undefined,
    type,
    fileUrl: m?.fileUrl ?? m?.file_url ?? m?.url ?? '',
    videoType: m?.videoType ?? m?.mime ?? null,
    thumbnailUrl: m?.thumbnailUrl ?? m?.thumbnail_url ?? m?.thumb_url ?? undefined,
    width: m?.width ?? null,
    height: m?.height ?? null,
    duration: m?.duration != null ? Number(m.duration) : null,
    fileSize: m?.fileSize ?? null
  }
}

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
    if (c && typeof c === 'object' && Array.isArray(c.data)) return c.data
  }

  // deep scan fallback
  const seen = new Set<any>()
  const stack: any[] = [payload]

  while (stack.length) {
    const cur = stack.pop()

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

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'ไม่ระบุ'
  const d = new Date(dateString)

  if (Number.isNaN(d.getTime())) return 'ไม่ระบุ'

  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return 'ไม่ทราบชื่อ'

  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

// ======================================================
// =============== Inline UI Components =================
// ======================================================

type ScheduleRowProps = {
  data: ScheduleLite
  variant?: 'today' | 'coming'
  onOpen: (id: number | string) => void
  onDelete: (id: number | string) => void
}

const ScheduleRow = memo(function ScheduleRow({ data, variant = 'coming', onOpen, onDelete }: ScheduleRowProps) {
  const isToday = variant === 'today'

  return (
    <Box
      onClick={() => onOpen(data.schedule_id)}
      className='rounded p-4 flex items-center justify-between w-full'
      sx={{
        cursor: 'pointer',
        mb: 3,
        backgroundColor: isToday ? '#fff' : 'rgba(255, 62, 29, 0.08)',
        border: isToday ? 'none' : '1px solid',
        borderColor: isToday ? 'transparent' : 'primary.dark',
        '&:hover': { backgroundColor: isToday ? '#f9fafb' : 'rgba(255, 62, 29, 0.12)' }
      }}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(data.schedule_id)
      }}
    >
      <div>
        <Typography variant='h6'>{data.schedule_name}</Typography>
        <Typography>รหัส: {data.schedule_number}</Typography>
        <Typography>
          {formatDate(data.run_at)} ถึง {formatDate(data.run_at_to)}
        </Typography>
      </div>

      <i
        className='bx bx-trash text-primary cursor-pointer'
        onClick={e => {
          e.stopPropagation()
          onDelete(data.schedule_id)
        }}
      />
    </Box>
  )
})

type DeviceGridProps = {
  deviceInfo: any[]
  selectedDeviceIds: string[]
  onToggleDevice: (deviceId: string) => void
  onOpenDevice: (device: any) => void
}

const DeviceGrid = memo(function DeviceGrid({
  deviceInfo,
  selectedDeviceIds,
  onToggleDevice,
  onOpenDevice
}: DeviceGridProps) {
  if (!Array.isArray(deviceInfo)) return <p>กำลังโหลดข้อมูล...</p>
  if (deviceInfo.length === 0) return <p>ยังไม่มีอุปกรณ์</p>

  return (
    <Grid container spacing={2}>
      {deviceInfo.map((device, index) => {
        const hasSchedule =
          !!device.__hasSchedule ||
          !!device.schedules_today ||
          (Array.isArray(device.schedules_coming) && device.schedules_coming.length > 0)

        return (
          <Grid size={{ xs: 3 }} key={device.device_id || index}>
            <Box
              onClick={() => onOpenDevice(device)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: 2,
                mx: 5,
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#fef2f2' }
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
                      onChange={() => onToggleDevice(device.device_id)}
                    />
                  }
                />
              </div>

              <img
                src={hasSchedule ? '/images/tv/Vector_red.svg' : '/images/tv/Vector.svg'}
                height='100'
                width='100'
                alt=''
              />

              <p>{device.device_id}</p>
              <p>{device.name || 'ไม่ทราบชื่อ'}</p>
              <p>{truncateText(device.description, 15)}</p>
            </Box>
          </Grid>
        )
      })}
    </Grid>
  )
})

type DeviceDialogProps = {
  open: boolean
  onClose: () => void
  selectedDevice: any | null
  selectedDescription: string | null
  onOpenSchedule: (id: number | string) => void
  onDeleteSchedule: (id: number, type: 'today' | 'coming') => void
  onDeviceUpdated?: (patch: { name: string; description: string; platform: string; revoked?: boolean }) => void
}

const DeviceDialog = memo(function DeviceDialog({
  open,
  onClose,
  selectedDevice,
  selectedDescription,
  onOpenSchedule,
  onDeleteSchedule,
  onDeviceUpdated
}: DeviceDialogProps) {
  const [openEditDevice, setOpenEditDevice] = useState(false)

  const [editName, setEditName] = useState(selectedDevice?.name || '')
  const [editPlatform, setEditPlatform] = useState(selectedDevice?.platform || '')
  const [editDescription, setEditDescription] = useState(selectedDevice?.description || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isRevoked = !!selectedDevice?.revoked
  const [revoking, setRevoking] = useState(false)

  const deviceId = selectedDevice?.device_id

  useEffect(() => {
    if (openEditDevice && selectedDevice) {
      setEditName(selectedDevice?.name || '')
      setEditPlatform(selectedDevice?.platform || '')
      setEditDescription(selectedDevice?.description || '')
      setSaveError('')
    }
  }, [openEditDevice, selectedDevice])

  const isUnchanged =
    !!selectedDevice &&
    editName === (selectedDevice?.name || '') &&
    editPlatform === (selectedDevice?.platform || '') &&
    editDescription === (selectedDevice?.description || '')

  const canSave = !!deviceId && !!editName.trim() && !isUnchanged && !saving

  const handleRevokeDevice = async () => {
    const id = selectedDevice?.device_id

    if (!id) return

    if (!confirm(`ยืนยันออกจากระบบอุปกรณ์\nID: ${id}`)) return

    try {
      setRevoking(true)

      const res = await fetch('/api/auth/device/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoke_device_id: id })
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Revoke failed (${res.status})`)
      }

      // ✅ แจ้งพาเรนต์ให้อัปเดต state ทันที
      onDeviceUpdated?.({
        revoked: true,
        name: selectedDevice?.name,
        description: selectedDevice?.description,
        platform: selectedDevice?.platform
      })

      alert('ออกจากระบบอุปกรณ์สำเร็จ')
    } catch (e: any) {
      alert(e?.message || 'ไม่สามารถออกจากระบบอุปกรณ์ได้')
    } finally {
      setRevoking(false)
      handleClose() // ปิดเมนูสามจุด
    }
  }

  const handleSave = async () => {
    if (!deviceId) return
    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch(`/api/auth/device/${encodeURIComponent(deviceId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          platform: editPlatform.trim()
        })
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `อัปเดตไม่สำเร็จ (${res.status})`)
      }

      // แจ้งพ่อให้อัปเดต UI ต่อ (ถ้าส่ง callback มา)
      onDeviceUpdated?.({
        name: editName.trim(),
        description: editDescription.trim(),
        platform: editPlatform.trim()
      })

      setOpenEditDevice(false)
    } catch (e: any) {
      setSaveError(e?.message || 'เกิดข้อผิดพลาดระหว่างอัปเดตอุปกรณ์')
    } finally {
      setSaving(false)
    }
  }

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex justify-between items-center'>
          <CardContent className='flex flex-col gap-4 p-0'>
            <div className='flex items-center gap-3'>
              <CustomAvatar variant='rounded' skin='light' color='primary' size={70}>
                <i className='bx-tv' />
              </CustomAvatar>
              <div className='flex justify-between items-center'>
                <div className='flex flex-col items-start'>
                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant='h5'>{selectedDevice?.name || 'ไม่ทราบชื่อ'}</Typography>
                    <Chip
                      size='small'
                      label={isRevoked ? 'ออกจากระบบ' : 'เข้าสู่ระบบ'}
                      color={isRevoked ? 'error' : 'success'}
                      variant='filled'
                    />
                  </Box>
                  <Typography variant='body2'>ID: {selectedDevice?.device_id}</Typography>
                  <Typography variant='body2'>Description: {selectedDescription || 'ไม่มีข้อมูลอุปกรณ์'}</Typography>
                </div>
              </div>
            </div>
          </CardContent>
          <Box>
            <Chip label='กำหนดการวันนี้และที่กำลังจะมาถึง' color='secondary' variant='filled' />
            <IconButton aria-label='more' aria-controls='long-menu' aria-haspopup='true' onClick={handleClick}>
              <i className='bx-dots-vertical-rounded' />
            </IconButton>
            <Menu
              keepMounted
              elevation={0}
              anchorEl={anchorEl}
              id='customized-menu'
              onClose={handleClose}
              open={Boolean(anchorEl)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center'
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center'
              }}
            >
              <MenuItem onClick={() => setOpenEditDevice(true)}>
                <ListItemIcon>
                  <i className='bx bx-edit' />
                </ListItemIcon>
                <ListItemText primary='แก้ไขข้อมูลอุปกรณ์' />
              </MenuItem>
              <MenuItem
                disabled={revoking || selectedDevice?.revoked === true}
                onClick={async () => {
                  await handleRevokeDevice()
                }}
              >
                <ListItemIcon>
                  <i className='bx bx-exit' />
                </ListItemIcon>
                <ListItemText primary={revoking ? 'กำลังออกจากระบบ…' : 'ออกจากระบบอุปกรณ์'} />
              </MenuItem>

              <MenuItem>
                <ListItemIcon>
                  <i className='bx bx-trash' />
                </ListItemIcon>
                <ListItemText primary='ลบข้อมูลอุปกรณ์' />
              </MenuItem>
            </Menu>
          </Box>

          {/* Dialog แก้ไขข้อมูลอุปกรณ์ */}
          <Dialog open={openEditDevice} onClose={() => setOpenEditDevice(false)} maxWidth='sm' fullWidth>
            <DialogTitle>แก้ไขข้อมูลอุปกรณ์</DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                <CustomTextField
                  fullWidth
                  label='ชื่ออุปกรณ์'
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
                <CustomTextField
                  fullWidth
                  label='แพลตฟอร์ม (เช่น android)'
                  value={editPlatform}
                  onChange={e => setEditPlatform(e.target.value)}
                />
                <CustomTextField
                  fullWidth
                  label='คำอธิบายอุปกรณ์'
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  multiline
                  rows={3}
                />

                {saveError && (
                  <Alert severity='error' variant='filled'>
                    {saveError}
                  </Alert>
                )}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 5, mt: 3 }}>
                <Button onClick={() => setOpenEditDevice(false)} disabled={saving}>
                  ยกเลิก
                </Button>
                <Button variant='contained' onClick={handleSave} disabled={!canSave}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </Box>
            </DialogContent>
            {/* <DialogActions></DialogActions> */}
          </Dialog>
        </div>
      </CardContent>

      <DialogContent sx={{ m: 0, p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent className='flex flex-col gap-y-4'>
            <div className='plb-3 pli-4 flex flex-col gap-x-4 bg-actionHover rounded'>
              <div className='flex justify-start my-3'>
                <i className='bx-time-five' />
                <Typography variant='h5' sx={{ ml: 2 }}>
                  กำหนดการวันนี้ ({selectedDevice?.schedules_today ? 1 : 0} รายการ)
                </Typography>
              </div>

              {selectedDevice?.schedules_today ? (
                <ScheduleRow
                  variant='today'
                  data={{
                    schedule_id: selectedDevice.schedules_today.schedule_id,
                    schedule_name: selectedDevice.schedules_today.schedule_name,
                    schedule_number: selectedDevice.schedules_today.schedule_number,
                    run_at: selectedDevice.schedules_today.run_at,
                    run_at_to: selectedDevice.schedules_today.run_at_to
                  }}
                  onOpen={onOpenSchedule}
                  onDelete={id => onDeleteSchedule(Number(id), 'today')}
                />
              ) : (
                <div className='mb-3 bg-white rounded p-4 flex items-center justify-center w-full'>
                  <Typography color='text.disabled'>ไม่มีกำหนดการวันนี้</Typography>
                </div>
              )}
            </div>
          </CardContent>

          {/* กำหนดการที่จะมาถึง */}
          <CardContent className='flex flex-col' sx={{ color: 'info.light' }}>
            <Box className='plb-3 pli-4 flex flex-col rounded' sx={{ backgroundColor: 'rgba(255, 62, 29, 0.08)' }}>
              <div className='flex justify-start my-3'>
                <EventAvailableIcon color='primary' sx={{ mr: 1 }} />
                <Typography variant='h5' sx={{ ml: 2 }}>
                  กำหนดการที่กำลังจะมาถึง ({selectedDevice?.schedules_coming?.length || 0} รายการ)
                </Typography>
              </div>

              {selectedDevice?.schedules_coming && selectedDevice.schedules_coming.length > 0 ? (
                selectedDevice.schedules_coming.map((s: any) => (
                  <ScheduleRow
                    key={s.schedule_id}
                    variant='coming'
                    data={{
                      schedule_id: s.schedule_id,
                      schedule_name: s.schedule_name,
                      schedule_number: s.schedule_number,
                      run_at: s.run_at,
                      run_at_to: s.run_at_to
                    }}
                    onOpen={onOpenSchedule}
                    onDelete={id => onDeleteSchedule(Number(id), 'coming')}
                  />
                ))
              ) : (
                <Box
                  className='mb-3 rounded p-4 flex items-center justify-center w-full'
                  sx={{
                    backgroundColor: 'rgba(255, 62, 29, 0.08)',
                    borderColor: 'primary.dark',
                    borderWidth: 1,
                    borderStyle: 'solid'
                  }}
                >
                  <Typography>ไม่มีกำหนดการที่กำลังจะมาถึง</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Box>
      </DialogContent>
    </Dialog>
  )
})

type ScheduleDetailDialogProps = {
  open: boolean
  onClose: () => void
  scheduleDetail: ScheduleDetail | null
  onOpenAsset: (item: AdsItem) => void
}

const ScheduleDetailDialog = memo(function ScheduleDetailDialog({
  open,
  onClose,
  scheduleDetail,
  onOpenAsset
}: ScheduleDetailDialogProps) {
  return (
    <Dialog sx={{ p: 0, m: 0 }} open={open} onClose={onClose} maxWidth='md' fullWidth>
      <Box mt={3} mx={3} mb={0} display='flex' justifyContent='space-between' alignItems={'center'}>
        <Button
          sx={{ borderRadius: '100%', width: 60, height: 60, m: 0, p: 0 }}
          onClick={onClose}
          aria-label='ปิดรายละเอียดกำหนดการ'
        >
          <ArrowBackIcon />
        </Button>
        <DialogTitle>รายละเอียดกำหนดการ</DialogTitle>
      </Box>

      <DialogContent sx={{ px: 0, minHeight: { xs: '60vh', md: 555 } }}>
        {scheduleDetail ? (
          <CardContent className='flex flex-col gap-4 pt-1'>
            <CardContent className='flex flex-col gap-4 p-0'>
              <div className='flex items-center gap-3 w-full'>
                <CustomAvatar variant='rounded' skin='light' color='primary' size={60}>
                  <i className='bx-time' style={{ fontSize: '36px' }} />
                </CustomAvatar>
                <div className='flex justify-between items-center '>
                  <div className='flex flex-col items-start w-full'>
                    <Typography variant='h3'>{scheduleDetail.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant='body2'>ID: {scheduleDetail.id} |</Typography>
                      <Typography variant='body2'>Schedule No : {scheduleDetail.scheduleNumber} |</Typography>
                      <Typography variant='body2'>
                        {formatDate(scheduleDetail.runAt || '')} ถึง {formatDate(scheduleDetail.runAtTo || '')} |
                      </Typography>
                      <Typography variant='body2'>Orientation: {scheduleDetail.playOrientation || '-'}</Typography>
                    </Box>
                  </div>
                </div>
              </div>

              {/* Ads ของ schedule */}
              <Box sx={{ p: 5, backgroundColor: 'rgb(133 146 163 / 0.1)', borderRadius: 2 }}>
                <Typography variant='h6' sx={{ mb: 2 }}>
                  รายการโฆษณา ({scheduleDetail.adsItems?.length || 0} รายการ)
                </Typography>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                  {scheduleDetail.adsItems?.map(item => (
                    <Card
                      className='w-full'
                      key={item.id}
                      onClick={() => onOpenAsset(item)}
                      sx={{
                        borderRadius: 3,
                        boxShadow: 1,
                        cursor: 'pointer',
                        borderLeftWidth: '3px',
                        borderLeftStyle: 'solid',
                        borderLeftColor:
                          item.type === 'video' ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-success-main)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          transition: 'all 0.3s ease-in-out',
                          borderLeftWidth: '3px',
                          boxShadow: 'var(--mui-customShadows-xl)',
                          marginBlockEnd: '-1px'
                        }
                      }}
                    >
                      <CardContent className='flex items-center gap-3'>
                        <CustomAvatar
                          skin='light'
                          color={item.type === 'video' ? 'primary' : 'success'}
                          variant='rounded'
                          size={50}
                        >
                          <i
                            className={item.type === 'video' ? 'bx bx-video' : 'bx bx-image'}
                            style={{ fontSize: '24px' }}
                          />
                        </CustomAvatar>

                        <div className='flex flex-col flex-1'>
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 600, lineHeight: 1.2 }}
                            title={item.title || '(ไม่มีชื่อ)'}
                          >
                            {(() => {
                              const t = item.title || '(ไม่มีชื่อ)'
                              const a = Array.from(t)

                              return a.length > 50 ? a.slice(0, 50).join('') + '…' : t
                            })()}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={item.type}
                              size='small'
                              color={item.type === 'video' ? 'primary' : 'success'}
                            />
                            <Typography variant='caption' color='text.secondary'>
                              {String(item.duration)}s
                            </Typography>
                          </Box>

                          {(item.ad_run_at || item.ad_run_at_to) && (
                            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
                              {formatDate(item.ad_run_at || '')} ถึง {formatDate(item.ad_run_at_to || '')}
                            </Typography>
                          )}
                        </div>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <i className='bx bx-chevron-right' style={{ fontSize: '20px', color: '#666' }} />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Box>
            </CardContent>
          </CardContent>
        ) : (
          <Typography>กำลังโหลด...</Typography>
        )}
      </DialogContent>
    </Dialog>
  )
})

type AssetPreviewDialogProps = {
  open: boolean
  onClose: () => void
  loading: boolean
  error: string | null
  title: string
  src: string | null
  type: 'image' | 'video' | null
}

const AssetPreviewDialog = memo(function AssetPreviewDialog({
  open,
  onClose,
  loading,
  error,
  title,
  src,
  type
}: AssetPreviewDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <Box
        sx={{
          mt: 3,
          mx: 3,
          mb: 0,
          display: 'grid',
          gridTemplateColumns: '48px 1fr 48px',
          alignItems: 'center'
        }}
      >
        <Button
          sx={{ borderRadius: '100%', width: 60, height: 60, m: 0, p: 0, justifySelf: 'start' }}
          onClick={onClose}
          aria-label='ปิดตัวอย่างสื่อ'
        >
          <ArrowBackIcon />
        </Button>
        <DialogTitle sx={{ m: 0, textAlign: 'center', justifySelf: 'center' }}>{title || 'ตัวอย่างสื่อ'}</DialogTitle>
        <Box sx={{ width: 48, height: 48 }} />
      </Box>

      <DialogContent sx={{ mt: 1, minHeight: { xs: '60vh', md: 550 } }}>
        {loading && <Typography>กำลังโหลด...</Typography>}
        {error && <Alert severity='error'>{error}</Alert>}

        {!loading && !error && src && type === 'image' && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <CardMedia
              component='img'
              image={src}
              alt={title || 'image'}
              sx={{ maxHeight: 500, objectFit: 'contain', borderRadius: 2 }}
            />
          </Box>
        )}

        {!loading && !error && src && type === 'video' && (
          <video controls width='100%' style={{ maxHeight: 480 }} autoPlay>
            <source src={src} type='video/mp4' />
            Your browser does not support the video tag.
          </video>
        )}
      </DialogContent>
    </Dialog>
  )
})

// ======================================================
// ==================== Main Component ==================
// ======================================================

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
  selectedDeviceIds,
  setSelectedDeviceIds
}: Props) => {
  const [error] = useState('')
  const [mounted, setMounted] = useState(false)

  // device usage (quota)
  const [deviceUsed, setDeviceUsed] = useState<number>(0)
  const [maxDeviceUsed, setMaxDeviceUsed] = useState<number>(0)
  const [, setIsLoading] = useState<boolean>(true)

  // device dialogs
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null)
  const [selectedDescription, setSelectedDescription] = useState<string | null>(null)
  const [hasScheduleCache, setHasScheduleCache] = useState<Record<string, boolean>>({})

  useState

  // ✅ เก็บ patch แบบ optimistic ต่ออุปกรณ์ (key = device_id)
  const [devicePatches, setDevicePatches] = useState<
    Record<string, { name?: string; description?: string; platform?: string }>
  >({})

  useEffect(() => {
    if (!Array.isArray(deviceInfo)) return

    setHasScheduleCache(prev => {
      const next = { ...prev }

      for (const d of deviceInfo) {
        const hasScheduleFields = 'schedules_today' in d || 'schedules_coming' in d

        if (hasScheduleFields) {
          const has =
            Boolean(d?.schedules_today) || (Array.isArray(d?.schedules_coming) && d.schedules_coming.length > 0)

          next[d.device_id] = has
        } else if (next[d.device_id] === undefined) {
          // ถ้ายังไม่เคยรู้สถานะมาก่อน ให้ตั้งต้นเป็น false
          next[d.device_id] = false
        }
      }

      return next
    })
  }, [deviceInfo])

  // ✅ รวม deviceInfo จาก props + overlay patch เพื่อให้ Grid เห็นค่าล่าสุดทันที
  const deviceInfoView = useMemo(() => {
    if (!deviceInfo?.length) return deviceInfo

    return deviceInfo.map(d => {
      const p = devicePatches[d.device_id]
      const hasFromCache = hasScheduleCache[d.device_id]

      const hasFromFields =
        Boolean(d?.schedules_today) || (Array.isArray(d?.schedules_coming) && d.schedules_coming.length > 0)

      return {
        ...d,
        name: p?.name ?? d.name,
        description: p?.description ?? d.description,
        platform: p?.platform ?? d.platform,
        __hasSchedule: hasFromCache ?? hasFromFields // ใช้แคชก่อน ถ้าไม่มีค่อย fallback ฟิลด์
      }
    })
  }, [deviceInfo, devicePatches, hasScheduleCache])

  useEffect(() => {
    if (!deviceInfo?.length) return

    // เคลียร์เฉพาะ patch ที่ device ไม่มีอยู่แล้วใน deviceInfo
    setDevicePatches(prev => {
      const deviceIds = new Set(deviceInfo.map(d => d.device_id))
      const newPatches: typeof prev = {}

      // เก็บเฉพาะ patch ของ device ที่ยังอยู่
      Object.entries(prev).forEach(([deviceId, patch]) => {
        if (deviceIds.has(deviceId)) {
          // ✅ เช็คว่าข้อมูลใน deviceInfo อัปเดตแล้วหรือยัง
          const device = deviceInfo.find(d => d.device_id === deviceId)

          if (device) {
            const needsPatch =
              (patch.name && device.name !== patch.name) ||
              (patch.description && device.description !== patch.description) ||
              (patch.platform && device.platform !== patch.platform)

            // เก็บ patch ไว้ถ้ายังไม่ sync กับ server
            if (needsPatch) {
              newPatches[deviceId] = patch
            }
          }
        }
      })

      return newPatches
    })
  }, [deviceInfo])

  const handleDeviceUpdated = useCallback(
    (patch: Partial<{ name: string; description: string; platform: string; revoked: boolean }>) => {
      const id = selectedDevice?.device_id

      if (!id) return

      // 1) อัปเดต dialog ที่เปิดอยู่ทันที
      setSelectedDevice((prev: any) => (prev ? { ...prev, ...patch } : prev))

      // 2) อัปเดต Grid ทันที (เก็บเฉพาะฟิลด์ที่อยู่ใน devicePatches)
      setDevicePatches(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.platform !== undefined ? { platform: patch.platform } : {})

          // หมายเหตุ: revoked ไม่ได้เก็บใน devicePatches เดิม ถ้าอยากให้แสดงในการ์ดด้วย
          // อาจเพิ่ม type ของ devicePatches ให้รองรับ revoked แล้ว patch ตรงนี้ด้วย
        }
      }))

      // 3) ถ้าต้องการ sync backend → โหลดใหม่
      fetchDeviceInfo?.()
    },
    [selectedDevice, fetchDeviceInfo]
  )

  // schedule detail dialog
  const [scheduleDetail, setScheduleDetail] = useState<ScheduleDetail | null>(null)
  const [openDetailDialog, setOpenDetailDialog] = useState(false)

  // asset preview
  const [openAssetDialog, setOpenAssetDialog] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [assetTitle, setAssetTitle] = useState<string>('')
  const [assetType, setAssetType] = useState<'image' | 'video' | null>(null)
  const [assetSrc, setAssetSrc] = useState<string | null>(null)

  // mounted
  // ถ้า deviceInfo ยังว่าง ให้ลองดึงอีกรอบอัตโนมัติ
  useEffect(() => {
    if (!Array.isArray(deviceInfo) || deviceInfo.length === 0) {
      fetchDeviceInfo?.()
    }
  }, [deviceInfo, fetchDeviceInfo])

  useEffect(() => setMounted(true), [])

  // quota
  useEffect(() => {
    const fetchDeviceUsage = async () => {
      try {
        setIsLoading(true)
        const accessToken = Cookies.get('accessToken')

        if (!accessToken) {
          setDeviceUsed(0)
          setMaxDeviceUsed(0)

          return
        }

        const response = await fetch('/api/proxy/device-usage', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        })

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const result = await response.json()

        if (result.success && result.data) {
          setDeviceUsed(result.data.device_used || 0)
          setMaxDeviceUsed(result.data.max_devices || 0)
        } else {
          setDeviceUsed(0)
          setMaxDeviceUsed(0)
        }
      } catch {
        setDeviceUsed(0)
        setMaxDeviceUsed(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeviceUsage()
  }, [])

  // media index (normalized)
  const normalizedMedia: MediaItem[] = useMemo(() => {
    const raw = Array.isArray(mediaList) ? mediaList : []
    const norm = raw.map(normalizeMedia)

    return norm
  }, [mediaList])

  const mediaById = useMemo(() => {
    const map = new Map<number, MediaItem>()

    normalizedMedia.forEach(m => map.set(Number(m.id), m))

    return map
  }, [normalizedMedia])

  const mediaByTitleType = useMemo(() => {
    const map = new Map<string, MediaItem[]>()

    normalizedMedia.forEach(m => {
      const key = `${normalizeTitle(m.title)}|${m.type}`
      const arr = map.get(key) || []

      arr.push(m)
      map.set(key, arr)
    })

    return map
  }, [normalizedMedia])

  const resolveMediaForItem = useCallback(
    (item: AdsItem): { media?: MediaItem; matchedBy?: string } => {
      const anyItem = item as any

      // 1) mediaId/media_id
      const mid: number | string | undefined = anyItem.mediaId ?? anyItem.media_id

      if (mid != null) {
        const m = mediaById.get(Number(mid))

        if (m) return { media: m, matchedBy: 'mediaId/media_id' }
      }

      // 2) adsItem.id === media.id
      const idMatch = mediaById.get(Number(item.id))

      if (idMatch) return { media: idMatch, matchedBy: 'adsItem.id === media.id' }

      // 3) title+type(+duration)
      const key = `${normalizeTitle(item.title)}|${String(item.type).toLowerCase() === 'video' ? 'video' : 'image'}`
      const candidates = mediaByTitleType.get(key) || []

      if (candidates.length === 0) return { media: undefined, matchedBy: undefined }

      if (String(item.type).toLowerCase() === 'video' && item.duration != null) {
        const target = Number(item.duration)
        let best = candidates[0]
        let bestDiff = Math.abs((best.duration ?? target) - target)

        for (const c of candidates) {
          const diff = Math.abs((c.duration ?? target) - target)

          if (diff < bestDiff) {
            best = c
            bestDiff = diff
          }
        }

        return { media: best, matchedBy: 'title+type+duration' }
      }

      return { media: candidates[0], matchedBy: 'title+type' }
    },
    [mediaById, mediaByTitleType]
  )

  // ---------- actions ----------
  const handleToggleDevice = useCallback(
    (deviceId: string) => {
      setSelectedDeviceIds(prev => (prev.includes(deviceId) ? prev.filter(id => id !== deviceId) : [...prev, deviceId]))
    },
    [setSelectedDeviceIds]
  )

  const handleOpenDevice = useCallback(async (device: any) => {
    setSelectedDevice(device)
    setSelectedDescription(device.description || device.name || 'ไม่ทราบชื่อ')

    // (เราดึง ads ของวันนี้เมื่อเปิด schedule detail แทน — เพื่อลดภาระตอนเปิด dialog อุปกรณ์)
    setOpenDialog(true)
  }, [])

  const handleRemoveSchedule = useCallback((scheduleId: number, scheduleType: 'today' | 'coming') => {
    console.log(`🗑️ ลบ ${scheduleType} schedule ID: ${scheduleId}`)

    // TODO: เรียก API เพื่อลบ schedule
  }, [])

  const fetchScheduleDetail = useCallback(async (scheduleId: number | string) => {
    try {
      const accessToken = Cookies.get('accessToken')

      if (!accessToken) return

      const response = await fetch(`/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (response.ok) {
        const data = await response.json()

        setScheduleDetail(data.data)
        setOpenDetailDialog(true)
      }
    } catch (err) {
      console.error('❌ Error fetching schedule detail:', err)
    }
  }, [])

  const openAssetByAdsItem = useCallback(
    async (item: AdsItem) => {
      setOpenAssetDialog(true)
      setAssetLoading(true)
      setAssetError(null)
      setAssetTitle(item.title || 'ไม่มีชื่อ')
      setAssetSrc(null)
      setAssetType(null)

      try {
        // eslint-disable-next-line prefer-const
        let { media, matchedBy } = resolveMediaForItem(item)

        if (!media) {
          const accessToken = Cookies.get('accessToken')

          if (!accessToken) throw new Error('ไม่พบ Access Token')

          const res = await fetch('/api/auth/media', {
            method: 'GET',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
          })

          if (!res.ok) throw new Error(`API Error: ${res.status}`)
          const result = await res.json()
          const rawList = extractMediaArray(result)
          const list: MediaItem[] = rawList.map(normalizeMedia)

          // 1) id
          media = list.find(m => String(m.id) === String(item.id))

          if (!media) {
            // 2) mediaId/media_id
            const anyItem = item as any
            const mid: number | string | undefined = anyItem.mediaId ?? anyItem.media_id

            if (mid != null) media = list.find(m => String(m.id) === String(mid))
          }

          // 3) title+type(+duration)
          if (!media) {
            const itemTitle = normalizeTitle(item.title)
            const itemType = String(item.type).toLowerCase() === 'video' ? 'video' : 'image'
            const candidates = list.filter(m => normalizeTitle(m.title) === itemTitle && m.type === itemType)

            if (candidates.length > 0) {
              if (itemType === 'video' && item.duration != null) {
                const target = Number(item.duration)

                media = candidates.reduce((best, c) => {
                  const diff = Math.abs((c.duration ?? target) - target)
                  const bestDiff = Math.abs((best.duration ?? target) - target)

                  return diff < bestDiff ? c : best
                }, candidates[0])
              } else {
                media = candidates[0]
              }
            }
          }

          console.log('[openAssetByAdsItem] matched fallback:', matchedBy, media?.id)
        }

        if (!media) throw new Error('ไม่พบไฟล์สื่อที่ตรงกับรายการนี้')
        if (!media.fileUrl) throw new Error('ไฟล์ไม่มี URL')

        const fullFileUrl = toAbs(media.fileUrl)

        setAssetSrc(fullFileUrl)
        setAssetType(media.type as 'image' | 'video')
      } catch (err: any) {
        console.error('[openAssetByAdsItem] error:', err)
        setAssetError(err?.message || 'ไม่สามารถโหลดสื่อได้')
      } finally {
        setAssetLoading(false)
      }
    },
    [resolveMediaForItem]
  )

  if (!mounted) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading…</Typography>
        </CardContent>
      </Card>
    )
  }

  // -------------------- Render --------------------
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12, md: 12 }}>
        <div className='flex gap-4 flex-col'>
          <Typography variant='h4' component='h2' sx={{ color: 'text.primary', mb: 2 }}>
            อุปกรณ์ที่ใช้/สูงสุด {deviceUsed} / {maxDeviceUsed}
          </Typography>

          <CardContent>
            <DeviceGrid
              deviceInfo={deviceInfoView}
              selectedDeviceIds={selectedDeviceIds}
              onToggleDevice={handleToggleDevice}
              onOpenDevice={handleOpenDevice}
            />

            {/* Dialog 1: อุปกรณ์ */}
            <DeviceDialog
              open={openDialog}
              onClose={() => setOpenDialog(false)}
              selectedDevice={selectedDevice}
              selectedDescription={selectedDescription}
              onOpenSchedule={id => fetchScheduleDetail(id)}
              onDeleteSchedule={(id, type) => handleRemoveSchedule(id, type)}
              onDeviceUpdated={handleDeviceUpdated}
            />

            {/* Dialog 2: รายละเอียดกำหนดการ */}
            <ScheduleDetailDialog
              open={openDetailDialog}
              onClose={() => setOpenDetailDialog(false)}
              scheduleDetail={scheduleDetail}
              onOpenAsset={openAssetByAdsItem}
            />

            {/* Dialog 3: ตัวอย่างสื่อ */}
            <AssetPreviewDialog
              open={openAssetDialog}
              onClose={() => setOpenAssetDialog(false)}
              loading={assetLoading}
              error={assetError}
              title={assetTitle}
              src={assetSrc}
              type={assetType}
            />
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
                dateFormat='dd/MM/yyyy h:mm aa'
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
                dateFormat='dd/MM/yyyy h:mm aa'
                onChange={(date: Date | null) => setEndDateTime(date)}
                customInput={<CustomTextField label='วันที่สิ้นสุด' fullWidth color='error' />}
              />
            </Grid>
          </Grid>

          <Alert variant='outlined' severity='error'>
            &quot;กรุณาเลือกวิธีการเลือกอุปกรณ์&quot;,&quot;กรุณาระบุช่วงเวลาเริ่มต้นและสิ้นสุด&quot;,&quot;วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น&quot;
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
