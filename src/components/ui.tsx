import type { ReactNode } from 'react'

/**
 * The signwriter primitives. Everything else composes these, so the rules in
 * globals.css (square corners, one shadow, black-on-yellow) hold by default
 * instead of being re-typed at each call site.
 */

type Tone = 'ink' | 'red' | 'yellow' | 'green' | 'plain' | 'dim'

const TONE_CLASS: Record<Tone, string> = {
  ink: 'bg-ink text-ground border-ink',
  red: 'bg-red text-ground border-ink',
  yellow: 'bg-yellow text-ink border-ink',
  green: 'bg-green text-ground border-ink',
  plain: 'bg-panel text-ink border-ink',
  dim: 'bg-dim text-muted border-dim-edge',
}

/** A bordered white panel with the offset shadow — the workhorse container. */
export function Plate({
  children,
  className = '',
  flat = false,
}: {
  children: ReactNode
  className?: string
  flat?: boolean
}) {
  return (
    <div className={`border-[3px] border-ink bg-panel ${flat ? '' : 'hard'} ${className}`}>
      {children}
    </div>
  )
}

/** The black caption bar that titles a plate. */
export function PlateHeader({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="label flex items-baseline justify-between gap-3 bg-ink px-3 py-1.5 text-[17px] tracking-wide text-ground">
      <span>{children}</span>
      {right ? <span className="text-yellow">{right}</span> : null}
    </div>
  )
}

/** Small stamped label — listing type, status, verification. */
export function Badge({
  children,
  tone = 'yellow',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={`label inline-flex items-center gap-1.5 border-2 px-2 py-0.5 text-[13px] ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** A price, in the display face. Sizes match the mockups. */
export function Price({
  children,
  size = 'md',
  className = '',
}: {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = { sm: 'text-[22px]', md: 'text-[27px]', lg: 'text-[38px]' }
  return (
    <span className={`font-display leading-none text-red ${sizes[size]} ${className}`}>{children}</span>
  )
}

export function Chip({
  children,
  selected = false,
  as: As = 'span',
  ...rest
}: {
  children: ReactNode
  selected?: boolean
  as?: 'span' | 'button'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={`label cursor-pointer border-[2.5px] border-ink px-3 py-1.5 text-[16px] ${
        selected ? 'bg-yellow text-ink' : 'bg-panel text-ink'
      }`}
      {...rest}
    >
      {children}
    </As>
  )
}

/** Primary action. Red by default; yellow for a secondary emphasis. */
export function Button({
  children,
  tone = 'red',
  className = '',
  ...rest
}: {
  children: ReactNode
  tone?: Tone
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`font-display hard flex min-h-[54px] w-full items-center justify-center gap-2 border-[3px] px-4 text-[21px] uppercase disabled:cursor-not-allowed disabled:opacity-60 ${TONE_CLASS[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label text-[15px] text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs font-semibold text-muted">{hint}</span> : null}
    </label>
  )
}

/** The safety note. Black block, yellow shield — deliberately hard to skim past. */
export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-ink px-3.5 py-3">
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F2B01E"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <path d="M12 3l8 4v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7z" />
      </svg>
      <p className="m-0 text-[13px] font-semibold leading-relaxed text-ground">{children}</p>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Plate className="p-6 text-center">
      <p className="label m-0 text-[20px]">{title}</p>
      {children ? <p className="mt-2 text-sm text-muted-2">{children}</p> : null}
    </Plate>
  )
}
