import { db } from '../db/client.js'
import { auditLogs } from '../db/schema.js'
import { generateId } from '../lib/utils.js'

export async function addAuditLog(entry: {
  tenantId: string | null
  actorId: string
  actorName: string
  action: string
  entity: string
  entityId: string
  detail: string
  createdAt?: string
}) {
  await db.insert(auditLogs).values({
    id: generateId(),
    tenantId: entry.tenantId,
    actorId: entry.actorId,
    actorName: entry.actorName,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    detail: entry.detail,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  })
}
