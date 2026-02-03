import { NextResponse } from 'next/server'
import { isUsingMemory, getMemoryStoreSize } from '@/lib/db'

export async function GET() {
  return NextResponse.json({
    storage: isUsingMemory() ? 'memory' : 'postgres',
    ...(isUsingMemory() && { memoryLinksCount: getMemoryStoreSize() }),
  })
}
