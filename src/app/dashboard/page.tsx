import { getCurrentAppUser } from '@/lib/auth'
import { limits } from '@/lib/config'
import { activeStorageBytes, markExpiredFiles } from '@/lib/files'
import { formatBytes, percent } from '@/lib/format'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentAppUser()
  await markExpiredFiles()
  const usage = await activeStorageBytes()
  const usedPercent = percent(usage.bytes, limits.maxTotalActiveStorageBytes)

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-moss">{user.email}</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        </div>
        <UserButton />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Active storage</p>
          <p className="mt-2 text-2xl font-semibold">{formatBytes(usage.bytes)}</p>
          <div className="mt-4 h-2 rounded-full bg-line">
            <div className="h-2 rounded-full bg-moss" style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Storage cap</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatBytes(limits.maxTotalActiveStorageBytes)}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm text-ink/60">Your role</p>
          <p className="mt-2 text-2xl font-semibold">{user.role.toLowerCase()}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link className="focus-ring rounded-md bg-ink px-4 py-2 text-white" href="/upload">
          Upload file
        </Link>
        <Link className="focus-ring rounded-md border border-line bg-white px-4 py-2" href="/files">
          View files
        </Link>
        {user.role === 'ADMIN' ? (
          <Link
            className="focus-ring rounded-md border border-line bg-white px-4 py-2"
            href="/admin/storage"
          >
            Storage admin
          </Link>
        ) : null}
      </section>
    </div>
  )
}
