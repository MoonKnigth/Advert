'use client'
// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import CardHeader from '@mui/material/CardHeader'
import TablePagination from '@mui/material/TablePagination'
import type { TextFieldProps } from '@mui/material/TextField'
import CustomAvatar from '@/@core/components/mui/Avatar'
import {
  CardContent,
  Typography,
  Container,
  Button,
  Chip,
  MenuItem,
  Dialog,
  DialogTitle,
  Box,
  IconButton,
  DialogContent
} from '@mui/material'
import { Grid2 } from '@mui/material'
import Grid from '@mui/material/Grid2'
import React from 'react'
import MuiCard from '@mui/material/Card'
import { styled } from '@mui/material/styles'
import type { CardProps } from '@mui/material/Card'
import { Icon } from '@iconify/react'
import StepPropertyFeatures from '../wizard-examples/property-listing/StepPropertyFeatures' // หรือ path ที่ถูกต้อง
import StepPropertyDetails from '../wizard-examples/property-listing/StepPropertyDetails'

// Types Imports
import type { ThemeColor } from '@core/types'
type Props = CardProps & {
  color: ThemeColor
}
const Card = styled(MuiCard)<Props>(({ color }) => ({
  transition: 'border 0.3s ease-in-out, box-shadow 0.3s ease-in-out, margin 0.3s ease-in-out',
  borderBottomWidth: '2px',
  borderBottomColor: `var(--mui-palette-${color}-darkerOpacity)`,
  '[data-skin="bordered"] &:hover': {
    boxShadow: 'none'
  },
  '&:hover': {
    borderBottomWidth: '3px',
    borderBottomColor: `var(--mui-palette-${color}-main) !important`,
    boxShadow: 'var(--mui-customShadows-xl)',
    marginBlockEnd: '-1px'
  }
}))

// Third-party Imports
import classnames from 'classnames'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { Column, Table, ColumnFiltersState, FilterFn, ColumnDef } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { DataType } from './data'

// Component Imports
import TablePaginationComponent from '@components/TablePaginationComponent'
import CustomTextField from '@core/components/mui/TextField'

// Icon Imports
import ChevronRight from '@menu/svg/ChevronRight'

// Style Imports
import styles from '@core/styles/table.module.css'

// Data Imports
import defaultData from './data'
import CustomIconButton from '@/@core/components/mui/IconButton'

// Column Definitions
const columnHelper = createColumnHelper<DataType>()

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

// A debounced input react component
const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & TextFieldProps) => {
  // States
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <CustomTextField {...props} value={value} onChange={e => setValue(e.target.value)} />
}

const Filter = ({ column, table }: { column: Column<any, unknown>; table: Table<any> }) => {
  // Vars
  const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)
  const columnFilterValue = column.getFilterValue()

  return typeof firstValue === 'number' ? (
    <div className='flex gap-x-2'>
      <CustomTextField
        fullWidth
        type='number'
        sx={{ minInlineSize: 100, maxInlineSize: 125 }}
        value={(columnFilterValue as [number, number])?.[0] ?? ''}
        onChange={e => column.setFilterValue((old: [number, number]) => [e.target.value, old?.[1]])}
        placeholder={`Min ${column.getFacetedMinMaxValues()?.[0] ? `(${column.getFacetedMinMaxValues()?.[0]})` : ''}`}
      />
      <CustomTextField
        fullWidth
        type='number'
        sx={{ minInlineSize: 100, maxInlineSize: 125 }}
        value={(columnFilterValue as [number, number])?.[1] ?? ''}
        onChange={e => column.setFilterValue((old: [number, number]) => [old?.[0], e.target.value])}
        placeholder={`Max ${column.getFacetedMinMaxValues()?.[1] ? `(${column.getFacetedMinMaxValues()?.[1]})` : ''}`}
      />
    </div>
  ) : (
    <CustomTextField
      fullWidth
      sx={{ minInlineSize: 100 }}
      value={(columnFilterValue ?? '') as string}
      onChange={e => column.setFilterValue(e.target.value)}
      placeholder='Search...'
    />
  )
}

const DataTable = () => {
  // States
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [data, setData] = useState<DataType[]>(() => [...defaultData])
  const [filterType, setFilterType] = useState<string>('1') // รายการทั้งหมด/แนวนอน/แนวตั้ง
  const [rowsPerPage, setRowsPerPage] = useState<number>(10) // Row ต่อหน้า
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [openPreviewDialog, setOpenPreviewDialog] = useState(false)

  const handlePreviewOpen = () => {
    setPreviewDialogOpen(true)
  }

  const handlePreviewClose = () => {
    setPreviewDialogOpen(false)
  }

  // Memoized columns definition
  const columns = useMemo<ColumnDef<DataType, any>[]>(
    () => [
      // columnHelper.accessor('id', {
      //   cell: info => info.getValue(),
      //   header: 'ลำดับ'
      // }),
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
          const value = info.getValue()

          return (
            <div className='flex items-center gap-x-2'>
              {typeof value.img === 'string' ? (
                <img src={value.img} height='30' width='30' aria-label={value.style} />
              ) : null}
              {value.style && <span>{value.style}</span>}
            </div>
          )
        },
        header: 'DIRECTION'
      }),

      // columnHelper.accessor('status', {
      //   cell: info => info.getValue(),
      //   header: 'STATUS'
      // })
      columnHelper.accessor('status', {
        cell: info => {
          const status = info.getValue()
          return (
            // <Button
            //   variant='tonal'
            //   color={status === 'กำลังฉาย' ? 'success' : 'warning'} // เปลี่ยนสีปุ่มตามสถานะ
            //   sx={{ py: 1, px: 2 }}
            // >
            //   {status}
            // </Button>
            <Chip
              label={status}
              color={status === 'กำลังฉาย' ? 'success' : 'warning'} // เปลี่ยนสีปุ่มตามสถานะ
              variant='tonal'
            />
          )
        },
        header: 'STATUS'
      }),
      columnHelper.accessor('actions', {
        cell: info => (
          <div className='flex justify-around'>
            {/* <CustomIconButton aria-label='capture screenshot' color='info' variant='tonal'>
              <i className='bx-show' />
            </CustomIconButton> */}
            <CustomIconButton
              aria-label='capture screenshot'
              color='info'
              variant='tonal'
              onClick={() => setOpenPreviewDialog(true)}
            >
              <i className='bx-show' />
            </CustomIconButton>
            <CustomIconButton
              aria-label='capture screenshot'
              color='warning'
              variant='tonal'
              onClick={() => setPreviewDialogOpen(true)}
            >
              <i className='bx-edit' />
            </CustomIconButton>

            {/* <CustomIconButton aria-label='capture screenshot' color='warning' variant='tonal'>
              <i className='bx-edit' />
            </CustomIconButton> */}
            <CustomIconButton aria-label='capture screenshot' color='error' variant='tonal'>
              <i className='bx-trash' />
            </CustomIconButton>
          </div>
        ),
        header: 'ACTIONS'
      })

      // columnHelper.accessor('actions', {
      //   cell: info => info.getValue(),
      //   header: 'ACTIONS'
      // })
    ],
    []
  )

  // React Table instance
  const table = useReactTable({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter
    },
    state: {
      columnFilters,
      globalFilter
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues()
  })

  // Auto-sort effect
  useEffect(() => {
    if (table.getState().columnFilters[0]?.id === 'fullName') {
      if (table.getState().sorting[0]?.id !== 'fullName') {
        table.setSorting([{ id: 'fullName', desc: false }])
      }
    }
  }, [table.getState().columnFilters[0]?.id])

  return (
    <div>
      <Grid container spacing={5}>
        <Grid size={{ xs: 3 }}>
          <Card color={'error'}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar
                  color={'error'}
                  //  skin='light'
                  variant='rounded'
                  size={40}
                >
                  {/* <i className={'avatarIcon'} /> */}
                  <Icon icon='ix:group' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{'10'}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'ทั้งหมด'}</Typography>
                {/* <div className='flex items-center gap-2'>
              <Typography variant='h6'>{`$%`}</Typography>
              <Typography color='text.disabled'>than last week</Typography>
            </div> */}
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card color={'success'} sx={{ xs: 3 }}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'success'} variant='rounded' size={40}>
                  {/* <i className={'avatarIcon'} /> */}
                  <Icon icon='material-symbols:connected-tv-outline' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{'1'}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'กำลังฉาย'}</Typography>
                {/* <div className='flex items-center gap-2'>
              <Typography variant='h6'>{`$%`}</Typography>
              <Typography color='text.disabled'>than last week</Typography>
            </div> */}
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card color={'warning'} sx={{ xs: 3 }}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'warning'} variant='rounded' size={40}>
                  {/* <i className={'avatarIcon'} /> */}
                  <Icon icon='mdi:timer-sand' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{'9'}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'ยังไม่เริ่ม'}</Typography>
                {/* <div className='flex items-center gap-2'>
              <Typography variant='h6'>{`$%`}</Typography>
              <Typography color='text.disabled'>than last week</Typography>
            </div> */}
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 3 }}>
          <Card color={'info'} sx={{ xs: 3 }}>
            <CardContent className='flex flex-col gap-2'>
              <div className='flex items-center gap-4'>
                <CustomAvatar color={'info'} variant='rounded' size={40}>
                  {/* <i className={'avatarIcon'} /> */}
                  <Icon icon='ph:calendar-x' color='white' width={22} />
                </CustomAvatar>
                <Typography variant='h4'>{'0'}</Typography>
              </div>
              <div className='flex flex-col gap-2'>
                <Typography>{'หมดอายุ'}</Typography>
                {/* <div className='flex items-center gap-2'>
              <Typography variant='h6'>{`$%`}</Typography>
              <Typography color='text.disabled'>than last week</Typography>
            </div> */}
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid sx={{ mt: 5 }}>
        <MuiCard>
          <CardHeader
            title='รายการกำหนดการ'
            // action={
            //   <DebouncedInput
            //     value={globalFilter ?? ''}
            //     onChange={value => setGlobalFilter(String(value))}
            //     placeholder='Search all columns...'
            //   />
            // }
          />
          <div>
            <Grid container spacing={0} sx={{ m: 5, mt: -5, display: 'flex', justifyContent: 'space-between' }}>
              <Grid size={{ xs: 2 }}>
                <CustomTextField
                  select
                  fullWidth
                  value={filterType}
                  onChange={e => {
                    const val = e.target.value
                    setFilterType(val)
                    // กรองข้อมูลใน table ด้วย (ถ้าจำเป็น)
                    if (val === '1') {
                      setData(defaultData) // ทั้งหมด
                    } else {
                      const keyword = val === '2' ? 'แนวนอน' : 'แนวตั้ง'
                      const filtered = defaultData.filter(item => item.direction?.style?.includes(keyword))
                      setData(filtered)
                    }
                  }}
                  label='รายการ'
                >
                  <MenuItem value='1'>ทั้งหมด</MenuItem>
                  <MenuItem value='2'>วิดีโอ แนวนอน</MenuItem>
                  <MenuItem value='3'>วิดีโอ แนวตั้ง</MenuItem>
                  <MenuItem value='4'>รูปภาพ</MenuItem>
                </CustomTextField>
              </Grid>
              <Grid size={{ xs: 1 }}>
                <CustomTextField
                  select
                  fullWidth
                  value={String(rowsPerPage)}
                  onChange={e => {
                    const rows = parseInt(e.target.value)
                    setRowsPerPage(rows)
                    table.setPageSize(rows) // เปลี่ยนจำนวนแถวใน react-table
                  }}
                  label='Row'
                >
                  <MenuItem value='10'>10</MenuItem>
                  <MenuItem value='25'>25</MenuItem>
                  <MenuItem value='50'>50</MenuItem>
                  <MenuItem value='100'>100</MenuItem>
                </CustomTextField>
              </Grid>
            </Grid>
          </div>
          <div className='overflow-x-auto '>
            <table className={styles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      return (
                        <th key={header.id}>
                          {header.isPlaceholder ? null : (
                            <>
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
                              {/* {header.column.getCanFilter() && <Filter column={header.column} table={table} />} */}
                            </>
                          )}
                        </th>
                      )
                    })}
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
                  {table.getRowModel().rows.map(row => {
                    return (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => {
                          return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              )}
            </table>
          </div>
          <TablePagination
            component={() => <TablePaginationComponent table={table} />}
            count={table.getFilteredRowModel().rows.length}
            rowsPerPage={table.getState().pagination.pageSize}
            page={table.getState().pagination.pageIndex}
            onPageChange={(_, page) => {
              table.setPageIndex(page)
            }}
          />
        </MuiCard>
      </Grid>
      <Dialog open={openPreviewDialog} onClose={() => setOpenPreviewDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='h6'>ดูรายละเอียดแคมเปญ</Typography>
            <IconButton onClick={() => setOpenPreviewDialog(false)}>
              <Icon icon='material-symbols:close' />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <StepPropertyFeatures
            activeStep={0}
            steps={[{ title: 'ดูข้อมูล', subtitle: '' }]}
            handleNext={() => {}}
            handlePrev={() => {}}
            isInternal={false} // <-- default true
          />
        </DialogContent>
      </Dialog>
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' justifyContent='space-between'>
            <Typography variant='h6'>แก้ไข</Typography>
            <IconButton onClick={() => setPreviewDialogOpen(false)}>
              <Icon icon='material-symbols:close' />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <StepPropertyDetails
            activeStep={0}
            steps={[{ title: 'ดูข้อมูล', subtitle: '' }]}
            handleNext={() => {}}
            handlePrev={() => {}}
            isInternalEdit={false} // <-- default true
          />
          <Button>Edit</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DataTable
