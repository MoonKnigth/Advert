import DataTable from '@/views/pages/data/dataTable'
import React from 'react'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Dashboard'
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
