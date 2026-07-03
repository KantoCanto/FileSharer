const gib = 1024 * 1024 * 1024

function numberEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const limits = {
  maxTotalActiveStorageBytes: numberEnv('MAX_TOTAL_ACTIVE_STORAGE_BYTES', 15 * gib),
  softStorageLimitBytes: numberEnv('SOFT_STORAGE_LIMIT_BYTES', 14 * gib),
  maxFileSizeBytes: numberEnv('MAX_FILE_SIZE_BYTES', 10 * gib),
  retentionDays: numberEnv('RETENTION_DAYS', 7),
  signedUrlTtlSeconds: numberEnv('SIGNED_URL_TTL_SECONDS', 900)
}

export const adminPurgeConfirmationText =
  process.env.ADMIN_PURGE_CONFIRMATION_TEXT ?? 'PURGE ALL FILES'

export const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()

export const allowedEmails = new Set(
  (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
)

export const blockedExtensions = new Set([
  '.exe',
  '.scr',
  '.bat',
  '.cmd',
  '.ps1',
  '.vbs',
  '.msi',
  '.jar'
])
