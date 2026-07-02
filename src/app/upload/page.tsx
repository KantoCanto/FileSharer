import { UploadForm } from '@/components/UploadForm'
import { getCurrentAppUser } from '@/lib/auth'
import { limits } from '@/lib/config'
import { activeStorageBytes, markExpiredFiles } from '@/lib/files'

export default async function UploadPage() {
  await getCurrentAppUser()
  await markExpiredFiles()
  const usage = await activeStorageBytes()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Upload</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
          Files are temporary and automatically expire after seven days. Uploads go directly to the
          private Oracle Object Storage bucket through a short-lived signed URL.
        </p>
      </div>
      <UploadForm
        usage={{
          usedBytes: usage.bytes,
          maxBytes: limits.maxTotalActiveStorageBytes,
          maxFileSizeBytes: limits.maxFileSizeBytes,
          retentionDays: limits.retentionDays
        }}
      />
    </div>
  )
}
