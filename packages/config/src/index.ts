// Shared runtime config validation
// Import in apps to get typed env with early error if something is missing

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
