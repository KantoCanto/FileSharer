import { canAccessFile, getCurrentAppUser, HttpError, jsonError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteObject } from '@/lib/storage'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ fileId: z.string().min(1) })

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    const { fileId } = schema.parse(await request.json())
    const file = await prisma.file.findUnique({ where: { id: fileId } })

    if (!file || !canAccessFile(user, file.ownerId)) throw new HttpError('File not found.', 404)

    if (file.status !== FileStatus.DELETED) {
      await deleteObject(file.storageKey).catch(() => undefined)
    }

    await prisma.file.update({
      where: { id: file.id },
      data: { status: FileStatus.DELETED, deletedAt: new Date() }
    })

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
