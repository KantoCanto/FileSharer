import { HttpError, jsonError } from '@/lib/auth'
import { limits } from '@/lib/config'
import { verifyPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { createDownloadUrl } from '@/lib/storage'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(1),
  fileId: z.string().min(1)
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params
    const { password, fileId } = schema.parse(await request.json())
    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        files: {
          where: { fileId },
          include: { file: true }
        }
      }
    })

    if (!share || share.revokedAt || share.expiresAt <= new Date()) {
      throw new HttpError('Share link is not available.', 404)
    }

    if (!(await verifyPassword(password, share.passwordHash))) {
      throw new HttpError('Invalid password.', 403)
    }

    const file = share.files[0]?.file
    if (
      !file ||
      file.status !== FileStatus.AVAILABLE ||
      file.deletedAt ||
      file.expiresAt <= new Date()
    ) {
      throw new HttpError('File is not available.', 404)
    }

    const downloadUrl = await createDownloadUrl(file.storageKey, file.safeName)
    await prisma.download.create({ data: { fileId: file.id, userId: null } })

    return Response.json({ downloadUrl, expiresInSeconds: limits.signedUrlTtlSeconds })
  } catch (error) {
    return jsonError(error)
  }
}
