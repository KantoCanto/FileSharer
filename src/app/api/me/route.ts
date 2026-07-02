import { getCurrentAppUser, jsonError } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentAppUser()
    return Response.json({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    })
  } catch (error) {
    return jsonError(error)
  }
}
