import { canAccessFile, getCurrentAppUser, HttpError, jsonError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headObject } from '@/lib/storage'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ fileId: z.string().min(1) })

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    const { fileId } = schema.parse(await request.json())
    const file = await prisma.file.findUnique({ where: { id: fileId } })

    if (!file || !canAccessFile(user, file.ownerId)) throw new HttpError('File not found.', 404)
    if (file.status !== FileStatus.PENDING) throw new HttpError('File is not pending.', 409)

    const object = await headObject(file.storageKey)
    const objectSize = Number(object.ContentLength ?? -1)
    if (objectSize !== Number(file.sizeBytes)) {
      await prisma.file.update({ where: { id: file.id }, data: { status: FileStatus.FAILED } })
      throw new HttpError('Uploaded object size did not match the expected size.', 409)
    }

    const updated = await prisma.file.update({
      where: { id: file.id },
      data: { status: FileStatus.AVAILABLE, uploadedAt: new Date() }
    })

    return Response.json({
      id: updated.id,
      status: updated.status,
      uploadedAt: updated.uploadedAt?.toISOString()
    })
  } catch (error) {
    return jsonError(error)
  }
}
