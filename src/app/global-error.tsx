'use client'

/**
 * The last resort: a failure in the root layout itself, which means the
 * provider, the fonts and the stylesheet may all be missing. So this one
 * carries its own <html> and its own inline styling and says the same thing in
 * both languages rather than asking a context that may not exist.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          padding: '24px',
          background: '#FDF3DC',
          color: '#17130E',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
          KantoList — may nasira. Something broke.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: '54px',
            padding: '0 20px',
            border: '3px solid #17130E',
            background: '#C6362B',
            color: '#FDF3DC',
            fontSize: '18px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          Subukan ulit · Try again
        </button>
      </body>
    </html>
  )
}
