import { canAccessFile, getCurrentAppUser, jsonError } from '@/lib/auth'
import { displayFirstName } from '@/lib/display'
import { markExpiredFiles } from '@/lib/files'
import { prisma } from '@/lib/prisma'
import { FileStatus, Role } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const user = await getCurrentAppUser()
    await markExpiredFiles()

    const url = new URL(request.url)
    const scope = url.searchParams.get('scope')
    const where =
      user.role === Role.ADMIN && scope === 'all'
        ? { deletedAt: null, status: { not: FileStatus.DELETED } }
        : { ownerId: user.id, deletedAt: null, status: { not: FileStatus.DELETED } }

    const files = await prisma.file.findMany({
      where,
      include: { owner: { select: { email: true, firstName: true } } },
      orderBy: { createdAt: 'desc' }
    })

    return Response.json({
      files: files
        .filter((file) => canAccessFile(user, file.ownerId))
        .map((file) => ({
          id: file.id,
          originalName: file.originalName,
          relativePath: file.relativePath,
          sizeBytes: Number(file.sizeBytes),
          status: file.status,
          createdAt: file.createdAt.toISOString(),
          uploadedAt: file.uploadedAt?.toISOString() ?? null,
          expiresAt: file.expiresAt.toISOString(),
          ownerName: displayFirstName(file.owner)
        }))
    })
  } catch (error) {
    return jsonError(error)
  }
}
