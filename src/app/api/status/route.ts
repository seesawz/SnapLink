import { NextResponse } from 'next/server'
import { hasDbConfig, initDb, DB_NOT_CONFIGURED } from '@/lib/db'

export async function GET() {
  if (!hasDbConfig()) {
    return NextResponse.json(
      {
        storage: 'none',
        error: DB_NOT_CONFIGURED,
      },
      { status: 503 }
    )
  }

  try {
    await initDb()
    return NextResponse.json({
      storage: 'postgres',
      connected: true,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        storage: 'postgres',
        connected: false,
        error: message,
      },
      { status: 503 }
    )
  }
}
