'use client'
import React from 'react'

import { Box, Typography } from '@mui/material'

function index() {
  return (
    <>
      <Typography variant='h4' sx={{ pb: 5, pl: 2, fontWeight: 600, color: 'text.primary' }}>
        กำหนดการโฆษณา Advertising schedule
      </Typography>

      <Box sx={{ p: 2 }}>
        <Typography variant='h6' sx={{ fontWeight: 600, color: 'text.primary' }}>
          รายการโฆษณา Advertising List
        </Typography>
      </Box>
    </>
  )
}

export default index
