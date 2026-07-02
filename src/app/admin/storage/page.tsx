import { PurgeStorageForm } from '@/components/PurgeStorageForm'
import { requireAdmin } from '@/lib/auth'
import { adminPurgeConfirmationText, limits } from '@/lib/config'
import { activeStorageBytes, markExpiredFiles, perUserUsage } from '@/lib/files'
import { formatBytes, percent } from '@/lib/format'

export default async function AdminStoragePage() {
  await requireAdmin()
  await markExpiredFiles()
  const [usage, users] = await Promise.all([activeStorageBytes(), perUserUsage()])
  const usedPercent = percent(usage.bytes, limits.maxTotalActiveStorageBytes)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-moss">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Storage</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface rounded-lg bg-sky/35 p-5">
          <p className="text-sm text-ink/60">Active storage</p>
          <p className="mt-2 text-2xl font-semibold">{formatBytes(usage.bytes)}</p>
          <div className="mt-4 h-2 rounded-full bg-white/70">
            <div className="h-2 rounded-full bg-moss" style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
        <div className="surface rounded-lg bg-mint/35 p-5">
          <p className="text-sm text-ink/60">Free-tier cap</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatBytes(limits.maxTotalActiveStorageBytes)}
          </p>
        </div>
        <div className="surface rounded-lg bg-lilac/35 p-5">
          <p className="text-sm text-ink/60">Active files</p>
          <p className="mt-2 text-2xl font-semibold">{usage.count}</p>
        </div>
      </section>

      <section className="surface overflow-hidden rounded-lg">
        <div className="border-b border-line bg-peach/35 px-4 py-3">
          <h2 className="font-semibold">Per-user usage</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-peach/45 text-ink/70">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Files</th>
                <th className="px-4 py-3 font-medium">Storage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-t border-line" key={user.ownerId}>
                  <td className="px-4 py-3 font-medium">{user.ownerEmail}</td>
                  <td className="px-4 py-3">{user.role.toLowerCase()}</td>
                  <td className="px-4 py-3">{user.fileCount}</td>
                  <td className="px-4 py-3">{formatBytes(user.sizeBytes)}</td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink/60" colSpan={4}>
                    No active storage.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <PurgeStorageForm confirmationText={adminPurgeConfirmationText} />
    </div>
  )
}
