/**
 * The no-photo state.
 *
 * Most listings will never have a photo — a seller posting from a cheap phone
 * on metered data often skips it — so this has to look like a deliberate part
 * of the design rather than a failure. It draws the category's own mark on a
 * flat signwriter panel, which also tells the buyer what they are looking at
 * before they read the title.
 */

type Mark = (props: { size: number }) => React.ReactElement

const stroke = {
  fill: 'none',
  stroke: '#17130E',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const MARKS: Record<string, Mark> = {
  motorcycle: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <circle cx="7" cy="22" r="5" /><circle cx="25" cy="22" r="5" />
      <path d="M7 22l6-11h6l4 7M19 11h4M11 11h5" />
    </svg>
  ),
  bicycle: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <circle cx="7" cy="22" r="5.5" /><circle cx="25" cy="22" r="5.5" />
      <path d="M7 22l5-11h7l6 11M12 11h-3M19 11l2.5 5" />
    </svg>
  ),
  tricycle: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <circle cx="8" cy="23" r="4" /><circle cx="24" cy="23" r="4" />
      <path d="M4 15h13v8M17 15l4-5h4l2 6v7" />
    </svg>
  ),
  'car-van-truck': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M3 20v-6l3-5h12v11" /><path d="M18 12h6l4 5v3h-4" />
      <circle cx="9" cy="21" r="2.5" /><circle cx="23" cy="21" r="2.5" />
    </svg>
  ),
  'phone-tablet': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="10" y="3" width="12" height="26" rx="2" /><path d="M14 25h4" />
    </svg>
  ),
  'laptop-computer': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="6" y="7" width="20" height="13" rx="1" /><path d="M3 24h26l-2-4H5z" />
    </svg>
  ),
  'sound-lights': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="8" y="3" width="16" height="26" rx="2" />
      <circle cx="16" cy="20" r="5" /><circle cx="16" cy="9" r="2.5" />
    </svg>
  ),
  appliances: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="7" y="3" width="18" height="26" rx="2" /><path d="M7 13h18" />
      <circle cx="16" cy="21" r="4" /><path d="M11 7v2" />
    </svg>
  ),
  'power-tools': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M20 5l7 7-4 4-7-7zM16 13L5 24l3 3 11-11" /><path d="M22 16l4 9" />
    </svg>
  ),
  furniture: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M5 20v-7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v7" />
      <rect x="3" y="16" width="26" height="7" rx="2" /><path d="M6 23v3M26 23v3" />
    </svg>
  ),
  repair: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M21 4a7 7 0 0 0-8 9L4 22l3 3 9-9a7 7 0 0 0 9-8l-4 4-4-1-1-4z" />
    </svg>
  ),
  construction: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M4 20h24v5H4zM7 20V9l9-4 9 4v11" /><path d="M12 20v-6h8v6" />
    </svg>
  ),
  'transport-hauling': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="3" y="9" width="16" height="12" rx="1" /><path d="M19 13h5l4 5v3h-9z" />
      <circle cx="9" cy="23" r="2.5" /><circle cx="23" cy="23" r="2.5" />
    </svg>
  ),
  'events-food': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M4 20a12 12 0 0 1 24 0zM2 23h28" /><path d="M16 8V4" />
    </svg>
  ),
  'beauty-wellness': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M12 27V13a4 4 0 0 1 8 0v14z" /><path d="M12 22h8" />
      <path d="M16 9V4M11 6l2 3M21 6l-2 3" />
    </svg>
  ),
  laundry: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="5" y="3" width="22" height="26" rx="2" /><circle cx="16" cy="18" r="7" />
      <path d="M9 8h3M22 8h1" />
    </svg>
  ),
  printing: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M9 12V4h14v8" /><rect x="4" y="12" width="24" height="10" rx="2" />
      <path d="M9 20h14v8H9z" />
    </svg>
  ),
  tutoring: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M3 11l13-6 13 6-13 6z" /><path d="M9 14v7c0 2 3.5 4 7 4s7-2 7-4v-7" />
    </svg>
  ),
  'water-lpg': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M16 3s8 9 8 15a8 8 0 0 1-16 0c0-6 8-15 8-15z" /><path d="M12 18a4 4 0 0 0 4 4" />
    </svg>
  ),
  'rice-grains': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M7 12h18l2 16H5zM11 12V8h10v4" /><path d="M12 19h8" />
    </svg>
  ),
  'vegetables-fruits': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M16 11c-6 0-9 4-9 9s4 8 9 8 9-3 9-8-3-9-9-9z" />
      <path d="M16 11V6M16 6c0-2 2-3 4-3M16 8c-2-2-5-2-6 0" />
    </svg>
  ),
  'homemade-food': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <rect x="5" y="13" width="22" height="12" rx="3" /><path d="M9 13c0-4 3-6 7-6s7 2 7 6" />
      <path d="M3 27h26" />
    </svg>
  ),
  'fish-meat': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M3 16c5-7 13-7 18 0-5 7-13 7-18 0z" /><path d="M21 16l7-5v10z" />
      <circle cx="9" cy="15" r="1" />
    </svg>
  ),
  livestock: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M6 20c0-5 4-8 10-8s10 3 10 8v6H6z" /><path d="M11 12V7l4 3M21 12V7l-4 3" />
      <path d="M12 26v-4M20 26v-4" />
    </svg>
  ),
  'farm-supplies': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M16 28V13" /><path d="M16 13c-4 0-7-3-7-7 4 0 7 3 7 7z" />
      <path d="M16 16c4 0 7-3 7-7-4 0-7 3-7 7z" />
    </svg>
  ),
  clothes: ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M12 4l4 3 4-3 7 4-3 5-2-1v15H10V12l-2 1-3-5z" />
    </svg>
  ),
  'shoes-bags': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M3 22v-8h6l4 3h9a5 5 0 0 1 5 5v2H3z" /><path d="M9 14v-3" />
    </svg>
  ),
  'baby-items': ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" {...stroke} aria-hidden="true">
      <path d="M6 6h4a12 12 0 0 1 12 12H6z" /><path d="M6 18h16" />
      <circle cx="10" cy="25" r="3" /><circle cx="21" cy="25" r="3" />
    </svg>
  ),
}

/** Parent-category fallbacks, so a new leaf still gets something sensible. */
const PARENT_FALLBACK: Record<string, string> = {
  vehicles: 'motorcycle',
  electronics: 'phone-tablet',
  'tools-equipment': 'power-tools',
  'home-furniture': 'furniture',
  services: 'repair',
  'farm-animals': 'livestock',
  'food-produce': 'rice-grains',
  'fashion-baby': 'clothes',
}

/** Four tints, picked from the category slug so a grid does not look striped. */
const TINTS = ['#F6E7C4', '#EFE3D0', '#F3E9D2', '#EDE4CE']

export function CategoryMark({
  categorySlug,
  parentSlug,
  size = 40,
}: {
  categorySlug: string
  parentSlug?: string | null
  size?: number
}) {
  const key =
    MARKS[categorySlug] !== undefined
      ? categorySlug
      : (parentSlug && PARENT_FALLBACK[parentSlug]) || 'repair'
  const Mark = MARKS[key]
  const tint = TINTS[[...categorySlug].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length]

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: tint }}
      aria-hidden="true"
    >
      <div style={{ opacity: 0.45 }}>
        <Mark size={size} />
      </div>
    </div>
  )
}
