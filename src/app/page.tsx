import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function HomePage() {
  const { userId } = await auth()

  return (
    <section className="grid min-h-[70vh] content-center gap-8">
      <div className="max-w-3xl">
        <p className="mb-3 text-sm font-medium uppercase text-moss">Private transfer</p>
        <h1 className="text-5xl font-semibold tracking-normal text-ink sm:text-6xl">FileSharer</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
          Temporary direct-to-object-storage uploads for a small trusted group, with a hard 15 GB active
          storage cap and seven-day retention.
        </p>
      </div>
      <div className="flex gap-3">
        {userId ? (
          <Link className="focus-ring primary-action rounded-md px-4 py-2" href="/dashboard">
            Open dashboard
          </Link>
        ) : (
          <Link className="focus-ring primary-action rounded-md px-4 py-2" href="/sign-in">
            Sign in
          </Link>
        )}
      </div>
    </section>
  )
}
