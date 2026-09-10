import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'
import { isAllowedMutatingRequest } from '@/lib/http'
import { withApiHandler } from '@/lib/api'

export const POST = withApiHandler(async (request: NextRequest) => {
  if (!isAllowedMutatingRequest(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  clearAuthCookie(res)
  return res
})
