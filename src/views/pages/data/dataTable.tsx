// src/views/pages/data/dataTable.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import dynamic from 'next/dynamic'

import ArrowBackIcon from '@mui/icons-material/ArrowBack'

const EditSchedules = dynamic(() => import('./editSchedules').then(m => m.EditSchedules), { ssr: false })

const EditSchedulesUpdate = dynamic(() => import('./editSchedulesUpdate').then(m => m.default), { ssr: false })

// MUI
import MuiCard from '@mui/material/Card'
import { styled } from '@mui/material/styles'
import type { CardProps } from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Typography,
  Snackbar
} from '@mui/material'
import Grid from '@mui/material/Grid2'

// Icons & custom
import { Icon } from '@iconify/react'

// TanStack
import classnames from 'classnames'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, ColumnFiltersState, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Styles
import Cookies from 'js-cookie'

// import type { EditSchedulesSubmitPayload } from '../../../libs/mediaTypes'

import styles from '@core/styles/table.module.css'
import ChevronRight from '@menu/svg/ChevronRight'
import CustomIconButton from '@/@core/components/mui/IconButton'
import CustomTextField from '@core/components/mui/TextField'
import CustomAvatar from '@/@core/components/mui/Avatar'

// ========== Types ==========
type ThemeColor = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'

type DirectionType = {
  img: string
  style: string // 'แนวนอน' | 'แนวตั้ง'
}

type AdsItem = {
  id: number
  title: string
  type: 'image' | 'video' | string
  duration: string | number
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

// === เพิ่ม constants สำหรับ icon/label ไว้บนสุด (ใกล้ ๆ DirectionType) ===
const HORIZONTAL_CONST: DirectionType = { img: '/images/tv/Vector_red.svg', style: 'แนวนอน' }

// NOTE: ชื่อไฟล์ portrait ผมใช้ Portrait_red.svg (ถ้าไฟล์คุณสะกดเป็นอย่างอื่น เปลี่ยนที่ path ได้เลย)
const VERTICAL_CONST: DirectionType = { img: '/images/tv/Portrait_red.svg', style: 'แนวตั้ง' }

// ชุด type ของตาราง (ตามที่ให้มา) + เพิ่ม schedule_id ไว้ใช้อ้างอิงภายใน (ยังไม่โชว์)
type DataTypeBase = {
  id: number
  name: string
  start_date: string
  end_date: string
  campaing_code: string
  direction: DirectionType
  status: string
  actions?: string
}

// แถวที่ใช้จริงในไฟล์นี้ (ขยายจาก DataTypeBase)
type RowType = DataTypeBase & {
  schedule_id: number
}

// Raw API (อิงตัวอย่าง payload ที่ส่งมา)

// ========== Styled Card ==========
type Props = CardProps & { color: ThemeColor }

const Card = styled(MuiCard)<Props>(({ color }) => ({
  transition: 'border 0.3s ease-in-out, box-shadow 0.3s ease-in-out, margin 0.3s ease-in-out',
  borderBottomWidth: '2px',
  borderBottomColor: `var(--mui-palette-${color}-darkerOpacity)`,
  '[data-skin="bordered"] &:hover': { boxShadow: 'none' },
  '&:hover': {
    borderBottomWidth: '3px',
    borderBottomColor: `var(--mui-palette-${color}-main) !important`,
    boxShadow: 'var(--mui-customShadows-xl)',
    marginBlockEnd: '-1px'
  }
}))

// ========== Table helpers ==========
const columnHelper = createColumnHelper<RowType>()

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

// Debounced input (ถ้าจะใช้ global filter ในอนาคต)

// ========== Component ==========
const DataTable: React.FC = () => {
  // UI states
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterType, setFilterType] = useState<'1' | '2' | '3' | '4'>('1')
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)
  const [loadingTable, setLoadingTable] = useState<boolean>(true)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)

  const [scheduleList, setScheduleList] = useState<any[]>([])
  const [editRow, setEditRow] = useState<RowType | null>(null)

  // server-side pagination states
  const [currentPage, setCurrentPage] = useState<number>(1) // UI page (เริ่มที่ 1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalElements, setTotalElements] = useState<number>(0)

  // ✅ summary totals (นับจาก "ทั้งหมด" ไม่ใช่เฉพาะหน้าปัจจุบัน)
  const [summary, setSummary] = useState({ total: 0, playing: 0, upcoming: 0, expired: 0 })
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<null | RowType>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>('')

  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success'
  })

  // ----- Preview states -----
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false)
  const [scheduleDetail, setScheduleDetail] = useState<ScheduleDetail | null>(null)

  // Asset preview (ภาพ/วิดีโอ)
  const [openAssetDialog, setOpenAssetDialog] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [assetTitle, setAssetTitle] = useState<string>('')
  const [assetType, setAssetType] = useState<'image' | 'video' | null>(null)
  const [assetSrc, setAssetSrc] = useState<string | null>(null)

  // ----- helpers -----
  const RAW_BASE = process.env.NEXT_PUBLIC_SIGNBOARD_BASE_URL ?? 'https://cloud.softacular.net'
  const BASE_URL = RAW_BASE.replace('http://', 'https://')
  const toAbs = (u?: string | null) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u}`)
  const normalizeTitle = (t?: string) => (t || '').trim().toLowerCase()

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

  const openScheduleById = async (scheduleId: number) => {
    try {
      const accessToken = Cookies.get('accessToken')

      if (!accessToken) throw new Error('Missing access token')

      const res = await fetch(`/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `HTTP ${res.status}`)
      }

      setScheduleDetail(json.data as ScheduleDetail)
      setOpenScheduleDialog(true)
    } catch (e: any) {
      setToast({ open: true, msg: e?.message || 'โหลดรายละเอียดไม่สำเร็จ', severity: 'error' })
    }
  }

  // สแกน media แบบ on-demand จาก /api/auth/media ทั้ง video & image
  async function fetchMediaPage(
    type: 'video' | 'image',
    page = 0,
    size = 100,
    token?: string
  ): Promise<{ list: any[]; totalPages: number }> {
    const res = await fetch(`/api/auth/media?page=${page}&size=${size}&type=${type}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      }
    })

    const json = await res.json().catch(() => ({}))

    const directArr: any[] = Array.isArray(json?.data?.media)
      ? json.data.media
      : Array.isArray(json?.data?.data)
        ? json.data.data
        : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.results)
            ? json.results
            : []

    const totalPages = Number(json?.data?.total_pages ?? 1)

    return { list: directArr, totalPages }
  }

  async function findMediaOnDemand(item: AdsItem): Promise<{ url?: string; type?: 'image' | 'video'; title?: string }> {
    // 0) ถ้า ads item มี url ตรง ๆ
    const anyItem: any = item

    const directUrl =
      anyItem?.fileUrl || anyItem?.file_url || anyItem?.url || anyItem?.thumbnail_url || anyItem?.thumbnailUrl

    if (directUrl) {
      return {
        url: toAbs(String(directUrl)),
        type: String(item.type).toLowerCase() === 'video' ? 'video' : 'image',
        title: anyItem?.title ?? anyItem?.name ?? ''
      }
    }

    const token = Cookies.get('accessToken')
    const itemType: 'video' | 'image' = String(item.type).toLowerCase() === 'video' ? 'video' : 'image'
    const wantedId = Number(anyItem.mediaId ?? anyItem.media_id ?? item.id ?? NaN)
    const wantedTitle = normalizeTitle(item.title)
    const wantedDuration = item.duration != null ? Number(item.duration) : null

    // ลอง type เดียวกันก่อน แล้วค่อยสลับ
    for (const type of [itemType, itemType === 'video' ? 'image' : 'video'] as const) {
      let page = 0,
        total = 1
      let best: any | undefined
      let bestDiff = Number.POSITIVE_INFINITY

      do {
        const { list, totalPages } = await fetchMediaPage(type, page, 100, token)

        total = totalPages

        // 1) id ตรง
        if (!Number.isNaN(wantedId)) {
          const byId = list.find((m: any) => Number(m?.id ?? m?.media_id) === wantedId)

          if (byId?.fileUrl || byId?.file_url || byId?.url) {
            return {
              url: toAbs(byId.fileUrl ?? byId.file_url ?? byId.url),
              type,
              title: byId?.title ?? byId?.name ?? ''
            }
          }
        }

        // 2) ชื่อ + ประเภท (+duration สำหรับวิดีโอ)
        for (const m of list) {
          const mt = normalizeTitle(m?.title ?? m?.name ?? '')

          if (mt === wantedTitle) {
            if (type === 'video' && wantedDuration != null) {
              const d = Number(m?.duration ?? wantedDuration)
              const diff = Math.abs(d - wantedDuration)

              if (diff < bestDiff) {
                best = m
                bestDiff = diff
              }
            } else if (!best) {
              best = m
              bestDiff = 0
            }
          }
        }

        page += 1
      } while (page < total)

      if (best?.fileUrl || best?.file_url || best?.url) {
        return { url: toAbs(best.fileUrl ?? best.file_url ?? best.url), type, title: best?.title ?? best?.name ?? '' }
      }
    }

    return {}
  }

  // เปิด asset preview จาก item โฆษณา
  const onOpenAsset = async (item: AdsItem) => {
    setOpenAssetDialog(true)
    setAssetLoading(true)
    setAssetError(null)
    setAssetTitle(item.title || 'ตัวอย่างสื่อ')
    setAssetSrc(null)
    setAssetType(null)

    try {
      const found = await findMediaOnDemand(item)

      if (!found?.url) throw new Error('ไม่พบไฟล์ที่ตรงกับรายการนี้')

      setAssetSrc(found.url)
      setAssetType(found.type ?? (String(item.type).toLowerCase() === 'video' ? 'video' : 'image'))
    } catch (e: any) {
      setAssetError(e?.message || 'โหลดตัวอย่างสื่อไม่สำเร็จ')
    } finally {
      setAssetLoading(false)
    }
  }

  // เปิด confirm โดยเก็บ id (และข้อมูลแถว) ไว้
  const promptDelete = (row: RowType) => {
    setDeleteError('')
    setDeleteTarget(row) // ✅ เก็บ schedule_id ไว้ใน state
  }

  // ยิงลบจริง
  const confirmDelete = async () => {
    if (!deleteTarget) return
    const sid = deleteTarget.schedule_id

    setDeleting(true)
    setDeleteError('')

    try {
      const token = Cookies.get('accessToken')

      const res = await fetch(`/api/schedules/${encodeURIComponent(String(sid))}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      const text = await res.text()

      if (!res.ok) throw new Error(text || `HTTP ${res.status}`)

      // ลบสำเร็จ → รีเฟรชตารางหน้าปัจจุบัน
      // กรณีหน้าเพจว่างหลังลบ ให้ถอยกลับหน้าก่อนหน้า
      await fetchScheduleList(currentPage, rowsPerPage)

      // ถ้าหน้าปัจจุบันว่าง และ currentPage > 1 → ย้อนกลับหน้าก่อนแล้วโหลดใหม่

      setTimeout(async () => {
        const hasRows = table.getRowModel().rows.length > 0

        if (!hasRows && currentPage > 1) {
          await fetchScheduleList(currentPage - 1, rowsPerPage)
        }
      }, 0)
      setDeleteTarget(null)
      setToast({ open: true, msg: 'ลบสําเร็จ', severity: 'success' })
    } catch (e: any) {
      setDeleteError(e?.message || 'ลบไม่สำเร็จ')
      setToast({ open: true, msg: 'Delete failed', severity: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (row: RowType) => {
    setEditRow(row)
    setWizardStep(0) // ✅ เริ่มที่สเต็ป 0 เสมอ
    setWizardData(null) // ✅ เคลียร์ข้อมูลค้าง
    setPreviewDialogOpen(true)
  }

  const closeEditDialog = () => {
    setPreviewDialogOpen(false)
    setWizardStep(0) // ✅ รีเซ็ต
    setWizardData(null)
  }

  // ✅ เพิ่ม state สำหรับ wizard
  const [wizardStep, setWizardStep] = useState<0 | 1>(0)

  const [wizardData, setWizardData] = useState<{
    scheduleId: number
    orientation: 'landscape' | 'portrait'
    selectedOldFiles: any[] // MediaItem[]
    uploadedFiles: any[] // UploadedFile[]
    adName: string
    adDescription: string
    startAt: string
    endAt: string
  } | null>(null)

  async function fetchSummaryTotals(totalExpected?: number) {
    try {
      setSummaryLoading(true)

      const token = Cookies.get('accessToken')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (token) headers.Authorization = `Bearer ${token}`

      // 1) ยิงหน้าแรก (page=0) พร้อมขอ size ใหญ่หน่อย (แต่สุดท้ายใช้ "effective size" ที่เซิร์ฟเวอร์ตอบกลับ)
      const probeSize = Math.max(10, Math.min(Number(totalExpected) || 100, 1000))
      const res0 = await fetch(`/api/proxy/schedules?page=0&size=${probeSize}`, { method: 'GET', headers })
      const text0 = await res0.text()

      if (!res0.ok) throw new Error(`HTTP ${res0.status}: ${text0}`)
      const json0 = JSON.parse(text0)

      const total = Number(json0?.data?.total_elements ?? 0)
      const effectiveSize = Math.max(1, Number(json0?.data?.size ?? probeSize)) // ขนาดที่เซิร์ฟเวอร์ยอมรับจริง
      const totalPages = Math.max(1, Number(json0?.data?.total_pages ?? Math.ceil(total / effectiveSize)))

      let playing = 0,
        upcoming = 0,
        expired = 0

      // นับจากหน้า 0
      const arr0 = extractSchedulesArray(json0)
      const rows0 = mapSchedulesToRows(arr0, 0)

      for (const r of rows0) {
        const s = getRowStatus(r)

        if (s === 'กำลังฉาย') playing++
        else if (s === 'ยังไม่เริ่ม') upcoming++
        else expired++
      }

      // 2) วนดึงหน้าที่เหลือ (1..totalPages-1) แล้วสะสมผล
      for (let p = 1; p < totalPages; p++) {
        const resp = await fetch(`/api/proxy/schedules?page=${p}&size=${effectiveSize}`, { method: 'GET', headers })
        const txt = await resp.text()

        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${txt}`)
        const js = JSON.parse(txt)
        const arr = extractSchedulesArray(js)
        const rows = mapSchedulesToRows(arr, p * effectiveSize)

        for (const r of rows) {
          const s = getRowStatus(r)

          if (s === 'กำลังฉาย') playing++
          else if (s === 'ยังไม่เริ่ม') upcoming++
          else expired++
        }
      }

      // สรุปสุดท้าย = ทั้งระบบ
      setSummary({ total, playing, upcoming, expired })
    } catch (e) {
      console.warn('Summary totals failed:', e)
    } finally {
      setSummaryLoading(false)
    }
  }

  // === เพิ่ม helper สำหรับ merge orientation จาก scheduleList → rows ===
  function mergeOrientation(rows: RowType[], schedules: any[]): RowType[] {
    if (!rows?.length || !schedules?.length) return rows

    // สร้าง map: scheduleId -> playOrientation (uppercase)
    const oriMap = new Map<number, string>()

    for (const s of schedules) {
      const sid = Number(s?.id ?? s?.schedule_id ?? s?.scheduleId)

      if (!Number.isNaN(sid)) {
        oriMap.set(sid, String(s?.playOrientation ?? '').toUpperCase())
      }
    }

    return rows.map(r => {
      const ori = oriMap.get(Number(r.schedule_id))

      if (!ori) return r

      const direction = ori === 'VERTICAL' ? VERTICAL_CONST : ori === 'HORIZONTAL' ? HORIZONTAL_CONST : r.direction // ถ้าไม่รู้จักค่า ให้คงเดิม

      return { ...r, direction }
    })
  }

  const fetchScheduleList = React.useCallback(
    async (page = currentPage, size = rowsPerPage) => {
      try {
        const token = Cookies.get('accessToken')
        const backendPage = Math.max(0, page - 1)

        const res = await fetch(`/api/proxy/schedules?page=${backendPage}&size=${size}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })

        const text = await res.text()

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)

        if (!text.trim()) {
          setScheduleList([])
          setBaseData([])
          setData([])
          setCurrentPage(1)
          setTotalPages(1)
          setTotalElements(0)

          return
        }

        const json = JSON.parse(text)
        const arr = extractSchedulesArray(json)

        const metaPage = Number(json?.data?.page ?? backendPage) // 0-based
        const metaSize = Number(json?.data?.size ?? size)
        const metaPages = Number(json?.data?.total_pages ?? 1)
        const metaTotal = Number(json?.data?.total_elements ?? arr.length)

        setTotalPages(metaPages)
        setTotalElements(metaTotal)
        await fetchSummaryTotals(metaTotal)

        setCurrentPage(metaPage + 1) // UI 1-based
        setScheduleList(arr)

        const offset = metaPage * metaSize
        const rows = mapSchedulesToRows(arr, offset)

        setBaseData(rows)
        setData(rows)
      } catch (err) {
        console.warn('Schedule list fetch failed:', err)
        setScheduleList([])
        setBaseData([])
        setData([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalElements(0)
      }
    },
    [currentPage, rowsPerPage]
  )

  const onFinishUpdate = () => {
    setPreviewDialogOpen(false)
    setWizardStep(0)
    setWizardData(null)

    // รีเฟรชข้อมูลตาราง
    fetchScheduleList()
  }

  // data
  const [baseData, setBaseData] = useState<RowType[]>([])
  const [data, setData] = useState<RowType[]>([])

  // ฟิวส์กันยิงซ้ำจาก StrictMode ใน dev
  const didFetch = useRef(false)
  const [isClient, setIsClient] = useState<boolean>(false)

  // แปลง payload จาก /api/proxy/schedules ให้กลายเป็น RowType ของตาราง
  // แปลง payload จาก /api/proxy/schedules ให้กลายเป็น RowType ของตาราง
  function mapSchedulesToRows(arr: any[], offset = 0): RowType[] {
    return (arr || [])
      .map((s: any, idx: number) => ({
        id: offset + idx + 1, // ลำดับที่โชว์ในตาราง
        schedule_id: Number(s?.id ?? s?.schedule_id ?? s?.scheduleId),
        name: s?.name ?? s?.scheduleName ?? '-',
        campaing_code: s?.scheduleNumber ?? '-',
        start_date: s?.runAt ?? s?.start_time ?? '',
        end_date: s?.runAtTo ?? s?.end_time ?? '',
        direction: String(s?.playOrientation ?? '').toUpperCase() === 'VERTICAL' ? VERTICAL_CONST : HORIZONTAL_CONST,
        status: ''
      }))
      .filter(r => !Number.isNaN(r.schedule_id))
  }

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // ===== fetch + map =====
  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true
    // eslint-disable-next-line padding-line-between-statements
    ;(async () => {
      setLoadingTable(true)
      await fetchScheduleList(1, rowsPerPage) // UI=1 -> API=0
      setLoadingTable(false)
    })()
  }, [])

  // แปลงสตริงวันเป็น timestamp โดยถ้าไม่มีเวลา:
  //   - start ใช้ 00:00:00
  //   - end   ใช้ 23:59:59
  function toTsBounded(s?: string, bound: 'start' | 'end' = 'start') {
    if (!s) return NaN
    if (s.includes('T')) return Date.parse(s) // มีเวลาอยู่แล้ว
    const withTime = bound === 'end' ? `${s}T23:59:59` : `${s}T00:00:00`
    const t = Date.parse(withTime)

    return Number.isNaN(t) ? Date.parse(withTime + 'Z') : t
  }

  const getRowStatus = React.useCallback((row: RowType): 'กำลังฉาย' | 'ยังไม่เริ่ม' | 'หมดอายุ' => {
    const now = Date.now()
    const st = toTsBounded(row.start_date, 'start')
    const et = toTsBounded(row.end_date, 'end')

    if (!Number.isNaN(st) && !Number.isNaN(et)) {
      if (now < st) return 'ยังไม่เริ่ม'
      if (now > et) return 'หมดอายุ'

      return 'กำลังฉาย'
    }

    return (row.status as any) || 'ยังไม่เริ่ม'
  }, [])

  // ===== columns =====
  const columns = useMemo<ColumnDef<RowType, any>[]>(() => {
    return [
      columnHelper.accessor('id', {
        cell: info => <span className='text-red-500 ms-3'>{info.getValue()}</span>,
        header: 'ลำดับ'
      }),
      columnHelper.accessor('campaing_code', {
        cell: info => info.getValue(),
        header: 'รหัสแคมเปญ'
      }),
      columnHelper.accessor('name', {
        cell: info => info.getValue(),
        header: 'ชื่อกำหนดการ'
      }),
      columnHelper.accessor('start_date', {
        cell: info => info.getValue(),
        header: 'ระยะเวลาเริ่ม'
      }),
      columnHelper.accessor('end_date', {
        cell: info => info.getValue(),
        header: 'ระยะเวลาสิ้นสุด'
      }),
      columnHelper.accessor('direction', {
        cell: info => {
          const value = info.getValue() as DirectionType

          return (
            <div className='flex items-center gap-x-2'>
              {value?.img ? <img src={value.img} height={30} width={30} aria-label={value.style} /> : null}
              {value?.style ? <span>{value.style}</span> : null}
            </div>
          )
        },
        header: 'DIRECTION',
        enableSorting: false
      }),
      columnHelper.accessor('status', {
        cell: info => {
          const row = info.row.original
          const status = getRowStatus(row)

          const color = status === 'กำลังฉาย' ? 'success' : status === 'ยังไม่เริ่ม' ? 'warning' : 'info'

          return <Chip label={status} color={color} variant='tonal' />
        },
        header: 'STATUS',
        enableSorting: false
      }),
      columnHelper.accessor('actions', {
        cell: info => {
          const row = info.row.original

          return (
            <div className='flex justify-around gap-0.5'>
              <CustomIconButton
                aria-label='view details'
                color='info'
                variant='tonal'
                onClick={() => openScheduleById(row.schedule_id)} // ← เปลี่ยนมาเรียกโหลด+เปิด dialog
              >
                <i className='bx-show' />
              </CustomIconButton>

              <CustomIconButton
                aria-label='edit campaign'
                color='warning'
                variant='tonal'
                onClick={() => openEdit(row)}
              >
                <i className='bx-edit' />
              </CustomIconButton>
              <CustomIconButton
                aria-label='delete campaign'
                color='error'
                variant='tonal'
                onClick={() => promptDelete(row)} // ✅ เก็บ schedule_id เข้าสตท.
              >
                <i className='bx-trash' />
              </CustomIconButton>
            </div>
          )
        },
        header: 'ACTIONS',
        enableSorting: false
      })
    ]
  }, [])

  const displayRows = useMemo(() => mergeOrientation(data, scheduleList), [data, scheduleList])

  // === ใช้ displayRows ใน table แทน data ตรง ๆ ===
  const table = useReactTable({
    data: displayRows,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { columnFilters, globalFilter },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    initialState: { pagination: { pageSize: rowsPerPage } }
  })

  // ===== log schedule_id ที่กำลังแสดงบนตาราง =====
  useEffect(() => {
    // เฉพาะแถวที่อยู่บน "หน้าเพจปัจจุบัน"
    const idsOnThisPage = table.getRowModel().rows.map(r => r.original.schedule_id)

    // แถวทั้งหมดหลัง filter/sort (ยังไม่ตัดหน้าเพจ)
    const idsAllAfterFilterSort = table.getFilteredRowModel().rows.map(r => r.original.schedule_id)

    console.log('[TABLE] schedule_id (หน้านี้):', idsOnThisPage)
    console.log('[TABLE] schedule_id (ทั้งหมดหลัง filter/sort):', idsAllAfterFilterSort)
  }, [data, columnFilters, globalFilter, table])

  // ===== filter dropdown change =====
  const handleFilterChange = (val: '1' | '2' | '3' | '4') => {
    setFilterType(val)

    if (val === '1') {
      setData(rowsAllWithOrientation)
    } else {
      const keyword = val === '2' ? 'แนวนอน' : val === '3' ? 'แนวตั้ง' : 'รูปภาพ'
      const filtered = rowsAllWithOrientation.filter(item => item.direction?.style?.includes(keyword))

      setData(filtered)
    }

    table.setPageIndex(0)
  }

  // ✅ ดึง array ตารางงานจาก payload รองรับหลายทรง
  const extractSchedulesArray = (json: any): any[] => {
    if (!json) return []
    const d = json.data

    if (Array.isArray(d?.schedules)) return d.schedules // <-- เคสจริงของ /api/proxy/schedules
    if (Array.isArray(d)) return d
    if (Array.isArray(d?.data)) return d.data

    return []
  }

  // Fetch device usage data
  const fetchDeviceUsage = async () => {
    try {
      const accessToken = Cookies.get('accessToken')

      if (!accessToken) {
        console.error('Access token not found')

        return
      }

      const response = await fetch('/api/proxy/device-usage', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      console.log('Device usage response:', result)

      if (result.success && result.data) {
      } else {
        console.warn('Fetch failed:', result.message)

        // Set fallback values
      }
    } catch (error) {
      console.error('API error:', error)

      // Set fallback values on error
    } finally {
    }
  }

  useEffect(() => {
    if (isClient) {
      fetchDeviceUsage()
    }
  }, [isClient])

  // === คำนวณ rows ที่ผสม orientation เรียบร้อย (ใช้ใน table + filter) ===
  const rowsAllWithOrientation = useMemo(() => mergeOrientation(baseData, scheduleList), [baseData, scheduleList])

  // ให้ data (แถวที่กำลังแสดง) เป็นเวอร์ชันที่ merge แล้วเสมอ

  // ถ้า filterType = 'ทั้งหมด' ให้ sync data กับ rowsAllWithOrientation อัตโนมัติเมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (filterType === '1') setData(rowsAllWithOrientation)
  }, [rowsAllWithOrientation, filterType])

  // ===== render =====
  return (
    <div>
      <Grid container spacing={5} sx={{ mb: 5 }}>
        <Grid size={{ xs: 3 }}>
          <Card color={'error'}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'error'} variant='rounded' size={40}>
                  <Icon icon='meteor-icons:tv' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{summaryLoading ? '—' : summary.total}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'ทั้งหมด'}</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card color={'success'}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'success'} variant='rounded' size={40}>
                  <Icon icon='material-symbols:connected-tv-outline' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{summaryLoading ? '—' : summary.playing}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'กำลังฉาย'}</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card color={'warning'}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'warning'} variant='rounded' size={40}>
                  <Icon icon='mdi:timer-sand' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{summaryLoading ? '—' : summary.upcoming}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'ยังไม่เริ่ม'}</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card color={'info'}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'info'} variant='rounded' size={40}>
                  <Icon icon='ph:calendar-x' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{summaryLoading ? '—' : summary.expired}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'หมดอายุ'}</Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <MuiCard>
        <CardHeader title='รายการกำหนดการ' sx={{ p: 5 }} />
        <Grid container spacing={0} sx={{ m: 5, mt: -5, display: 'flex', justifyContent: 'space-between' }}>
          <CustomTextField
            select
            value={filterType}
            onChange={e => handleFilterChange(e.target.value as '1' | '2' | '3' | '4')}
            label='รายการ'
            sx={{ minWidth: 150 }}
          >
            <MenuItem value='1'>ทั้งหมด</MenuItem>
            <MenuItem value='2'>แนวนอน</MenuItem>
            <MenuItem value='3'>แนวตั้ง</MenuItem>
            {/* <MenuItem value='4'>รูปภาพ</MenuItem> */}
          </CustomTextField>

          <CustomTextField
            select
            value={String(table.getState().pagination.pageSize)}
            onChange={async e => {
              const rows = parseInt(e.target.value)

              setRowsPerPage(rows)
              table.setPageSize(rows)
              setLoadingTable(true)
              await fetchScheduleList(1, rows) // ⬅️ รีเฟรชจากหน้า 1 ด้วย size ใหม่
              setLoadingTable(false)
            }}
            label='Rows per page'
            sx={{ minWidth: 120 }}
          >
            <MenuItem value='10'>10</MenuItem>
            <MenuItem value='25'>25</MenuItem>
            <MenuItem value='50'>50</MenuItem>
            <MenuItem value='100'>100</MenuItem>
          </CustomTextField>
        </Grid>

        {loadingTable ? (
          <div className='flex justify-center items-center min-h-[200px]'>
            <CircularProgress />
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className={styles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={classnames({
                              'flex items-center': header.column.getIsSorted(),
                              'cursor-pointer select-none': header.column.getCanSort()
                            })}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <ChevronRight fontSize='1.25rem' className='-rotate-90' />,
                              desc: <ChevronRight fontSize='1.25rem' className='rotate-90' />
                            }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              {table.getFilteredRowModel().rows.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                      No data available
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
        <div className='flex justify-end items-center flex-wrap pli-6 border-bs bs-auto plb-[12.5px] gap-3'>
          <Typography variant='body2' color='text.secondary'>
            ทั้งหมด {totalPages} หน้า · {totalElements} รายการ
          </Typography>{' '}
          <Pagination
            variant='tonal'
            shape='rounded'
            color='primary'
            count={totalPages}
            page={currentPage} // UI 1-based
            onChange={async (_, page) => {
              setLoadingTable(true)
              table.setPageIndex(0)
              await fetchScheduleList(page, rowsPerPage) // UI -> แปลงเป็น API ในฟังก์ชัน
              setLoadingTable(false)
            }}
            showFirstButton
            showLastButton
          />
        </div>
      </MuiCard>

      {/* Schedule Detail Dialog */}
      <Dialog
        sx={{ p: 0, m: 0 }}
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <Box mt={3} mx={3} mb={0} display='flex' justifyContent='space-between' alignItems='center'>
          <Button
            sx={{ borderRadius: '100%', width: 60, height: 60, m: 0, p: 0 }}
            onClick={() => setOpenScheduleDialog(false)}
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
                      <MuiCard
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
                            String(item.type).toLowerCase() === 'video'
                              ? 'var(--mui-palette-primary-main)'
                              : 'var(--mui-palette-success-main)',
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
                            color={String(item.type).toLowerCase() === 'video' ? 'primary' : 'success'}
                            variant='rounded'
                            size={50}
                          >
                            <i
                              className={String(item.type).toLowerCase() === 'video' ? 'bx bx-video' : 'bx bx-image'}
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
                                label={String(item.type).toLowerCase()}
                                size='small'
                                color={String(item.type).toLowerCase() === 'video' ? 'primary' : 'success'}
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
                      </MuiCard>
                    ))}
                  </div>
                </Box>
              </CardContent>
            </CardContent>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Asset Preview Dialog (ภาพ/วิดีโอ) */}
      <Dialog open={openAssetDialog} onClose={() => setOpenAssetDialog(false)} maxWidth='md' fullWidth>
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
            onClick={() => setOpenAssetDialog(false)}
            aria-label='ปิดตัวอย่างสื่อ'
          >
            <ArrowBackIcon />
          </Button>
          <DialogTitle sx={{ m: 0, textAlign: 'center', justifySelf: 'center' }}>
            {assetTitle || 'ตัวอย่างสื่อ'}
          </DialogTitle>
          <Box sx={{ width: 48, height: 48 }} />
        </Box>

        <DialogContent sx={{ mt: 1, py: 0, minHeight: { xs: '60vh', md: 550 } }}>
          {assetLoading && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </div>
          )}
          {assetError && <Alert severity='error'>{assetError}</Alert>}

          {!assetLoading && !assetError && assetSrc && assetType === 'image' && (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <CardContent sx={{ p: 0, width: '100%' }}>
                <img
                  src={assetSrc}
                  alt={assetTitle || 'image'}
                  style={{ maxHeight: 500, objectFit: 'contain', borderRadius: 8, width: '100%' }}
                />
              </CardContent>
            </Box>
          )}
          {!assetLoading && !assetError && assetSrc && assetType === 'video' && (
            <video controls width='100%' style={{ maxHeight: 480 }} autoPlay>
              <source src={assetSrc} type='video/mp4' />
              Your browser does not support the video tag.
            </video>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={previewDialogOpen} onClose={closeEditDialog} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' justifyContent='space-between' alignItems='center'>
            <Typography variant='h6'>แก้ไขกำหนดการ</Typography>
            <IconButton onClick={closeEditDialog}>
              <Icon icon='material-symbols:close' />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 0 }}>
          {editRow && (
            <>
              {wizardStep === 0 ? (
                <EditSchedules
                  key={editRow.schedule_id}
                  row={{
                    name: editRow.name,
                    schedule_id: editRow.schedule_id,
                    direction: { style: editRow.direction?.style },
                    start_date: editRow.start_date,
                    end_date: editRow.end_date
                  }}
                  initialPayload={wizardData ?? undefined}
                  onNext={payload => {
                    setWizardData(prev => ({
                      ...(prev ?? {}),
                      ...payload
                    }))
                    setWizardStep(1)
                  }}
                />
              ) : (
                <EditSchedulesUpdate
                  activeStep={1}
                  handlePrev={() => setWizardStep(0)}
                  steps={[
                    { title: 'แก้ไขกำหนดการ', subtitle: '' },
                    { title: 'ยืนยัน & มอบหมาย', subtitle: '' }
                  ]}
                  scheduleId={wizardData?.scheduleId as number}
                  orientation={wizardData?.orientation || 'landscape'}
                  selectedOldFiles={wizardData?.selectedOldFiles || []}
                  adName={wizardData?.adName || ''}
                  adDescription={wizardData?.adDescription || ''}
                  uploadedFiles={wizardData?.uploadedFiles || []}
                  setUploadedFiles={files =>
                    setWizardData(prev => (prev ? { ...prev, uploadedFiles: files as any } : prev))
                  }
                  startDateTime={wizardData?.startAt ? new Date(wizardData.startAt) : null}
                  endDateTime={wizardData?.endAt ? new Date(wizardData.endAt) : null}
                  selectedDeviceIds={[]}
                  handleNext={onFinishUpdate}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => (!deleting ? setDeleteTarget(null) : null)} maxWidth='xs' fullWidth>
        <DialogTitle>ยืนยันการลบกำหนดการ</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography>ต้องการลบกำหนดการนี้หรือไม่?</Typography>
            <Typography variant='body2' color='text.secondary'>
              ID: <strong>{deleteTarget?.schedule_id}</strong>
              {deleteTarget?.name ? (
                <>
                  {' '}
                  • ชื่อ: <strong>{deleteTarget?.name}</strong>
                </>
              ) : null}
            </Typography>

            {deleteError && (
              <Alert severity='error' variant='filled'>
                {deleteError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
              <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
                ยกเลิก
              </Button>
              <Button color='error' variant='contained' onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'กำลังลบ…' : 'ลบ'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t: typeof toast) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast((t: typeof toast) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default DataTable
