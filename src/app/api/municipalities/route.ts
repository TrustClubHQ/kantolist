import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiHandler } from '@/lib/api'

export const GET = withApiHandler(async (request: NextRequest) => {
  const province = request.nextUrl.searchParams.get('province') ?? undefined
  const municipalities = await prisma.municipality.findMany({
    where: province ? { province } : undefined,
    orderBy: [{ province: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, province: true },
  })
  return NextResponse.json({ municipalities })
})
