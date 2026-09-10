import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccountFromRequest } from '@/lib/auth'
import { withApiHandler, badRequest, unauthorized, forbidden } from '@/lib/api'
import { isAllowedMutatingRequest } from '@/lib/http'
import { normalizePhPhone } from '@/lib/format'

export const GET = withApiHandler(async (request: NextRequest) => {
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()
  return NextResponse.json({
    account: {
      trustclubId: account.trustclubId,
      displayName: account.displayName,
      phone: account.phone,
      phoneVerified: !!account.phoneVerifiedAt,
      messengerHandle: account.messengerHandle,
      facebookUrl: account.facebookUrl,
      viberNumber: account.viberNumber,
      municipalityId: account.municipalityId,
    },
  })
})

export const PATCH = withApiHandler(async (request: NextRequest) => {
  if (!isAllowedMutatingRequest(request)) return forbidden()
  const account = await getAccountFromRequest(request)
  if (!account) return unauthorized()

  const body: {
    displayName?: string
    phone?: string | null
    messengerHandle?: string | null
    facebookUrl?: string | null
    viberNumber?: string | null
    municipalityId?: string | null
  } = await request.json().catch(() => ({}))

  const data: Record<string, unknown> = {}

  if (body.displayName !== undefined) {
    const name = body.displayName.trim().slice(0, 80)
    if (!name) return badRequest('Enter a name buyers will recognise')
    data.displayName = name
  }

  if (body.phone !== undefined) {
    if (body.phone === null || body.phone === '') {
      data.phone = null
      data.phoneVerifiedAt = null
    } else {
      const normalized = normalizePhPhone(body.phone)
      if (!normalized) return badRequest('Enter a Philippine mobile number, e.g. 0917 555 1234')
      // Changing the number drops verification — the new one is unproven.
      if (normalized !== account.phone) data.phoneVerifiedAt = null
      data.phone = normalized
    }
  }

  if (body.messengerHandle !== undefined) {
    data.messengerHandle = body.messengerHandle?.trim().replace(/^@/, '').slice(0, 60) || null
  }

  if (body.facebookUrl !== undefined) {
    const url = body.facebookUrl?.trim()
    if (url) {
      let host: string
      try {
        host = new URL(url).hostname.toLowerCase()
      } catch {
        return badRequest('That does not look like a Facebook link')
      }
      if (!/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(host)) {
        return badRequest('That does not look like a Facebook link')
      }
      data.facebookUrl = url.slice(0, 200)
    } else {
      data.facebookUrl = null
    }
  }

  if (body.viberNumber !== undefined) {
    if (!body.viberNumber) data.viberNumber = null
    else {
      const normalized = normalizePhPhone(body.viberNumber)
      if (!normalized) return badRequest('Enter a Philippine mobile number for Viber')
      data.viberNumber = normalized
    }
  }

  if (body.municipalityId !== undefined) {
    if (body.municipalityId) {
      const exists = await prisma.municipality.findUnique({ where: { id: body.municipalityId } })
      if (!exists) return badRequest('That location is not available')
    }
    data.municipalityId = body.municipalityId || null
  }

  await prisma.account.update({ where: { id: account.id }, data })
  return NextResponse.json({ ok: true })
})
