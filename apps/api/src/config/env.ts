import './load-env';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  AUDIT_HMAC_SECRET: z.string().min(32, 'AUDIT_HMAC_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),

  COOKIE_SECURE: booleanFromString.optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  TRUST_PROXY: booleanFromString.default('false'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  ADMIN_EMAIL: z.string().email().default('admin@pharmacy.system'),
  ADMIN_INITIAL_PASSWORD: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema> & { cookieSecure: boolean; corsOrigins: string[] };

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const env = parsed.data;
  if (env.NODE_ENV === 'production' && !env.REDIS_PASSWORD) {
    throw new Error('Invalid environment configuration: REDIS_PASSWORD is required in production');
  }

  cached = {
    ...env,
    cookieSecure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
  };
  return cached;
}
