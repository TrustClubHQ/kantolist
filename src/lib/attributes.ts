/**
 * Category attributes: the mechanism that lets a leaf category define its own
 * form fields and filters as DATA, so adding "wattage" to Sound & Lights is a
 * seed edit rather than a deploy.
 *
 * A category's `attributeSchema` is an array of these definitions. The posting
 * form renders them, this module validates the submitted values, and the search
 * API turns the filterable ones into Prisma JSON predicates.
 */

export type AttributeType = 'enum' | 'int' | 'bool' | 'text'
export type FilterStyle = 'range' | 'min' | 'exact'

export interface AttributeDef {
  key: string
  label: string
  type: AttributeType
  /** enum only */
  options?: string[]
  /** int only — inclusive bounds used by both the form and the filter */
  min?: number
  max?: number
  unit?: string
  /** How the filter panel presents this attribute. Ignored when filterable is false. */
  filter?: FilterStyle
  filterable?: boolean
  required?: boolean
  /** Filter chips to offer for an int attribute, e.g. 125–155 cc. */
  buckets?: { label: string; min?: number; max?: number }[]
}

export type AttributeValues = Record<string, string | number | boolean>

const MAX_TEXT_LENGTH = 120

function fail(message: string): { ok: false; error: string } {
  return { ok: false, error: message }
}

/**
 * Validate submitted values against a category's schema.
 *
 * Unknown keys are DROPPED rather than rejected: a poster whose form is one
 * deploy out of date should still be able to post, and silently storing junk
 * we can never filter on is worse than losing it.
 */
export function validateAttributes(
  schema: AttributeDef[],
  input: unknown,
): { ok: true; values: AttributeValues } | { ok: false; error: string } {
  if (input === null || input === undefined) return { ok: true, values: {} }
  if (typeof input !== 'object' || Array.isArray(input)) return fail('attributes must be an object')

  const raw = input as Record<string, unknown>
  const values: AttributeValues = {}

  for (const def of schema) {
    const value = raw[def.key]
    const missing = value === undefined || value === null || value === ''

    if (missing) {
      if (def.required) return fail(`${def.label} is required`)
      continue
    }

    switch (def.type) {
      case 'enum': {
        if (typeof value !== 'string' || !(def.options ?? []).includes(value)) {
          return fail(`${def.label} must be one of: ${(def.options ?? []).join(', ')}`)
        }
        values[def.key] = value
        break
      }
      case 'int': {
        const n = typeof value === 'number' ? value : Number(value)
        if (!Number.isFinite(n) || !Number.isInteger(n)) return fail(`${def.label} must be a whole number`)
        if (def.min !== undefined && n < def.min) return fail(`${def.label} must be at least ${def.min}`)
        if (def.max !== undefined && n > def.max) return fail(`${def.label} must be at most ${def.max}`)
        values[def.key] = n
        break
      }
      case 'bool': {
        if (typeof value === 'boolean') values[def.key] = value
        else if (value === 'true' || value === 'false') values[def.key] = value === 'true'
        else return fail(`${def.label} must be yes or no`)
        break
      }
      case 'text': {
        if (typeof value !== 'string') return fail(`${def.label} must be text`)
        const trimmed = value.trim()
        if (trimmed.length > MAX_TEXT_LENGTH) return fail(`${def.label} must be ${MAX_TEXT_LENGTH} characters or fewer`)
        if (trimmed) values[def.key] = trimmed
        break
      }
    }
  }

  return { ok: true, values }
}

/** Runtime guard for schemas coming out of the database as `Json`. */
export function parseSchema(value: unknown): AttributeDef[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (d): d is AttributeDef =>
      !!d &&
      typeof d === 'object' &&
      typeof (d as AttributeDef).key === 'string' &&
      typeof (d as AttributeDef).label === 'string' &&
      ['enum', 'int', 'bool', 'text'].includes((d as AttributeDef).type),
  )
}

export interface AttributeFilter {
  key: string
  eq?: string | boolean
  gte?: number
  lte?: number
}

/**
 * Read attribute filters out of a query string. Each filterable attribute is
 * addressed by its own key, with `_min`/`_max` suffixes for numeric ranges:
 *   ?displacement_cc_min=125&displacement_cc_max=155&condition=used
 * Values that don't match the schema are ignored rather than erroring — a
 * stale bookmark should degrade to a broader search, not a 400.
 */
export function parseAttributeFilters(
  schema: AttributeDef[],
  params: URLSearchParams,
): AttributeFilter[] {
  const filters: AttributeFilter[] = []

  for (const def of schema) {
    if (def.filterable === false) continue

    if (def.type === 'int') {
      const min = Number(params.get(`${def.key}_min`))
      const max = Number(params.get(`${def.key}_max`))
      const filter: AttributeFilter = { key: def.key }
      if (Number.isFinite(min) && params.get(`${def.key}_min`)) filter.gte = min
      if (Number.isFinite(max) && params.get(`${def.key}_max`)) filter.lte = max
      if (filter.gte !== undefined || filter.lte !== undefined) filters.push(filter)
      continue
    }

    const value = params.get(def.key)
    if (!value) continue

    if (def.type === 'enum') {
      if ((def.options ?? []).includes(value)) filters.push({ key: def.key, eq: value })
    } else if (def.type === 'bool') {
      if (value === 'true' || value === 'false') filters.push({ key: def.key, eq: value === 'true' })
    }
  }

  return filters
}

/**
 * Turn attribute filters into Prisma `where` clauses over the `attributes`
 * JSON column. Numeric comparisons need the JSON path extracted as a number,
 * which Prisma expresses as a `path` + comparison on the JSON filter.
 */
export function attributeWhereClauses(filters: AttributeFilter[]): Record<string, unknown>[] {
  return filters.map((f) => {
    if (f.eq !== undefined) {
      return { attributes: { path: [f.key], equals: f.eq } }
    }
    const clause: Record<string, unknown> = { path: [f.key] }
    if (f.gte !== undefined) clause.gte = f.gte
    if (f.lte !== undefined) clause.lte = f.lte
    return { attributes: clause }
  })
}
