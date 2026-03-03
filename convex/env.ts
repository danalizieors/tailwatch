import * as v from 'valibot'

const envSchema = v.object({
  AUTH_GITHUB_ID: v.pipe(v.string()),
  AUTH_GITHUB_SECRET: v.pipe(v.string()),
  CONVEX_SITE_URL: v.pipe(v.string(), v.url()),
  VAPID_PRIVATE_KEY: v.pipe(v.string()),
  VAPID_SUBJECT: v.pipe(v.string()),
})

export const env = v.parse(envSchema, {
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
})
