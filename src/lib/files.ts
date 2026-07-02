import { FileStatus, Prisma } from '@prisma/client'
import { blockedExtensions, limits } from './config'
import { prisma } from './prisma'

export function activeFileWhere(): Prisma.FileWhereInput {
  return {
    status: { in: [FileStatus.PENDING, FileStatus.AVAILABLE] },
    deletedAt: null,
    expiresAt: { gt: new Date() }
  }
}

export function sanitizeFilename(filename: string) {
  const fallback = 'upload.bin'
  const leaf = filename.split(/[\\/]/).pop() ?? fallback
  const cleaned = leaf
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 160)

  return cleaned || fallback
}

export function getExtension(filename: string) {
  const index = filename.lastIndexOf('.')
  return index === -1 ? '' : filename.slice(index).toLowerCase()
}

export function assertUploadAllowed(filename: string, sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error('File size must be greater than zero.')
  }

  if (sizeBytes > limits.maxFileSizeBytes) {
    throw new Error('File is too large.')
  }

  if (blockedExtensions.has(getExtension(filename))) {
    throw new Error('This file type is blocked.')
  }
}

export function expiryFromNow() {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + limits.retentionDays)
  return expiresAt
}

export async function markExpiredFiles() {
  const now = new Date()

  await prisma.file.updateMany({
    where: {
      status: FileStatus.AVAILABLE,
      deletedAt: null,
      expiresAt: { lte: now }
    },
    data: { status: FileStatus.EXPIRED }
  })

  const stalePendingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  await prisma.file.updateMany({
    where: {
      status: FileStatus.PENDING,
      createdAt: { lte: stalePendingCutoff }
    },
    data: { status: FileStatus.FAILED }
  })
}

export async function activeStorageBytes() {
  const result = await prisma.file.aggregate({
    where: activeFileWhere(),
    _sum: { sizeBytes: true },
    _count: true
  })

  return {
    bytes: Number(result._sum.sizeBytes ?? 0),
    count: result._count
  }
}

export async function perUserUsage() {
  const grouped = await prisma.file.groupBy({
    by: ['ownerId'],
    where: activeFileWhere(),
    _sum: { sizeBytes: true },
    _count: true
  })

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((row) => row.ownerId) } },
    select: { id: true, email: true, role: true, status: true }
  })

  const userById = new Map(users.map((user) => [user.id, user]))

  return grouped.map((row) => ({
    ownerId: row.ownerId,
    ownerEmail: userById.get(row.ownerId)?.email ?? 'Unknown',
    role: userById.get(row.ownerId)?.role ?? 'USER',
    status: userById.get(row.ownerId)?.status ?? 'ACTIVE',
    fileCount: row._count,
    sizeBytes: Number(row._sum.sizeBytes ?? 0)
  }))
}
