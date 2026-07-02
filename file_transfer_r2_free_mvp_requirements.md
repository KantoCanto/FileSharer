# File Transfer Platform — Simplified Free-Tier MVP Requirements

**Target reader:** IDE coding agent / implementation agent  
**Project type:** private, invite-only file-transfer web app  
**Default deployment:** Hostinger Business Web Hosting managed Node.js / Next.js app  
**Storage provider:** Cloudflare R2 Standard storage, capped at 10 GB  
**Auth provider:** Clerk  
**Database:** Hostinger managed MySQL, or another small managed SQL DB if easier  
**Primary goal:** allow a small group of trusted users to upload and download temporary files without exceeding the free R2 storage tier.

---

## 1. Product summary

Build a private file-transfer platform at:

```txt
https://files.<user-domain>
```

The app allows authenticated users to upload files, list their own uploaded files, download files, and delete their own files. The admin user can view all files and purge all current storage content.

The app must enforce a **hard 10 GB active-storage cap** so the project remains within the Cloudflare R2 free storage tier.

---

## 2. Updated storage decision

Oracle Cloud Object Storage is no longer the target because account creation is blocking progress.

Use **Cloudflare R2** instead.

Cloudflare R2 Standard storage currently provides:

- 10 GB-month / month free storage
- 1 million Class A operations / month free
- 10 million Class B operations / month free
- free internet egress
- S3-compatible API

Source references:

- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 product pricing summary: https://www.cloudflare.com/products/r2/
- Cloudflare R2 S3 API compatibility: https://developers.cloudflare.com/r2/api/s3/api/
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- Cloudflare R2 lifecycle rules: https://developers.cloudflare.com/r2/buckets/object-lifecycles/

Important billing constraint:

- Use **Standard storage only**.
- Do **not** use Infrequent Access storage for this MVP.
- The app must enforce a conservative quota below or equal to 10 GB.
- The app must block uploads when the quota would be exceeded.
- The admin purge action must allow the owner to quickly erase all stored objects.

---

## 3. Non-negotiable constraints

The implementation must follow these rules:

```txt
Total active stored files: <= 10 GB
Default file retention: 7 days
Bucket visibility: private
Anonymous uploads: disabled
Anonymous file listing: disabled
R2 credentials in browser: never
Large file body through Next.js server: avoid
Upload/download access: short-lived signed URLs
Roles: admin and user only
Admin can purge all stored content
```

Recommended initial file limits:

```txt
MAX_TOTAL_ACTIVE_STORAGE_BYTES=10737418240      # 10 GiB
SOFT_STORAGE_LIMIT_BYTES=9663676416             # 9 GiB, warning threshold
MAX_FILE_SIZE_BYTES=2147483648                  # 2 GiB recommended for first MVP
RETENTION_DAYS=7
SIGNED_URL_TTL_SECONDS=900                      # 15 minutes
```

Why 2 GB per file initially?

The old target of 5–15 GB per file does not fit well with a 10 GB total free cap. A 2 GB max file size gives the app useful capacity while leaving room for multiple files and users. The code should keep the file-size limit configurable so it can be raised later.

---

## 4. Architecture

Use one full-stack Next.js app.

```txt
Hostinger Business Web Hosting
└── Managed Next.js / Node.js app
    ├── React UI
    ├── Next.js App Router
    ├── Next.js Route Handlers
    ├── Clerk auth
    ├── MySQL metadata DB
    └── Cloudflare R2 S3-compatible client

Cloudflare R2
└── Private bucket
    ├── uploads/<userId>/<fileId>/<safeFilename>
    └── lifecycle cleanup after 7 days
```

File transfer path:

```txt
Browser  -- signed PUT/GET URL -->  Cloudflare R2
Next.js  -- auth + DB + signing -->  Cloudflare R2
```

The backend should not stream large file bodies except for small test/fallback endpoints. The normal upload flow must use signed URLs so the browser sends files directly to R2.

---

## 5. Hosting target

Use Hostinger managed web-app hosting if available on the current Business Web Hosting plan.

Hostinger currently documents managed Node.js web-app deployment for Business and Cloud hosting plans, including JavaScript frameworks and automatic builds.

Sources:

- Hostinger Node.js web app deployment: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- Hostinger Web Apps Hosting: https://www.hostinger.com/web-apps-hosting

Do not require VPS, Docker, Caddy, Nginx, Redis, or a background worker for this MVP.

A VPS is only an upgrade path if the project later needs:

- long-running workers
- Docker
- root access
- malware scanning
- custom server packages
- heavier processing
- more control over cron jobs

---

## 6. Technology stack

Use:

```txt
Next.js App Router
React
TypeScript
Clerk
Hostinger managed MySQL
Prisma or Drizzle ORM
Cloudflare R2
AWS SDK v3 S3 client
Tailwind CSS or simple CSS modules
```

Preferred packages:

```bash
npm install @clerk/nextjs
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install zod
npm install prisma @prisma/client
```

If using Drizzle instead of Prisma, adapt schema accordingly. Prisma is acceptable for an IDE agent and provides clear schema generation.

---

## 7. Authentication and authorization

Use Clerk for authentication.

Clerk docs:

- Next.js middleware: https://clerk.com/docs/reference/nextjs/clerk-middleware
- Basic RBAC with Clerk public metadata: https://clerk.com/docs/guides/secure/basic-rbac

Use a two-role model only:

```ts
role: 'admin' | 'user'
```

### Role rules

Admin:

- Can upload files.
- Can list all files.
- Can download any file.
- Can delete any file.
- Can purge all current storage content.
- Can see total active storage usage.
- Can see per-user usage.

User:

- Can upload files if global and personal quota allow it.
- Can list own files.
- Can download own files.
- Can delete own files.
- Cannot purge storage.
- Cannot see other users' files.

### Role storage

Preferred MVP approach:

- Store user roles in the local DB.
- On first login, create a `User` row from Clerk identity.
- The initial admin email is set in environment variable `ADMIN_EMAIL`.
- If the user's primary email equals `ADMIN_EMAIL`, assign role `admin`.
- All other users default to role `user` or `pending`, depending on whether invite-only mode is enabled.

Recommended status model:

```ts
status: 'active' | 'disabled'
```

Optional stricter mode:

```ts
status: 'pending' | 'active' | 'disabled'
```

For the simplest MVP, use `active` / `disabled` and a static allowlist.

---

## 8. Environment variables

Required `.env` values:

```env
APP_URL=https://files.example.com

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
ADMIN_EMAIL=owner@example.com
ALLOWED_EMAILS=owner@example.com,friend1@example.com,friend2@example.com

# Database
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=file-transfer
R2_ENDPOINT=https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=

# Limits
MAX_TOTAL_ACTIVE_STORAGE_BYTES=10737418240
SOFT_STORAGE_LIMIT_BYTES=9663676416
MAX_FILE_SIZE_BYTES=2147483648
RETENTION_DAYS=7
SIGNED_URL_TTL_SECONDS=900

# Admin/cron safety
ADMIN_PURGE_CONFIRMATION_TEXT=PURGE ALL FILES
```

Do not expose these to the browser:

```txt
R2_SECRET_ACCESS_KEY
R2_ACCESS_KEY_ID
CLERK_SECRET_KEY
DATABASE_URL
```

Only `NEXT_PUBLIC_*` variables may be visible in the browser.

---

## 9. Cloudflare R2 setup

### 9.1 Create bucket

Create one private R2 bucket:

```txt
file-transfer
```

Bucket requirements:

- Public access disabled.
- No public bucket listing.
- Standard storage class only.
- Do not use Infrequent Access.

### 9.2 Create R2 API token

Create an R2 API token with the minimum permissions needed for this app.

The app needs to:

- put/upload objects
- get/download objects
- delete objects
- list objects for admin purge and storage reconciliation
- configure lifecycle only if automated from app; otherwise configure lifecycle manually in dashboard

Prefer a token scoped only to the selected bucket when possible.

### 9.3 Configure lifecycle rules

Create a lifecycle rule in R2:

```txt
Rule name: delete-uploads-after-7-days
Prefix: uploads/
Action: Delete objects
Age: 7 days
```

Also configure incomplete multipart cleanup if multipart uploads are introduced later.

R2 docs state lifecycle rules can delete objects based on prefix and age. R2 upload docs also state incomplete multipart uploads are automatically aborted after 7 days by default, with lifecycle customization available.

Sources:

- https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- https://developers.cloudflare.com/r2/objects/upload-objects/

---

## 10. Database schema

Use a minimal schema.

### User

```prisma
model User {
  id          String   @id @default(cuid())
  clerkUserId String  @unique
  email       String  @unique
  role        Role    @default(USER)
  status      UserStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  files       File[]
}

enum Role {
  ADMIN
  USER
}

enum UserStatus {
  ACTIVE
  DISABLED
}
```

### File

```prisma
model File {
  id           String   @id @default(cuid())
  ownerId      String
  owner        User     @relation(fields: [ownerId], references: [id])

  originalName String
  safeName     String
  storageKey   String   @unique
  sizeBytes    BigInt
  mimeType     String?
  status       FileStatus @default(PENDING)

  createdAt    DateTime @default(now())
  uploadedAt   DateTime?
  expiresAt    DateTime
  deletedAt    DateTime?

  downloads    Download[]
}

enum FileStatus {
  PENDING
  AVAILABLE
  DELETED
  EXPIRED
  FAILED
}
```

### Download

```prisma
model Download {
  id        String   @id @default(cuid())
  fileId    String
  file      File     @relation(fields: [fileId], references: [id])
  userId    String?
  createdAt DateTime @default(now())
}
```

Optional but useful:

### AdminAction

```prisma
model AdminAction {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  details   Json?
  createdAt DateTime @default(now())
}
```

Use `AdminAction` to log purge events.

---

## 11. Object key format

All uploaded objects must be stored under:

```txt
uploads/<userId>/<fileId>/<safeFilename>
```

Example:

```txt
uploads/clerk-user-db-id/cm123abc/video-file.zip
```

Rules:

- Never use a raw user-supplied path.
- Sanitize filename.
- Generate `fileId` server-side.
- Store the object key in the DB.
- Use the `uploads/` prefix for lifecycle cleanup and admin purge.

---

## 12. R2 S3 client

Create `src/lib/r2.ts`.

```ts
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET!
```

R2 uses the S3-compatible endpoint:

```txt
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

The region should be:

```txt
auto
```

---

## 13. Upload flow

For the first MVP, use presigned single-object `PUT` uploads.

This is simpler than multipart and is acceptable with an initial 2 GB max file size.

### Flow

```txt
1. User selects file in browser.
2. Browser calls POST /api/files/create-upload.
3. Backend verifies Clerk session.
4. Backend verifies role/status.
5. Backend validates file size.
6. Backend calculates current active storage usage.
7. Backend blocks request if total would exceed 10 GB.
8. Backend creates File row with status=PENDING.
9. Backend returns signed R2 PUT URL.
10. Browser uploads directly to signed R2 URL.
11. Browser calls POST /api/files/complete-upload.
12. Backend verifies object and marks File status=AVAILABLE.
```

R2 supports presigned URLs for `PUT`, `GET`, `HEAD`, and `DELETE` operations.

Source:

- https://developers.cloudflare.com/r2/api/s3/presigned-urls/

### `POST /api/files/create-upload`

Request:

```json
{
  "filename": "example.zip",
  "sizeBytes": 123456789,
  "mimeType": "application/zip"
}
```

Response:

```json
{
  "fileId": "cm123",
  "uploadUrl": "https://...",
  "storageKey": "uploads/user/cm123/example.zip",
  "expiresAt": "2026-07-08T12:00:00.000Z"
}
```

Validation:

- authenticated user required
- email must be in `ALLOWED_EMAILS`, unless admin
- user status must be `ACTIVE`
- `sizeBytes > 0`
- `sizeBytes <= MAX_FILE_SIZE_BYTES`
- active storage + sizeBytes <= `MAX_TOTAL_ACTIVE_STORAGE_BYTES`
- blocked extension check

### `POST /api/files/complete-upload`

Request:

```json
{
  "fileId": "cm123"
}
```

Server action:

- verify file belongs to user or user is admin
- issue `HeadObject` to R2 to confirm the object exists
- compare R2 object size to expected `sizeBytes`
- mark file `AVAILABLE`
- set `uploadedAt = now()`
- keep `expiresAt = createdAt + 7 days`

---

## 14. Download flow

### `POST /api/files/download-url`

Request:

```json
{
  "fileId": "cm123"
}
```

Validation:

- user authenticated
- file status is `AVAILABLE`
- file is not expired
- user is owner or admin

Response:

```json
{
  "downloadUrl": "https://...",
  "expiresInSeconds": 900
}
```

The browser should redirect to the signed URL or use it as the download link.

---

## 15. List files

### `GET /api/files`

For normal users:

- return only own non-deleted files

For admin:

- support `?scope=mine` and `?scope=all`
- default can be `mine` unless on admin page

File list item:

```json
{
  "id": "cm123",
  "originalName": "example.zip",
  "sizeBytes": 123456789,
  "status": "AVAILABLE",
  "createdAt": "...",
  "expiresAt": "...",
  "ownerEmail": "friend@example.com"
}
```

---

## 16. Delete own file

### `POST /api/files/delete`

Request:

```json
{
  "fileId": "cm123"
}
```

Rules:

- user can delete own files
- admin can delete any file
- server deletes object from R2
- server marks DB row `DELETED`
- set `deletedAt = now()`

R2 delete operations are supported through S3-compatible APIs. R2 docs also describe deleting objects using dashboard, Workers API, S3 API, or CLI.

Source:

- https://developers.cloudflare.com/r2/objects/delete-objects/

---

## 17. Admin purge all storage

This is required.

Admin must be able to erase all current uploaded content occupying R2 storage.

### UI

Add an admin page:

```txt
/admin/storage
```

Show:

- total active DB-tracked storage
- total number of active files
- per-user usage table
- warning that purge deletes all uploaded files
- confirmation input
- purge button

The confirmation input must require exact text:

```txt
PURGE ALL FILES
```

### API

```txt
POST /api/admin/purge-storage
```

Request:

```json
{
  "confirmation": "PURGE ALL FILES"
}
```

Rules:

- Clerk auth required
- user role must be `ADMIN`
- confirmation text must match env value
- list all objects with prefix `uploads/`
- delete all objects under `uploads/`
- mark all non-deleted DB files as `DELETED`
- create `AdminAction` record
- return count of deleted objects and DB rows

Response:

```json
{
  "ok": true,
  "deletedObjects": 42,
  "updatedFiles": 42
}
```

Implementation detail:

- Use paginated `ListObjectsV2Command`.
- Delete objects in batches.
- `DeleteObjectsCommand` can delete multiple objects per request.
- If `DeleteObjectsCommand` has compatibility issues, fall back to multiple `DeleteObjectCommand` calls.
- Only delete keys with the `uploads/` prefix.
- Never delete bucket-level metadata or unrelated prefixes.

Pseudo-code:

```ts
async function purgeUploadsPrefix() {
  let continuationToken: string | undefined
  let deletedCount = 0

  do {
    const listed = await r2.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: 'uploads/',
      ContinuationToken: continuationToken,
    }))

    const keys = (listed.Contents ?? [])
      .map((obj) => obj.Key)
      .filter(Boolean) as string[]

    for (const key of keys) {
      await r2.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      }))
      deletedCount++
    }

    continuationToken = listed.NextContinuationToken
  } while (continuationToken)

  return deletedCount
}
```

---

## 18. Storage cap enforcement

The app must treat 10 GB as a hard cap.

### Active storage calculation

Calculate active storage from DB:

```sql
SUM(sizeBytes)
WHERE status IN ('PENDING', 'AVAILABLE')
AND deletedAt IS NULL
AND expiresAt > NOW()
```

Before creating an upload:

```ts
if (activeStorageBytes + incomingFileSize > MAX_TOTAL_ACTIVE_STORAGE_BYTES) {
  throw new Error('Storage limit reached. Ask the admin to delete files or purge storage.')
}
```

Also block uploads above per-file limit:

```ts
if (incomingFileSize > MAX_FILE_SIZE_BYTES) {
  throw new Error('File is too large.')
}
```

### Pending upload handling

`PENDING` files count against quota because a signed URL has already been issued.

If upload is not completed, the app should allow cleanup of stale pending records.

Stale pending policy:

```txt
Mark PENDING files older than 24 hours as FAILED.
```

This can be done lazily on each upload/list/admin request instead of using a cron job.

---

## 19. 7-day retention

Use both storage-level and app-level retention.

### Storage-level

Cloudflare R2 lifecycle rule deletes objects under `uploads/` after 7 days.

### App-level

Set each DB file row:

```ts
expiresAt = createdAt + 7 days
```

The UI should hide expired files.

On API requests, call a lightweight cleanup helper:

```ts
await markExpiredFiles()
```

This helper should:

- mark `AVAILABLE` files with `expiresAt <= now()` as `EXPIRED`
- exclude expired files from active storage calculations

Do not depend on a background worker in the MVP.

---

## 20. Security rules

Required:

- R2 bucket private.
- No anonymous upload.
- No anonymous list.
- All API routes check Clerk session.
- All write routes validate user status and role.
- R2 credentials remain server-side only.
- Object keys are server-generated.
- User filenames are sanitized.
- Signed URLs expire in 15 minutes.
- Uploads are blocked at 10 GB total active storage.
- Admin purge requires exact confirmation text.
- Admin actions are logged.

Blocked extensions for MVP:

```txt
.exe
.scr
.bat
.cmd
.ps1
.vbs
.msi
.jar
```

Do not rely on MIME type for security. It can be spoofed.

Optional upload warning shown in UI:

```txt
Files are temporary and automatically deleted after 7 days. Do not upload illegal, harmful, or unauthorized content. Access can be revoked by the admin.
```

---

## 21. Pages and UI requirements

### Public pages

```txt
/
/sign-in
/sign-up or disabled signup flow
```

Prefer invite-only or email allowlist.

### Authenticated pages

```txt
/dashboard
/upload
/files
```

### Admin pages

```txt
/admin
/admin/storage
/admin/users
```

### Upload page

Must show:

- selected filename
- size
- progress bar
- current global storage used
- max allowed file size
- remaining global storage
- 7-day expiry notice

### Files page

Must show:

- filename
- size
- status
- expiry date
- download button
- delete button

### Admin storage page

Must show:

- global storage usage
- free-tier cap: 10 GB
- active file count
- per-user storage usage
- purge all files action

---

## 22. API route summary

```txt
GET    /api/me
GET    /api/storage/usage
GET    /api/files
POST   /api/files/create-upload
POST   /api/files/complete-upload
POST   /api/files/download-url
POST   /api/files/delete
GET    /api/admin/files
GET    /api/admin/storage
POST   /api/admin/purge-storage
POST   /api/admin/users/disable
POST   /api/admin/users/enable
```

The MVP can skip admin user enable/disable if using static `ALLOWED_EMAILS`.

---

## 23. Route protection

Use Clerk middleware to protect app and API routes.

Example matcher:

```ts
export const config = {
  matcher: [
    '/dashboard(.*)',
    '/upload(.*)',
    '/files(.*)',
    '/admin(.*)',
    '/api(.*)',
  ],
}
```

Every API route must also do server-side authorization. Middleware alone is not enough.

---

## 24. Deployment on Hostinger managed hosting

Expected deployment shape:

```txt
Hostinger hPanel
-> Websites
-> Manage
-> Web Apps / Node.js app
-> Connect GitHub repository or upload app
-> Set build command
-> Set start command
-> Add environment variables
-> Attach subdomain files.<domain>
```

Recommended package scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy"
  }
}
```

Build command:

```bash
npm ci && npx prisma generate && npm run build
```

Start command:

```bash
npm run start
```

If Hostinger requires a specific Node version, use the latest supported LTS version available in hPanel.

---

## 25. Implementation order for IDE agent

Build in this order:

```txt
1. Create Next.js TypeScript app.
2. Add Clerk auth.
3. Add MySQL connection and ORM.
4. Create User and File models.
5. Add role detection from ADMIN_EMAIL.
6. Add email allowlist.
7. Add R2 client.
8. Create R2 private bucket manually.
9. Create R2 credentials manually.
10. Implement /api/storage/usage.
11. Implement /api/files/create-upload.
12. Implement browser direct upload using signed PUT URL.
13. Implement /api/files/complete-upload with HeadObject validation.
14. Implement file list page.
15. Implement download signed URL endpoint.
16. Implement delete file endpoint.
17. Implement admin storage page.
18. Implement admin purge endpoint.
19. Add 7-day lifecycle rule in R2 dashboard.
20. Add upload warnings and blocked extensions.
21. Deploy to Hostinger managed web app.
22. Test with one admin and one normal user.
```

Do not implement multipart upload until the simple signed PUT flow works.

---

## 26. Testing checklist

### Auth tests

- Logged-out user cannot access dashboard.
- Logged-out user cannot call upload API.
- Non-allowlisted user is blocked.
- Admin email becomes admin.
- Normal user does not see admin page.

### Upload tests

- Small file uploads successfully.
- File appears in R2.
- DB row becomes `AVAILABLE`.
- File larger than max size is rejected.
- Upload that would exceed 10 GB is rejected.
- Blocked extension is rejected.

### Download tests

- Owner can download file.
- Other normal user cannot download file.
- Admin can download any file.
- Expired file cannot be downloaded.

### Delete tests

- Owner can delete own file.
- Other normal user cannot delete file.
- Admin can delete any file.
- Deleted object is removed from R2.
- DB row is marked `DELETED`.

### Admin purge tests

- Normal user cannot call purge endpoint.
- Admin cannot purge without exact confirmation text.
- Admin purge deletes all R2 objects under `uploads/`.
- Admin purge marks DB files as `DELETED`.
- Admin purge creates an `AdminAction` record.
- After purge, global usage is zero or near zero.

### Retention tests

- Files show expiry date 7 days after creation.
- Expired files are hidden or marked expired.
- R2 lifecycle rule is configured manually and visible in Cloudflare dashboard.

---

## 27. Future upgrades, not required for MVP

Do not build these initially:

- multipart upload
- public share links
- password-protected links
- malware scanning
- Redis
- Docker
- VPS deployment
- background worker
- file previews
- folder uploads
- email notifications

Add multipart upload only if the per-file limit grows beyond what simple signed PUT reliably handles.

---

## 28. Final MVP definition

The MVP is complete when:

```txt
- App runs on files.<domain> through Hostinger managed hosting.
- Users authenticate with Clerk.
- Admin and user roles work.
- Only allowlisted users can use the app.
- Users can upload directly to private R2 storage.
- Users can list/download/delete their own files.
- Admin can see total storage usage.
- Admin can purge all uploaded storage content.
- App blocks uploads above 10 GB total active storage.
- Files expire after 7 days.
- R2 lifecycle rule deletes old uploaded objects.
```
