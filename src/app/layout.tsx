import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'منصة سمنان',
  description: 'منصة إدارة المشاريع — مجموعة سمنان القابضة',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-cairo min-h-screen bg-gray-50">
        {children}
        <Toaster
          position="top-center"
          richColors
          dir="rtl"
          toastOptions={{
            style: { fontFamily: 'Cairo, sans-serif' },
          }}
        />
      </body>
    </html>
  )
}
