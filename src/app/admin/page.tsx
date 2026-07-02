import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  await requireAdmin()
  redirect('/admin/storage')
}
