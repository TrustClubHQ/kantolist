'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { useT } from '@/components/LanguageProvider'

/**
 * A log-in link that comes back to where you were.
 *
 * The header's link used to point at a bare `/signin`, which always landed on
 * the home page afterwards — so anyone who signed in from a listing lost the
 * listing and had to find it again. The sign-in flow already carries a
 * `redirect` through the device grant; nothing was filling it in.
 *
 * A client component because the current path is only knowable in the browser:
 * the header itself renders on the server.
 */
export function SignInLink({
  className = '',
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  const t = useT()
  const pathname = usePathname()
  const params = useSearchParams()

  // Signing in while already on /signin would otherwise send you back to
  // /signin after it succeeds.
  const query = params.toString()
  const here = pathname + (query ? `?${query}` : '')
  const target =
    pathname === '/signin' ? '/signin' : `/signin?redirect=${encodeURIComponent(here)}`

  return (
    <Link href={target} className={className}>
      {children ?? t('signin.link')}
    </Link>
  )
}
