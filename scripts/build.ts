/**
 * The deploy build.
 *
 * It exists to resolve the database URL once and hand the same value to every
 * step. `prisma migrate deploy` reads `env("DATABASE_URL")` out of
 * schema.prisma and cannot be told to look anywhere else, so an environment
 * that holds its connection string under one of the integration's other names
 * would migrate nothing while the app itself connected fine — or, as happened
 * here, the reverse.
 *
 * `requireDatabaseUrl` throws when there is no URL under any accepted name,
 * which fails the build. That is deliberate: a deployment with no database
 * should not reach production and render an empty site.
 */
import { spawnSync } from 'node:child_process'
import { requireDatabaseUrl } from '../src/lib/database-url'

const STEPS: string[][] = [
  ['prisma', 'generate'],
  ['prisma', 'migrate', 'deploy'],
  ['tsx', 'scripts/seed-if-empty.ts'],
  ['next', 'build'],
]

const env = { ...process.env, DATABASE_URL: requireDatabaseUrl() }

for (const step of STEPS) {
  const result = spawnSync('npx', step, { stdio: 'inherit', env })
  if (result.status !== 0) {
    process.stderr.write(`\n[build] "${step.join(' ')}" failed\n`)
    process.exit(result.status ?? 1)
  }
}
