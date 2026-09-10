import { NextRequest, NextResponse } from 'next/server'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler } from '@/lib/api'

export const GET = withApiHandler(async (request: NextRequest) => {
  const account = await getAccountFromRequest(request)
  if (!account) return NextResponse.json({ account: null })
  return NextResponse.json({
    account: {
      id: account.id,
      trustclubId: account.trustclubId,
      displayName: account.displayName,
      municipalityId: account.municipalityId,
      isStaff: account.isStaff,
      hasPhone: !!account.phone,
    },
  })
})
