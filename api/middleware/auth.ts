import type { MiddlewareHandler } from 'hono'

/** Pass-through auth middleware placeholder for future authentication */
export const authMiddleware: MiddlewareHandler = async (_c, next) => {
  await next()
}
