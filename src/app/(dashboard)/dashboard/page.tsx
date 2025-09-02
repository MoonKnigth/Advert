import React from 'react'

import type { Metadata } from 'next'
import Typography from '@mui/material/Typography'

export const metadata: Metadata = {
  title: 'Dashboard'

  // description: 'Login to your account'
}

function Page() {
  return (
    <div>
      <Typography variant='h2' color='initial'>
        Dashboard
      </Typography>
    </div>
  )
}

export default Page
