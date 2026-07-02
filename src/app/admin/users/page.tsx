import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-moss">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Users</h1>
      </div>
      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-ink/70">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-line" key={user.id}>
                <td className="px-4 py-3 font-medium">{user.email}</td>
                <td className="px-4 py-3">{user.role.toLowerCase()}</td>
                <td className="px-4 py-3">{user.status.toLowerCase()}</td>
                <td className="px-4 py-3">{user.createdAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
