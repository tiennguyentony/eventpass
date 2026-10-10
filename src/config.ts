export interface Config {
  port: number;
  dataFile: string | undefined;
  rsvpCloseHours: number;
  listingCacheTtlMs: number;
  rsvpRateLimit: { max: number; windowMs: number };
  webhookTimeoutMs: number;
  maxGuests: number;
}

export const defaultConfig: Config = {
  port: 3000,
  dataFile: undefined,
  rsvpCloseHours: 2,
  listingCacheTtlMs: 60_000,
  rsvpRateLimit: { max: 10, windowMs: 60_000 },
  webhookTimeoutMs: 5_000,
  maxGuests: 3,
};

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    ...defaultConfig,
    port: Number(env.PORT ?? defaultConfig.port),
    dataFile: env.DATA_FILE || undefined,
  };
}
