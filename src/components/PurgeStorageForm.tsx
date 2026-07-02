'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function PurgeStorageForm({ confirmationText }: { confirmationText: string }) {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function purge() {
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/purge-storage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation })
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error ?? 'Purge failed.')
    } else {
      setMessage(`Deleted ${payload.deletedObjects} objects and updated ${payload.updatedFiles} file rows.`)
      setConfirmation('')
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <section className="rounded-lg border border-rust bg-white p-5">
      <h2 className="text-xl font-semibold">Purge all storage</h2>
      <p className="mt-2 text-sm leading-6 text-ink/70">
        This deletes every object under uploads/ in Oracle Object Storage and marks every active file row as deleted.
      </p>
      <label className="mt-5 block text-sm font-medium">
        Confirmation
        <input
          className="focus-ring mt-2 w-full rounded-md border border-line bg-paper p-3"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={confirmationText}
        />
      </label>
      <button
        className="focus-ring mt-4 rounded-md bg-rust px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-rust/40"
        disabled={busy || confirmation !== confirmationText}
        onClick={purge}
      >
        Purge all files
      </button>
      {message ? <p className="mt-3 text-sm text-ink/70">{message}</p> : null}
    </section>
  )
}
