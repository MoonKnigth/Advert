'use client'

// Third-party Imports
import classnames from 'classnames'
import Cookies from 'js-cookie'
import { Icon } from '@iconify/react'
import React, { useEffect, useState } from 'react'

// Component Imports
import NavToggle from './NavToggle'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// MUI Imports
import { Box, Typography } from '@mui/material'
import { styled, useTheme } from '@mui/material/styles'
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress'

/* ----------------------------------------------------------------------------
 * StorageProgress (แถบสถานะแบบ Linear ที่แปลง GB -> % และเปลี่ยนสีตาม usage)
 * --------------------------------------------------------------------------*/

// prop สำหรับ styled เพื่อส่งสีเข้าไป (ไม่ส่งต่อไปยัง DOM)
interface BorderLPProps {
  barcolor: string
}

const BorderLinearProgress = styled(LinearProgress, {
  shouldForwardProp: prop => prop !== 'barcolor'
})<BorderLPProps>(({ barcolor }) => ({
  height: 10,
  borderRadius: 5,
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: barcolor
  }
}))

const chooseColor = (pct: number, theme: any) => {
  if (pct <= 70) return theme.palette.success.main
  if (pct <= 90) return theme.palette.warning.main
  return theme.palette.error.main
}

type StorageProgressProps = {
  usedGB: number
  maxGB: number
}

const StorageProgress: React.FC<StorageProgressProps> = ({ usedGB, maxGB }) => {
  const theme = useTheme()
  const pct = maxGB > 0 ? (usedGB / maxGB) * 100 : 0
  const value = Math.max(0, Math.min(100, pct))
  const barColor = chooseColor(value, theme)

  return (
    <Box sx={{ minWidth: 200 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 0.75 }}>
        <Typography variant='h6' sx={{ fontWeight: 700, mr: 1 }}>
          {usedGB.toFixed(2)} / {maxGB.toFixed(0)} GB
        </Typography>
        <Typography variant='body2' sx={{ ml: 'auto', color: barColor, fontWeight: 700 }}>
          {value.toFixed(0)}%
        </Typography>
      </Box>

      <BorderLinearProgress aria-label='storage-usage' variant='determinate' value={value} barcolor={barColor} />
    </Box>
  )
}

/* ----------------------------------------------------------------------------
 * NavbarContent (รวมไอคอน, โหมด, ผู้ใช้, และ StorageProgress)
 * --------------------------------------------------------------------------*/

const NavbarContent = () => {
  const [usedByteInGB, setUsedByteInGB] = useState<number>(0)
  const [maxStorage, setMaxStorage] = useState<number>(0)

  const fetchStorageUsage = async () => {
    try {
      const response = await fetch('/api/proxy/storage-usage', {
        headers: {
          Authorization: `Bearer ${Cookies.get('accessToken') || ''}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch storage usage:', errorText)
        return
      }

      const data = await response.json()
      setUsedByteInGB((data?.data?.used_byte ?? 0) / (1000 * 1000 * 1000))
      // setUsedByteInGB(91)
      setMaxStorage((data?.data?.max_storage ?? 0) / (1000 * 1000 * 1000))
    } catch (error) {
      console.error('Error fetching storage usage:', error)
    }
  }

  useEffect(() => {
    fetchStorageUsage()
  }, [])

  // คำนวณ % เพื่อเปลี่ยนสีของไอคอน (ใช้ theme palette สีเดียวกับ progress)
  const pct = maxStorage > 0 ? (usedByteInGB / maxStorage) * 100 : 0
  const usageColorToken = pct <= 70 ? 'success.main' : pct <= 90 ? 'warning.main' : 'error.main'

  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-4'>
        <NavToggle />
        <ModeDropdown />
      </div>

      <div className='flex items-center gap-4'>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Icon icon='qlementine-icons:drive-16' width={22} style={{ color: 'currentColor', marginRight: 8 }} />
          <StorageProgress usedGB={usedByteInGB} maxGB={maxStorage} />
        </Box>

        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
