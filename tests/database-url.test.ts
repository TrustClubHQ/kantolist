import {
  resolveDatabaseUrl, requireDatabaseUrl, withPoolerFlag,
  isUnconfiguredDatabase, DATABASE_URL_VARS,
} from '@/lib/database-url'

const URL_A = 'postgresql://a@host/db'
const URL_B = 'postgresql://b@host/db'

describe('resolveDatabaseUrl', () => {
  it('finds the connection string under the integration-prefixed name', () => {
    // The preview deployment held it in DATABASE_POSTGRES_URL while the app
    // read DATABASE_URL, so it connected to nothing and served an empty site.
    expect(resolveDatabaseUrl({ DATABASE_POSTGRES_URL: URL_A })).toBe(URL_A)
    expect(resolveDatabaseUrl({ POSTGRES_URL: URL_A })).toBe(URL_A)
    expect(resolveDatabaseUrl({ DATABASE_DATABASE_URL: URL_A })).toBe(URL_A)
  })

  it('lets an explicit DATABASE_URL win, so a working environment is never redirected', () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: URL_A, DATABASE_POSTGRES_URL: URL_B })).toBe(URL_A)
  })

  it('ignores a variable that is present but blank', () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: '   ', POSTGRES_URL: URL_B })).toBe(URL_B)
  })

  it('returns undefined when nothing is set', () => {
    expect(resolveDatabaseUrl({})).toBeUndefined()
  })
})

describe('requireDatabaseUrl', () => {
  it('throws, naming every variable it looked for', () => {
    // Silence here is what produced a site that looked fine and held nothing.
    expect(() => requireDatabaseUrl({})).toThrow(/No database URL/)
    for (const name of DATABASE_URL_VARS) {
      expect(() => requireDatabaseUrl({})).toThrow(new RegExp(name))
    }
  })
})

describe('withPoolerFlag', () => {
  it('disables the prepared-statement cache behind a pooler', () => {
    expect(withPoolerFlag('postgresql://u@ep-x-pooler.aws.neon.tech/db?sslmode=require'))
      .toBe('postgresql://u@ep-x-pooler.aws.neon.tech/db?sslmode=require&pgbouncer=true')
  })

  it('leaves direct and local URLs alone, and never adds the flag twice', () => {
    expect(withPoolerFlag('postgresql://u@localhost:5432/db')).toBe('postgresql://u@localhost:5432/db')
    const already = 'postgresql://u@ep-x-pooler.aws.neon.tech/db?pgbouncer=true'
    expect(withPoolerFlag(already)).toBe(already)
  })
})

describe('isUnconfiguredDatabase', () => {
  it('treats zero categories as broken, not as an empty marketplace', () => {
    // Categories are reference data the seed writes first. None of them means
    // the wrong database, not "no listings yet".
    expect(isUnconfiguredDatabase(0)).toBe(true)
    expect(isUnconfiguredDatabase(36)).toBe(false)
  })
})
