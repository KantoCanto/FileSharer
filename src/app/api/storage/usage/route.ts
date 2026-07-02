import { getCurrentAppUser, jsonError } from '@/lib/auth'
import { limits } from '@/lib/config'
import { activeStorageBytes, markExpiredFiles } from '@/lib/files'

export async function GET() {
  try {
    await getCurrentAppUser()
    await markExpiredFiles()
    const usage = await activeStorageBytes()

    return Response.json({
      usedBytes: usage.bytes,
      activeFileCount: usage.count,
      maxBytes: limits.maxTotalActiveStorageBytes,
      softLimitBytes: limits.softStorageLimitBytes,
      maxFileSizeBytes: limits.maxFileSizeBytes,
      retentionDays: limits.retentionDays
    })
  } catch (error) {
    return jsonError(error)
  }
}
