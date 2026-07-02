import { jsonError, requireAdmin } from '@/lib/auth'
import { adminPurgeConfirmationText } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { purgeUploadsPrefix } from '@/lib/storage'
import { FileStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ confirmation: z.string() })

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    const { confirmation } = schema.parse(await request.json())

    if (confirmation !== adminPurgeConfirmationText) {
      return Response.json({ error: 'Confirmation text does not match.' }, { status: 400 })
    }

    const deletedObjects = await purgeUploadsPrefix()
    const updated = await prisma.file.updateMany({
      where: {
        status: { not: FileStatus.DELETED },
        deletedAt: null
      },
      data: {
        status: FileStatus.DELETED,
        deletedAt: new Date()
      }
    })

    await prisma.adminAction.create({
      data: {
        adminId: admin.id,
        action: 'PURGE_STORAGE',
        details: { deletedObjects, updatedFiles: updated.count }
      }
    })

    return Response.json({
      ok: true,
      deletedObjects,
      updatedFiles: updated.count
    })
  } catch (error) {
    return jsonError(error)
  }
}
