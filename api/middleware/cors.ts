import { cors } from 'hono/cors'

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*'

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGIN,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
})
