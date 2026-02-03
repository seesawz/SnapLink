import { NextResponse } from 'next/server'
import { requirePool } from '@/lib/db'

/**
 * 返回应用实际连接到的数据库名和 schema，用于和 Neon 里选的库对照
 * 仅用于排查，生产环境可删除或加权限
 */
export async function GET() {
  try {
    const p = requirePool()
    const { rows } = await p.query<{ current_database: string; current_schema: string }>('SELECT current_database() AS current_database, current_schema() AS current_schema')
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
    const host = url.match(/@([^/]+)/)?.[1] ?? 'unknown' // 只取 host 部分，不含密码
    return NextResponse.json({
      database: rows[0]?.current_database ?? null,
      schema: rows[0]?.current_schema ?? null,
      host: host.replace(/\.(neon\.tech|aws\.neon\.tech).*/, '.xxx.neon.tech'), // 脱敏
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
