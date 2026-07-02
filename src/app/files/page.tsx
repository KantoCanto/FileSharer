import { FileListItem, FileTable } from '@/components/FileTable'
import { getCurrentAppUser } from '@/lib/auth'
import { markExpiredFiles } from '@/lib/files'
import { prisma } from '@/lib/prisma'
import { FileStatus, Role } from '@prisma/client'

export default async function FilesPage({
  searchParams
}: {
  searchParams: { scope?: string }
}) {
  const user = await getCurrentAppUser()
  await markExpiredFiles()

  const scope = user.role === Role.ADMIN && searchParams.scope === 'all' ? 'all' : 'mine'
  const files = await prisma.file.findMany({
    where:
      scope === 'all'
        ? { deletedAt: null, status: { not: FileStatus.DELETED } }
        : { ownerId: user.id, deletedAt: null, status: { not: FileStatus.DELETED } },
    include: { owner: { select: { email: true } } },
    orderBy: { createdAt: 'desc' }
  })

  const rows: FileListItem[] = files.map((file) => ({
    id: file.id,
    originalName: file.originalName,
    relativePath: file.relativePath,
    sizeBytes: Number(file.sizeBytes),
    status: file.status,
    createdAt: file.createdAt.toISOString(),
    expiresAt: file.expiresAt.toISOString(),
    ownerEmail: file.owner.email
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Files</h1>
          <p className="mt-2 text-sm text-ink/70">
            {scope === 'all' ? 'All active files.' : 'Your active files.'}
          </p>
        </div>
        {user.role === Role.ADMIN ? (
          <div className="flex gap-2 text-sm">
            <a
              className="focus-ring rounded-md border border-line bg-white px-3 py-2"
              href="/files"
            >
              Mine
            </a>
            <a
              className="focus-ring rounded-md border border-line bg-white px-3 py-2"
              href="/files?scope=all"
            >
              All
            </a>
          </div>
        ) : null}
      </div>
      <FileTable files={rows} />
    </div>
  )
}
