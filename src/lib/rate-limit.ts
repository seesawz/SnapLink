import { requirePool } from './db'

const WINDOW_SECONDS = 60
const MAX_REQUESTS_PER_WINDOW = 30
const RATE_LIMIT_KEY_PREFIX = 'view:'

let tableInitialized = false

async function ensureTable(): Promise<void> {
  if (tableInitialized) return
  const p = requirePool()
  await p.query(`
    CREATE TABLE IF NOT EXISTS rate_limit (
      key TEXT PRIMARY KEY,
      count INT NOT NULL DEFAULT 0,
      window_end TIMESTAMPTZ NOT NULL
    )
  `)
  tableInitialized = true
}

/**
 * 检查并消耗一次「查看内容」限流额度。
 * 按 IP 限流：每 60 秒内最多 30 次。超限不消耗额度。
 * @returns true 允许本次请求，false 超限需返回 429
 */
export async function checkAndConsumeViewContent(ip: string): Promise<boolean> {
  const key = RATE_LIMIT_KEY_PREFIX + (ip || 'unknown').trim() || 'unknown'
  await ensureTable()
  const p = requirePool()

  const { rows } = await p.query<{ count: number; window_end: Date }>(
    `
    INSERT INTO rate_limit (key, count, window_end)
    VALUES ($1, 1, NOW() + INTERVAL '1 second' * $2)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit.window_end < NOW() THEN 1 ELSE rate_limit.count + 1 END,
      window_end = CASE WHEN rate_limit.window_end < NOW() THEN NOW() + INTERVAL '1 second' * $2 ELSE rate_limit.window_end END
    RETURNING count, window_end
    `,
    [key, WINDOW_SECONDS]
  )

  const row = rows[0]
  if (!row) return false
  const allowed = row.count <= MAX_REQUESTS_PER_WINDOW
  if (!allowed) {
    await p.query(`UPDATE rate_limit SET count = count - 1 WHERE key = $1 AND count > 0`, [key])
  }
  return allowed
}
