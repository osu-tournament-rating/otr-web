import { sql, type SQL } from 'drizzle-orm';

type AuditSqlClient = {
  execute(query: SQL): Promise<unknown>;
};

export async function setAuditUserId(
  client: AuditSqlClient,
  userId: number | null
) {
  const value = userId != null ? String(userId) : '';
  await client.execute(
    sql`select set_config('otr.audit_user_id', ${value}, false)`
  );
}

export async function withAuditUserId<T>(
  client: AuditSqlClient,
  userId: number,
  operation: () => Promise<T>
): Promise<T> {
  await setAuditUserId(client, userId);

  try {
    return await operation();
  } finally {
    await setAuditUserId(client, null);
  }
}
