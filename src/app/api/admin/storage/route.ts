import { jsonError, requireAdmin } from '@/lib/auth'
import { limits } from '@/lib/config'
import { activeStorageBytes, markExpiredFiles, perUserUsage } from '@/lib/files'

export async function GET() {
  try {
    await requireAdmin()
    await markExpiredFiles()
    const [usage, users] = await Promise.all([activeStorageBytes(), perUserUsage()])

    return Response.json({
      usedBytes: usage.bytes,
      activeFileCount: usage.count,
      maxBytes: limits.maxTotalActiveStorageBytes,
      softLimitBytes: limits.softStorageLimitBytes,
      perUserUsage: users
    })
  } catch (error) {
    return jsonError(error)
  }
}
