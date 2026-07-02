import { currentUser } from '@clerk/nextjs/server'
import { Role, UserStatus } from '@prisma/client'
import { adminEmail, allowedEmails } from './config'
import { prisma } from './prisma'

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message)
  }
}

export async function getCurrentAppUser() {
  const clerkUser = await currentUser()
  if (!clerkUser) throw new HttpError('Authentication required.', 401)

  const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase()
  if (!email) throw new HttpError('A primary email address is required.', 403)

  const isAdmin = Boolean(adminEmail && email === adminEmail)
  const isAllowed = isAdmin || allowedEmails.size === 0 || allowedEmails.has(email)
  if (!isAllowed) throw new HttpError('This email is not allowlisted.', 403)

  const user = await prisma.user.upsert({
    where: { clerkUserId: clerkUser.id },
    create: {
      clerkUserId: clerkUser.id,
      email,
      role: isAdmin ? Role.ADMIN : Role.USER,
      status: UserStatus.ACTIVE
    },
    update: {
      email,
      role: isAdmin ? Role.ADMIN : undefined
    }
  })

  if (user.status !== UserStatus.ACTIVE) {
    throw new HttpError('This account is disabled.', 403)
  }

  return user
}

export async function requireAdmin() {
  const user = await getCurrentAppUser()
  if (user.role !== Role.ADMIN) throw new HttpError('Admin access required.', 403)
  return user
}

export function canAccessFile(user: { id: string; role: Role }, ownerId: string) {
  return user.role === Role.ADMIN || user.id === ownerId
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status })
  }

  const message = error instanceof Error ? error.message : 'Unexpected error.'
  return Response.json({ error: message }, { status: 400 })
}
