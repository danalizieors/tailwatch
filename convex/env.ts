import * as v from 'valibot'

const envSchema = v.object({
  AUTH_GITHUB_ID: v.pipe(v.string()),
  AUTH_GITHUB_SECRET: v.pipe(v.string()),
  CONVEX_SITE_URL: v.pipe(v.string(), v.url()),
  VAPID_PRIVATE_KEY: v.pipe(v.string()),
  VAPID_SUBJECT: v.pipe(v.string()),
})

export const env = v.parse(envSchema, process.env)
