import { NextResponse } from 'next/server'
import { requirePool } from '@/lib/db'

/** 返回当前数据库 links 表条数，用于确认应用是否写入了你正在看的那个库 */
export async function GET() {
  try {
    const p = requirePool()
    const {
      rows: [{ count }],
    } = await p.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM links')
    return NextResponse.json({ count: Number(count) })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
