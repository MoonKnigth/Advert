import React from 'react'

import type { Metadata } from 'next'

import DataTable from '@/views/pages/data/dataTable'

export const metadata: Metadata = {
  title: 'schedules'

  // description: 'Login to your account'
}

function Page() {
  return (
    <div>
      <DataTable></DataTable>
    </div>
  )
}

export default Page
