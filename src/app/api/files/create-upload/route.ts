import { getCurrentAppUser, jsonError } from '@/lib/auth'
import { limits } from '@/lib/config'
import {
  activeStorageBytes,
  assertUploadAllowed,
  expiryFromNow,
  markExpiredFiles,
  sanitizeFilename
} from '@/lib/files'
import { prisma } from '@/lib/prisma'
import { createUploadUrl } from '@/lib/storage'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  filename: z.string().min(1).max(255),
  relativePath: z.string().max(1000).optional().nullable(),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().max(200).optional().nullable()
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser()
    await markExpiredFiles()

    const body = schema.parse(await request.json())
    assertUploadAllowed(body.filename, body.sizeBytes)

    const usage = await activeStorageBytes()
    if (usage.bytes + body.sizeBytes > limits.maxTotalActiveStorageBytes) {
      throw new Error('Storage limit reached. Ask the admin to delete files or purge storage.')
    }

    const safeName = sanitizeFilename(body.filename)
    const file = await prisma.file.create({
      data: {
        ownerId: user.id,
        originalName: body.filename,
        relativePath: body.relativePath || null,
        safeName,
        storageKey: `pending/${crypto.randomUUID()}`,
        sizeBytes: BigInt(body.sizeBytes),
        mimeType: body.mimeType || null,
        expiresAt: expiryFromNow()
      }
    })

    const storageKey = `uploads/${user.id}/${file.id}/${safeName}`
    await prisma.file.update({
      where: { id: file.id },
      data: { storageKey }
    })

    const uploadUrl = await createUploadUrl({
      key: storageKey,
      sizeBytes: body.sizeBytes,
      mimeType: body.mimeType
    })

    return Response.json({
      fileId: file.id,
      uploadUrl,
      storageKey,
      expiresAt: file.expiresAt.toISOString()
    })
  } catch (error) {
    return jsonError(error)
  }
}
