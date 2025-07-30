import React from 'react'
import PropertyListing from '@views/pages/wizard-examples/property-listing'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Add TV'
  // description: 'Login to your account'
}
function Page() {
  return (
    <div>
      <PropertyListing />
    </div>
  )
}

export default Page
