import { canAccessFile, getCurrentAppUser, HttpError, jsonError } from '@/lib/auth'
import { appUrl, limits } from '@/lib/config'
import { markExpiredFiles } from '@/lib/files'
import { hashPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(160).optional(),
  password: z.string().min(8).max(200),
  fileIds: z.array(z.string().min(1)).min(1).max(200)
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    await markExpiredFiles()
    const body = schema.parse(await request.json())

    const files = await prisma.file.findMany({
      where: {
        id: { in: body.fileIds },
        status: FileStatus.AVAILABLE,
        deletedAt: null,
        expiresAt: { gt: new Date() }
      }
    })

    if (files.length !== new Set(body.fileIds).size) {
      throw new HttpError('One or more files are not available.', 400)
    }

    if (files.some((file) => !canAccessFile(user, file.ownerId))) {
      throw new HttpError('You cannot share one or more selected files.', 403)
    }

    const earliestExpiry = files.reduce(
      (earliest, file) => (file.expiresAt < earliest ? file.expiresAt : earliest),
      files[0].expiresAt
    )
    const maxShareExpiry = new Date(Date.now() + limits.retentionDays * 24 * 60 * 60 * 1000)

    const share = await prisma.share.create({
      data: {
        ownerId: user.id,
        title: body.title?.trim() || `${files.length} shared file${files.length === 1 ? '' : 's'}`,
        passwordHash: await hashPassword(body.password),
        expiresAt: earliestExpiry < maxShareExpiry ? earliestExpiry : maxShareExpiry,
        files: {
          create: files.map((file) => ({ fileId: file.id }))
        }
      }
    })

    return Response.json({
      id: share.id,
      url: `${appUrl}/share/${share.id}`,
      expiresAt: share.expiresAt.toISOString()
    })
  } catch (error) {
    return jsonError(error)
  }
}
