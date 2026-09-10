/* eslint-disable no-console */

/**
 * Minimal, dependency-free structured logger — the one place `console` is
 * used directly, so log routing and level gating have a single choke point.
 * `debug` is a no-op in production; the rest always emit.
 */

type LogContext = unknown

const isProduction = process.env.NODE_ENV === 'production'

function emit(method: 'error' | 'warn' | 'info' | 'debug', message: string, context?: LogContext): void {
  if (context === undefined) console[method](message)
  else console[method](message, context)
}

export const logger = {
  error: (message: string, context?: LogContext) => emit('error', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  debug: (message: string, context?: LogContext) => {
    if (!isProduction) emit('debug', message, context)
  },
}
