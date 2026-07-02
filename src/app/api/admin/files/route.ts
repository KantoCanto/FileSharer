import { jsonError, requireAdmin } from '@/lib/auth'
import { markExpiredFiles } from '@/lib/files'
import { prisma } from '@/lib/prisma'
import { FileStatus } from '@prisma/client'

export async function GET() {
  try {
    await requireAdmin()
    await markExpiredFiles()

    const files = await prisma.file.findMany({
      where: { deletedAt: null, status: { not: FileStatus.DELETED } },
      include: { owner: { select: { email: true } } },
      orderBy: { createdAt: 'desc' }
    })

    return Response.json({
      files: files.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        relativePath: file.relativePath,
        sizeBytes: Number(file.sizeBytes),
        status: file.status,
        createdAt: file.createdAt.toISOString(),
        expiresAt: file.expiresAt.toISOString(),
        ownerEmail: file.owner.email
      }))
    })
  } catch (error) {
    return jsonError(error)
  }
}
