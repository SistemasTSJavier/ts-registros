import { dbQuery } from "@/lib/db";

export async function logTenantAudit(params: {
  workspaceId: string;
  actorEmail: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await dbQuery(
      `
        insert into public.workspace_audit_log
          (workspace_id, actor_email, event_type, payload_json)
        values ($1, $2, $3, $4::jsonb)
      `,
      [
        params.workspaceId,
        params.actorEmail.toLowerCase(),
        params.eventType,
        JSON.stringify(params.payload ?? {}),
      ],
    );
  } catch {
    // Auditoría no bloqueante.
  }
}
