'use client'

import { formatBytes } from '@/lib/format'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export type FileListItem = {
  id: string
  originalName: string
  relativePath: string | null
  sizeBytes: number
  status: string
  createdAt: string
  expiresAt: string
  ownerEmail: string
}

export function FileTable({ files }: { files: FileListItem[] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sharePassword, setSharePassword] = useState('')
  const [shareUrl, setShareUrl] = useState('')

  async function download(fileId: string) {
    setMessage('')
    const response = await fetch('/api/files/download-url', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileId })
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error ?? 'Could not create download URL.')
      return
    }
    window.location.assign(payload.downloadUrl)
  }

  async function remove(fileId: string) {
    setMessage('')
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileId })
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error ?? 'Could not delete file.')
      return
    }
    router.refresh()
  }

  async function createShare() {
    setMessage('')
    setShareUrl('')
    const response = await fetch('/api/shares/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileIds: selectedIds,
        password: sharePassword,
        title: `${selectedIds.length} shared item${selectedIds.length === 1 ? '' : 's'}`
      })
    })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.error ?? 'Could not create share link.')
      return
    }
    setShareUrl(payload.url)
    setSharePassword('')
  }

  function toggleSelected(fileId: string) {
    setSelectedIds((current) =>
      current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]
    )
  }

  return (
    <div className="surface overflow-hidden rounded-lg">
      {message ? <p className="border-b border-line px-4 py-3 text-sm text-rust">{message}</p> : null}
      <div className="border-b border-line bg-sky/35 px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block font-medium">Share password</span>
            <input
              className="focus-ring mt-1 rounded-md border border-line bg-white/80 px-3 py-2"
              type="password"
              value={sharePassword}
              onChange={(event) => setSharePassword(event.target.value)}
              placeholder="Minimum 8 characters"
            />
          </label>
          <button
            className="focus-ring primary-action rounded-md px-4 py-2 disabled:cursor-not-allowed disabled:bg-ink/40"
            disabled={selectedIds.length === 0 || sharePassword.length < 8}
            onClick={createShare}
          >
            Create share link
          </button>
          {shareUrl ? (
            <input
              className="focus-ring min-w-[280px] flex-1 rounded-md border border-line bg-white/80 px-3 py-2 text-sm"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
            />
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-peach/45 text-ink/70">
            <tr>
              <th className="px-4 py-3 font-medium">Share</th>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr className="border-b border-line last:border-0" key={file.id}>
                <td className="px-4 py-3">
                  <input
                    aria-label={`Select ${file.originalName} for sharing`}
                    checked={selectedIds.includes(file.id)}
                    disabled={file.status !== 'AVAILABLE'}
                    type="checkbox"
                    onChange={() => toggleSelected(file.id)}
                  />
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <p className="truncate font-medium">{file.originalName}</p>
                  {file.relativePath ? (
                    <p className="truncate text-xs text-ink/50">{file.relativePath}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-ink/70">{file.ownerEmail}</td>
                <td className="px-4 py-3">{formatBytes(file.sizeBytes)}</td>
                <td className="px-4 py-3">{file.status.toLowerCase()}</td>
                <td className="px-4 py-3">{new Date(file.expiresAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="focus-ring secondary-action rounded-md px-3 py-1 disabled:opacity-50"
                      disabled={file.status !== 'AVAILABLE'}
                      onClick={() => download(file.id)}
                    >
                      Download
                    </button>
                    <button
                      className="focus-ring secondary-action rounded-md px-3 py-1 text-rust"
                      onClick={() => remove(file.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {files.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-ink/60" colSpan={7}>
                  No files found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
