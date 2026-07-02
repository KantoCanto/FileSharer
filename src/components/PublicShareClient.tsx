'use client'

import { formatBytes } from '@/lib/format'
import { useState } from 'react'

type SharedFile = {
  id: string
  originalName: string
  relativePath: string | null
  sizeBytes: number
  expiresAt: string
}

export function PublicShareClient({ shareId }: { shareId: string }) {
  const [password, setPassword] = useState('')
  const [files, setFiles] = useState<SharedFile[]>([])
  const [title, setTitle] = useState('Shared files')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  async function unlock() {
    setMessage('')
    const response = await fetch(`/api/shares/${shareId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error ?? 'Could not open share.')
      return
    }
    setFiles(payload.files)
    setTitle(payload.title)
    setExpiresAt(payload.expiresAt)
    setUnlocked(true)
  }

  async function download(fileId: string) {
    setMessage('')
    const response = await fetch(`/api/shares/${shareId}/download-url`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password, fileId })
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error ?? 'Could not create download URL.')
      return
    }
    window.location.assign(payload.downloadUrl)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-moss">Password protected</p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {expiresAt ? (
          <p className="mt-2 text-sm text-ink/60">Expires {new Date(expiresAt).toLocaleString()}</p>
        ) : null}
      </div>

      {!unlocked ? (
        <section className="surface rounded-lg p-5">
          <label className="block text-sm font-medium">
            Password
            <input
              className="focus-ring mt-2 w-full rounded-md border border-line bg-white/80 p-3"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void unlock()
              }}
            />
          </label>
          <button
            className="focus-ring primary-action mt-4 rounded-md px-4 py-2"
            onClick={unlock}
          >
            Open share
          </button>
        </section>
      ) : (
        <section className="surface overflow-hidden rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-lilac/45 text-ink/70">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr className="border-t border-line" key={file.id}>
                  <td className="max-w-[420px] px-4 py-3">
                    <p className="truncate font-medium">{file.originalName}</p>
                    {file.relativePath ? (
                      <p className="truncate text-xs text-ink/50">{file.relativePath}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{formatBytes(file.sizeBytes)}</td>
                  <td className="px-4 py-3">
                    <button
                      className="focus-ring secondary-action rounded-md px-3 py-1"
                      onClick={() => download(file.id)}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {files.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink/60" colSpan={3}>
                    No files are available in this share.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      )}

      {message ? <p className="text-sm text-rust">{message}</p> : null}
    </div>
  )
}
