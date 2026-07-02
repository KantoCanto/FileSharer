import { jsonError, requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserStatus } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ userId: z.string().min(1) })

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { userId } = schema.parse(await request.json())
    await prisma.user.update({ where: { id: userId }, data: { status: UserStatus.DISABLED } })
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
