type LogContext = Record<string, unknown>

export const logger = {
  debug: (message: string, context?: LogContext) => console.debug("[Aeosys]", message, context),
  info: (message: string, context?: LogContext) => console.info("[Aeosys]", message, context),
  warn: (message: string, context?: LogContext) => console.warn("[Aeosys]", message, context),
  error: (message: string, context?: LogContext) => console.error("[Aeosys]", message, context),
}
