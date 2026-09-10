import {
  validateAttributes, parseSchema, parseAttributeFilters, attributeWhereClauses,
  type AttributeDef,
} from '@/lib/attributes'

const SCHEMA: AttributeDef[] = [
  { key: 'brand', label: 'Brand', type: 'enum', options: ['Honda', 'Yamaha'], required: true },
  { key: 'displacement_cc', label: 'Engine size', type: 'int', min: 25, max: 2000, filter: 'range' },
  { key: 'with_or_cr', label: 'With OR/CR', type: 'bool' },
  { key: 'model', label: 'Model', type: 'text', filterable: false },
]

describe('validateAttributes', () => {
  it('accepts values that match the schema', () => {
    const result = validateAttributes(SCHEMA, {
      brand: 'Honda',
      displacement_cc: 125,
      with_or_cr: true,
      model: '  Click 125i  ',
    })
    expect(result).toEqual({
      ok: true,
      values: { brand: 'Honda', displacement_cc: 125, with_or_cr: true, model: 'Click 125i' },
    })
  })

  it('rejects an enum value that is not an option', () => {
    const result = validateAttributes(SCHEMA, { brand: 'Ducati' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Honda')
  })

  it('rejects a missing required value', () => {
    const result = validateAttributes(SCHEMA, { displacement_cc: 125 })
    expect(result).toEqual({ ok: false, error: 'Brand is required' })
  })

  it('enforces integer bounds', () => {
    expect(validateAttributes(SCHEMA, { brand: 'Honda', displacement_cc: 5 }).ok).toBe(false)
    expect(validateAttributes(SCHEMA, { brand: 'Honda', displacement_cc: 9000 }).ok).toBe(false)
    expect(validateAttributes(SCHEMA, { brand: 'Honda', displacement_cc: 1.5 }).ok).toBe(false)
  })

  it('coerces numeric and boolean strings, since forms submit strings', () => {
    const result = validateAttributes(SCHEMA, {
      brand: 'Yamaha',
      displacement_cc: '155',
      with_or_cr: 'false',
    })
    expect(result).toEqual({
      ok: true,
      values: { brand: 'Yamaha', displacement_cc: 155, with_or_cr: false },
    })
  })

  it('drops unknown keys rather than rejecting the post', () => {
    // A poster on a stale form should still be able to post; silently storing
    // junk we can never filter on would be worse than losing it.
    const result = validateAttributes(SCHEMA, { brand: 'Honda', colour: 'red' })
    expect(result).toEqual({ ok: true, values: { brand: 'Honda' } })
  })

  it('treats an empty optional value as absent', () => {
    const result = validateAttributes(SCHEMA, { brand: 'Honda', model: '' })
    expect(result).toEqual({ ok: true, values: { brand: 'Honda' } })
  })
})

describe('parseSchema', () => {
  it('keeps well-formed definitions and discards malformed ones', () => {
    const parsed = parseSchema([
      { key: 'brand', label: 'Brand', type: 'enum' },
      { key: 'oops', label: 'Oops', type: 'not-a-type' },
      { label: 'No key', type: 'text' },
      null,
      'nonsense',
    ])
    expect(parsed).toHaveLength(1)
    expect(parsed[0].key).toBe('brand')
  })

  it('returns an empty schema for a non-array', () => {
    expect(parseSchema({ brand: 'Honda' })).toEqual([])
    expect(parseSchema(null)).toEqual([])
  })
})

describe('parseAttributeFilters', () => {
  it('reads ranges from _min and _max suffixes', () => {
    const params = new URLSearchParams('displacement_cc_min=125&displacement_cc_max=155')
    expect(parseAttributeFilters(SCHEMA, params)).toEqual([
      { key: 'displacement_cc', gte: 125, lte: 155 },
    ])
  })

  it('reads a one-sided range', () => {
    const params = new URLSearchParams('displacement_cc_min=250')
    expect(parseAttributeFilters(SCHEMA, params)).toEqual([{ key: 'displacement_cc', gte: 250 }])
  })

  it('ignores values the schema does not allow instead of erroring', () => {
    // A stale bookmark should widen the search, not 400.
    const params = new URLSearchParams('brand=Ducati&with_or_cr=maybe')
    expect(parseAttributeFilters(SCHEMA, params)).toEqual([])
  })

  it('skips attributes marked unfilterable', () => {
    const params = new URLSearchParams('model=Click')
    expect(parseAttributeFilters(SCHEMA, params)).toEqual([])
  })

  it('reads enum and bool filters', () => {
    const params = new URLSearchParams('brand=Honda&with_or_cr=true')
    expect(parseAttributeFilters(SCHEMA, params)).toEqual([
      { key: 'brand', eq: 'Honda' },
      { key: 'with_or_cr', eq: true },
    ])
  })
})

describe('attributeWhereClauses', () => {
  it('builds equality and range clauses over the JSON column', () => {
    expect(
      attributeWhereClauses([
        { key: 'brand', eq: 'Honda' },
        { key: 'displacement_cc', gte: 125, lte: 155 },
      ]),
    ).toEqual([
      { attributes: { path: ['brand'], equals: 'Honda' } },
      { attributes: { path: ['displacement_cc'], gte: 125, lte: 155 } },
    ])
  })
})
