import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { limits } from './config'

export const storage = new S3Client({
  region: process.env.OCI_REGION ?? 'eu-frankfurt-1',
  endpoint: process.env.OCI_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.OCI_ACCESS_KEY ?? '',
    secretAccessKey: process.env.OCI_SECRET_KEY ?? ''
  }
})

export const STORAGE_BUCKET = process.env.OCI_BUCKET ?? 'file-transfer'

export async function createUploadUrl(params: {
  key: string
  sizeBytes: number
  mimeType?: string | null
}) {
  return getSignedUrl(
    storage,
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: params.key,
      ContentLength: params.sizeBytes,
      ContentType: params.mimeType ?? 'application/octet-stream'
    }),
    { expiresIn: limits.signedUrlTtlSeconds }
  )
}

export async function createDownloadUrl(key: string, filename: string) {
  return getSignedUrl(
    storage,
    new GetObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replaceAll('"', '')}"`
    }),
    { expiresIn: limits.signedUrlTtlSeconds }
  )
}

export async function headObject(key: string) {
  return storage.send(new HeadObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }))
}

export async function deleteObject(key: string) {
  await storage.send(new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key }))
}

export async function purgeUploadsPrefix() {
  let continuationToken: string | undefined
  let deletedCount = 0

  do {
    const listed = await storage.send(
      new ListObjectsV2Command({
        Bucket: STORAGE_BUCKET,
        Prefix: 'uploads/',
        ContinuationToken: continuationToken
      })
    )

    const keys = (listed.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key?.startsWith('uploads/')))

    for (let index = 0; index < keys.length; index += 1000) {
      const batch = keys.slice(index, index + 1000)
      try {
        await storage.send(
          new DeleteObjectsCommand({
            Bucket: STORAGE_BUCKET,
            Delete: { Objects: batch.map((Key) => ({ Key })) }
          })
        )
      } catch {
        await Promise.all(batch.map((key) => deleteObject(key)))
      }
      deletedCount += batch.length
    }

    continuationToken = listed.NextContinuationToken
  } while (continuationToken)

  return deletedCount
}
