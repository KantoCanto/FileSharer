import { jsonError, HttpError } from '@/lib/auth'
import { markExpiredFiles } from '@/lib/files'
import { verifyPassword } from '@/lib/password'
import { prisma } from '@/lib/prisma'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ password: z.string().min(1) })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    await markExpiredFiles()
    const { shareId } = await params
    const { password } = schema.parse(await request.json())

    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: {
        files: {
          include: {
            file: {
              select: {
                id: true,
                originalName: true,
                relativePath: true,
                sizeBytes: true,
                status: true,
                expiresAt: true,
                deletedAt: true
              }
            }
          }
        }
      }
    })

    if (!share || share.revokedAt || share.expiresAt <= new Date()) {
      throw new HttpError('Share link is not available.', 404)
    }

    if (!(await verifyPassword(password, share.passwordHash))) {
      throw new HttpError('Invalid password.', 403)
    }

    return Response.json({
      title: share.title,
      expiresAt: share.expiresAt.toISOString(),
      files: share.files
        .map((entry) => entry.file)
        .filter(
          (file) =>
            file.status === FileStatus.AVAILABLE &&
            !file.deletedAt &&
            file.expiresAt > new Date()
        )
        .map((file) => ({
          id: file.id,
          originalName: file.originalName,
          relativePath: file.relativePath,
          sizeBytes: Number(file.sizeBytes),
          expiresAt: file.expiresAt.toISOString()
        }))
    })
  } catch (error) {
    return jsonError(error)
  }
}
