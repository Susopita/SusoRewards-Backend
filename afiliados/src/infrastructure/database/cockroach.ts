import pg from 'pg';

const connectionString = process.env.COCKROACH_URI || 'postgresql://root@localhost:26257/susorewards_recompensas?sslmode=disable';

let pool: pg.Pool | null = null;

export function getCockroachPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
    });
  }
  return pool;
}

export async function queryCockroach(sql: string, params: any[] = []) {
  const pool = getCockroachPool();
  try {
    return await pool.query(sql, params);
  } catch (err) {
    console.error('Error executing query on CockroachDB:', err);
  }
}
