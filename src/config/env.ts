import { z } from 'zod'

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DATABASE_URL: z.string(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  OLLAMA_BASE_URL: z.string().optional().default('http://localhost:11434'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'ollama']).default('openai'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  // 32-byte key (base64 or hex) for AES-256-GCM encryption of stored secrets (MCP auth tokens)
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  WORKSPACES_ENABLED: z.string().optional().default('false').transform((v) => v === 'true'),
})

export type Env = z.infer<typeof envSchema>

export function getEnv(): Env {
  return envSchema.parse(process.env)
}
