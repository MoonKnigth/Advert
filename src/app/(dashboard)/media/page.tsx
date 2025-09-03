import type { Metadata } from 'next'

import MediaPageClient from '../../../views/pages/media/media'

export const metadata: Metadata = {
  title: 'Media'

  // description: 'Media',
}

export default function Page() {
  return <MediaPageClient />
}
