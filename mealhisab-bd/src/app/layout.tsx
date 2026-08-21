import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'MealHisab BD', template: '%s | MealHisab BD' },
  description: 'Simple, fair meal accounting for Bangladeshi flats and messes.',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>
}
