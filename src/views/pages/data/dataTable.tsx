// src/views/pages/data/dataTable.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

// MUI
import MuiCard from '@mui/material/Card'
import { styled } from '@mui/material/styles'
import type { CardProps } from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import {
  Box,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Typography
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
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [deviceUsed, setDeviceUsed] = useState<number>(0)
  const [maxDeviceUsed, setMaxDeviceUsed] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [scheduleList, setScheduleList] = useState<any[]>([])

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

  // ===== (2) ฟังก์ชัน fetch + parse ที่ทน response หลายรูปแบบ =====
  const fetchScheduleList = async () => {
    try {
      const token = Cookies.get('accessToken')

      const res = await fetch('/api/proxy/schedules', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      const text = await res.text()

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)

      if (!text.trim()) {
        console.warn('[schedules] empty response')
        setScheduleList([])

        return
      }

      const json = JSON.parse(text)

      // รองรับได้ทั้ง {data: [...]}, {data:{data:[...]}}, หรือ [] ตรง ๆ
      const arr = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.data)
          ? json.data.data
          : Array.isArray(json)
            ? json
            : []

      setScheduleList(arr)

      // 👇 log array ออกมา
      console.log('📋 [/api/proxy/schedules] array:', arr)
      console.log('📋 จำนวนรายการ:', arr.length)
      console.log('📋 ตัวอย่าง 3 แรก:', arr.slice(0, 3))
    } catch (err) {
      console.warn('Schedule list fetch failed:', err)
      setScheduleList([])
    }
  }

  // data
  const [baseData, setBaseData] = useState<RowType[]>([])
  const [data, setData] = useState<RowType[]>([])

  // ---- counters derived from current table rows ----
  const { playingCount, upcomingCount, expiredCount } = useMemo(() => {
    let playing = 0
    let upcoming = 0
    let expired = 0
    const now = Date.now()

    const toTs = (s?: string) => {
      if (!s) return NaN

      // รองรับ "YYYY-MM-DD HH:mm:ss" และ ISO
      const normalized = s.includes('T') ? s : s.replace(' ', 'T')
      const t = Date.parse(normalized)

      return Number.isNaN(t) ? Date.parse(normalized + 'Z') : t
    }

    for (const r of data) {
      // ถ้าแถวมี status มาแล้ว ให้นับตามนั้นก่อน
      if (r.status === 'กำลังฉาย') {
        playing++
        continue
      }

      if (r.status === 'ยังไม่เริ่ม') {
        upcoming++
        continue
      }

      if (r.status === 'หมดอายุ') {
        expired++
        continue
      }

      // ไม่งั้นคำนวณจากเวลาเริ่ม/สิ้นสุด
      const st = toTs(r.start_date)
      const et = toTs(r.end_date)

      if (!Number.isNaN(st) && !Number.isNaN(et)) {
        if (now < st) upcoming++
        else if (now > et) expired++
        else playing++
      }
    }

    return { playingCount: playing, upcomingCount: upcoming, expiredCount: expired }
  }, [data])

  // ฟิวส์กันยิงซ้ำจาก StrictMode ใน dev
  const didFetch = useRef(false)
  const [isClient, setIsClient] = useState<boolean>(false)

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // ===== fetch + map =====
  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true

    const fetchData = async () => {
      try {
        setLoadingTable(true)

        const res = await fetch('/api/auth/schedule-assignments', { cache: 'no-store' })
        const json = await res.json()

        console.log('[schedule-assignments] raw payload:', json)

        const rows: RowType[] = Array.isArray(json?.data) ? json.data : []

        console.log('[schedule-assignments] rows:', rows)

        setBaseData(rows)
        setData(rows)
      } catch (e) {
        console.error('[schedule-assignments] fetch error:', e)
        setBaseData([])
        setData([])
      } finally {
        setLoadingTable(false)
      }
    }

    // 🔹 เรียกทั้งสองอย่าง
    ;(async () => {
      await Promise.all([fetchData(), fetchScheduleList()])
    })()
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
        header: 'DIRECTION'
      }),
      columnHelper.accessor('status', {
        cell: info => {
          const status = info.getValue() as string

          return <Chip label={status} color={status === 'กำลังฉาย' ? 'success' : 'warning'} variant='tonal' />
        },
        header: 'STATUS'
      }),
      columnHelper.accessor('actions', {
        cell: () => (
          <div className='flex justify-around'>
            <CustomIconButton
              aria-label='view details'
              color='info'
              variant='tonal'
              onClick={() => setOpenPreviewDialog(true)}
            >
              <i className='bx-show' />
            </CustomIconButton>
            <CustomIconButton
              aria-label='edit campaign'
              color='warning'
              variant='tonal'
              onClick={() => setPreviewDialogOpen(true)}
            >
              <i className='bx-edit' />
            </CustomIconButton>
            <CustomIconButton aria-label='delete campaign' color='error' variant='tonal'>
              <i className='bx-trash' />
            </CustomIconButton>
          </div>
        ),
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

  // Fetch device usage data
  const fetchDeviceUsage = async () => {
    try {
      setIsLoading(true)
      const accessToken = Cookies.get('accessToken')

      if (!accessToken) {
        console.error('Access token not found')

        // Set default values when no token
        setDeviceUsed(0)
        setMaxDeviceUsed(0)

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
        setDeviceUsed(result.data.device_used || 0)
        setMaxDeviceUsed(result.data.max_devices || 0)
      } else {
        console.warn('Fetch failed:', result.message)

        // Set fallback values
        setDeviceUsed(0)
        setMaxDeviceUsed(0)
      }
    } catch (error) {
      console.error('API error:', error)

      // Set fallback values on error
      setDeviceUsed(0)
      setMaxDeviceUsed(0)
    } finally {
      setIsLoading(false)
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
                <Typography variant='h4'>
                  {isLoading ? <CircularProgress size={20} /> : `${deviceUsed} / ${maxDeviceUsed}`}
                </Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'TV ทั้งหมด'}</Typography>
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
                <Typography variant='h4'>{playingCount}</Typography>
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
                <Typography variant='h4'>{upcomingCount}</Typography>
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
                <Typography variant='h4'>{expiredCount}</Typography>
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
            <MenuItem value='2'>วิดีโอ แนวนอน</MenuItem>
            <MenuItem value='3'>วิดีโอ แนวตั้ง</MenuItem>
            <MenuItem value='4'>รูปภาพ</MenuItem>
          </CustomTextField>

          <CustomTextField
            select
            value={String(table.getState().pagination.pageSize)}
            onChange={e => {
              const rows = parseInt(e.target.value)

              setRowsPerPage(rows)
              table.setPageSize(rows)
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
        <div className='flex justify-end items-center flex-wrap pli-6 border-bs bs-auto plb-[12.5px] gap-2'>
          <Pagination
            shape='rounded'
            color='primary'
            variant='tonal'
            count={Math.ceil(table.getFilteredRowModel().rows.length / table.getState().pagination.pageSize)}
            page={table.getState().pagination.pageIndex + 1}
            onChange={(_, page) => {
              table.setPageIndex(page - 1)
            }}
            showFirstButton
            showLastButton
          />
        </div>
      </MuiCard>

      {/* Preview Dialog */}
      <Dialog open={openPreviewDialog} onClose={() => setOpenPreviewDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' justifyContent='space-between' alignItems='center'>
            <Typography variant='h6'>ดูรายละเอียดแคมเปญ</Typography>
            <IconButton onClick={() => setOpenPreviewDialog(false)}>
              <Icon icon='material-symbols:close' />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>{/* ใส่ StepPropertyFeatures ตามที่คุณใช้ได้ที่นี่ */}</DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' justifyContent='space-between' alignItems='center'>
            <Typography variant='h6'>แก้ไข</Typography>
            <IconButton onClick={() => setPreviewDialogOpen(false)}>
              <Icon icon='material-symbols:close' />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>{/* ใส่ StepPropertyDetails ตามที่คุณใช้ได้ที่นี่ */}</DialogContent>
      </Dialog>
    </div>
  )
}

export default DataTable

// ===== utilities =====

/** map payload → rows ของตารางตามเงื่อนไขที่กำหนด */
