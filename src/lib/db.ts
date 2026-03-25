import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres";

// Supabase normalmente requiere SSL. Este setting evita errores de certificado.
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function dbQuery<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows;
}

export async function dbQuerySingle<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await dbQuery<T>(text, params);
  return rows[0] ?? null;
}

export async function dbTx<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

