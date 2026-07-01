import { createClient } from '@supabase/supabase-js'
import { env } from '../env.js'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'documents'

function contentTypeFromFileName(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    default:
      return 'application/octet-stream'
  }
}

export async function uploadDocumentBase64(input: {
  personId: string
  tenantId: string
  fileName: string
  contentBase64: string
}) {
  const buffer = Buffer.from(input.contentBase64, 'base64')
  const storagePath = `${input.tenantId}/${input.personId}/${Date.now()}-${input.fileName}`

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: contentTypeFromFileName(input.fileName),
    upsert: false,
  })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  return storagePath
}

export async function ensureDocumentsBucket() {
  const { data } = await supabase.storage.listBuckets()
  const exists = data?.some((b) => b.name === BUCKET)
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: false })
  }
}
