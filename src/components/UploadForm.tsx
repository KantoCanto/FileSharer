'use client'

import { formatBytes, percent } from '@/lib/format'
import { useMemo, useState } from 'react'

type Usage = {
  usedBytes: number
  maxBytes: number
  maxFileSizeBytes: number
  retentionDays: number
}

export function UploadForm({ usage }: { usage: Usage }) {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const remainingBytes = Math.max(0, usage.maxBytes - usage.usedBytes)
  const totalSelectedBytes = files.reduce((total, file) => total + file.size, 0)
  const selectedTooLarge = files.some((file) => file.size > usage.maxFileSizeBytes)
  const wouldExceedCap = totalSelectedBytes > remainingBytes
  const usedPercent = useMemo(() => percent(usage.usedBytes, usage.maxBytes), [usage])

  async function upload() {
    if (files.length === 0) return
    setBusy(true)
    setStatus('Preparing signed uploads')
    setProgress(0)

    try {
      let completedBytes = 0

      for (const [index, file] of files.entries()) {
        const relativePath = webkitRelativePath(file)
        setStatus(`Uploading ${index + 1} of ${files.length}: ${relativePath || file.name}`)

        const createResponse = await fetch('/api/files/create-upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            relativePath,
            sizeBytes: file.size,
            mimeType: file.type || null
          })
        })

        const createPayload = await createResponse.json()
        if (!createResponse.ok) throw new Error(createPayload.error ?? 'Could not create upload.')

        await new Promise<void>((resolve, reject) => {
          const request = new XMLHttpRequest()
          request.open('PUT', createPayload.uploadUrl)
          request.setRequestHeader('content-type', file.type || 'application/octet-stream')
          request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round(((completedBytes + event.loaded) / totalSelectedBytes) * 100))
            }
          }
          request.onload = () => {
            if (request.status >= 200 && request.status < 300) resolve()
            else reject(new Error(`Storage upload failed with status ${request.status}.`))
          }
          request.onerror = () => reject(new Error('Storage upload failed.'))
          request.send(file)
        })

        setStatus(`Verifying ${relativePath || file.name}`)
        const completeResponse = await fetch('/api/files/complete-upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fileId: createPayload.fileId })
        })
        const completePayload = await completeResponse.json()
        if (!completeResponse.ok) {
          throw new Error(completePayload.error ?? 'Could not complete upload.')
        }

        completedBytes += file.size
      }

      setProgress(100)
      setStatus(files.length === 1 ? 'Upload complete' : 'Folder upload complete')
      setFiles([])
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-lg border border-line bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium">Select files or folder</span>
          <input
            className="mt-3 block w-full rounded-md border border-line bg-paper p-3"
            type="file"
            multiple
            disabled={busy}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium">Select folder</span>
          <input
            className="mt-3 block w-full rounded-md border border-line bg-paper p-3"
            type="file"
            multiple
            // React does not type this Chromium directory-picker attribute.
            {...{ webkitdirectory: '', directory: '' }}
            disabled={busy}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </label>

        {files.length > 0 ? (
          <div className="mt-5 rounded-md border border-line bg-paper p-4">
            <p className="font-medium">
              {files.length} item{files.length === 1 ? '' : 's'} selected
            </p>
            <p className="mt-1 text-sm text-ink/60">{formatBytes(totalSelectedBytes)}</p>
            <ul className="mt-3 max-h-36 space-y-1 overflow-auto text-sm text-ink/70">
              {files.slice(0, 20).map((selected) => (
                <li className="truncate" key={`${webkitRelativePath(selected)}-${selected.name}`}>
                  {webkitRelativePath(selected) || selected.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 h-3 rounded-full bg-line">
          <div className="h-3 rounded-full bg-moss" style={{ width: `${progress}%` }} />
        </div>

        {status ? <p className="mt-3 text-sm text-ink/70">{status}</p> : null}

        <button
          className="focus-ring mt-5 rounded-md bg-ink px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-ink/40"
          disabled={files.length === 0 || busy || selectedTooLarge || wouldExceedCap}
          onClick={upload}
        >
          Upload
        </button>
      </section>

      <aside className="rounded-lg border border-line bg-white p-5">
        <p className="text-sm text-ink/60">Global storage used</p>
        <p className="mt-2 text-2xl font-semibold">{formatBytes(usage.usedBytes)}</p>
        <div className="mt-4 h-2 rounded-full bg-line">
          <div className="h-2 rounded-full bg-moss" style={{ width: `${usedPercent}%` }} />
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Remaining</dt>
            <dd>{formatBytes(remainingBytes)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Max file</dt>
            <dd>{formatBytes(usage.maxFileSizeBytes)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Retention</dt>
            <dd>{usage.retentionDays} days</dd>
          </div>
        </dl>
        {selectedTooLarge ? <p className="mt-4 text-sm text-rust">One selected file is too large.</p> : null}
        {wouldExceedCap ? <p className="mt-4 text-sm text-rust">Selection exceeds remaining storage.</p> : null}
      </aside>
    </div>
  )
}

function webkitRelativePath(file: File) {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || null
}
