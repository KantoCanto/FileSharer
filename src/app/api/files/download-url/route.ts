import { canAccessFile, getCurrentAppUser, HttpError, jsonError } from '@/lib/auth'
import { limits } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { createDownloadUrl } from '@/lib/storage'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ fileId: z.string().min(1) })

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    const { fileId } = schema.parse(await request.json())
    const file = await prisma.file.findUnique({ where: { id: fileId } })

    if (!file || !canAccessFile(user, file.ownerId)) throw new HttpError('File not found.', 404)
    if (file.status !== FileStatus.AVAILABLE || file.expiresAt <= new Date()) {
      throw new HttpError('File is not available.', 410)
    }

    const downloadUrl = await createDownloadUrl(file.storageKey, file.safeName)
    await prisma.download.create({ data: { fileId: file.id, userId: user.id } })

    return Response.json({
      downloadUrl,
      expiresInSeconds: limits.signedUrlTtlSeconds
    })
  } catch (error) {
    return jsonError(error)
  }
}
