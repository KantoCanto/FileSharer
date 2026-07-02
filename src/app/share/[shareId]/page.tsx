import { PublicShareClient } from '@/components/PublicShareClient'

export default async function SharePage({
  params
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params
  return <PublicShareClient shareId={shareId} />
}
