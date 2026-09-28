/**
 * Reassign a listing to a TrustClub account.
 *
 * For pointing demo content at a real TrustClub id so a deployment can be
 * tested with a real sign-in — seeded listings belong to invented accounts
 * (`ruben.dlc` and friends) that no real trust graph knows about, so every
 * trust lookup against them is honestly empty.
 *
 * Creates the account if this deployment has not seen that id yet, which is
 * what would happen anyway the first time that member signs in.
 *
 *   DATABASE_URL="postgres://…" npx tsx scripts/set-listing-owner.ts \
 *     --listing JN2WDX --trustclub-id sbfzvusu [--name "Display Name"]
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main(): Promise<void> {
  const code = arg('--listing')?.toUpperCase()
  const trustclubId = arg('--trustclub-id')
  const displayName = arg('--name')

  if (!code || !trustclubId) {
    throw new Error('Usage: --listing <CODE> --trustclub-id <ID> [--name "Display Name"]')
  }

  const listing = await prisma.listing.findUnique({
    where: { code },
    include: { account: { select: { trustclubId: true, displayName: true } } },
  })
  if (!listing) throw new Error(`No listing with code ${code} in this database.`)

  if (listing.account.trustclubId === trustclubId) {
    process.stdout.write(`${code} already belongs to @${trustclubId} — nothing to do\n`)
    return
  }

  const account =
    (await prisma.account.findUnique({ where: { trustclubId } })) ??
    (await prisma.account.create({ data: { trustclubId, displayName: displayName ?? trustclubId } }))

  if (displayName && account.displayName !== displayName) {
    await prisma.account.update({ where: { id: account.id }, data: { displayName } })
  }

  await prisma.listing.update({ where: { id: listing.id }, data: { accountId: account.id } })

  process.stdout.write(
    `${code} "${listing.title}"\n` +
      `  was @${listing.account.trustclubId} (${listing.account.displayName ?? '—'})\n` +
      `  now @${trustclubId} (${displayName ?? account.displayName ?? '—'})\n`,
  )
}

main()
  .catch((error) => {
    process.exitCode = 1
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  })
  .finally(() => prisma.$disconnect())
