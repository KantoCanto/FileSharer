import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'FileSharer',
  description: 'Private temporary file transfer for trusted users'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="sticky top-0 z-10 border-b border-line bg-white/75 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <Link href="/dashboard" className="text-lg font-semibold tracking-normal text-ink">
                FileSharer
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link href="/upload" className="rounded-md px-2 py-1 hover:bg-mint/60 hover:text-moss">
                  Upload
                </Link>
                <Link href="/files" className="rounded-md px-2 py-1 hover:bg-sky/60 hover:text-moss">
                  Files
                </Link>
                <Link href="/admin/storage" className="rounded-md px-2 py-1 hover:bg-lilac/60 hover:text-moss">
                  Admin
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  )
}
