import { NextResponse } from 'next/server'
import { isUsingMemory, getMemoryStoreSize, initDb } from '@/lib/db'

export async function GET() {
  if (isUsingMemory()) {
    return NextResponse.json({
      storage: 'memory',
      memoryLinksCount: getMemoryStoreSize(),
    })
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
