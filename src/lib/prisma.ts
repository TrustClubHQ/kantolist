import { PrismaClient } from '@prisma/client'
import { requireDatabaseUrl, withPoolerFlag } from '@/lib/database-url'

declare global {
  var prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    datasourceUrl: withPoolerFlag(requireDatabaseUrl()),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
