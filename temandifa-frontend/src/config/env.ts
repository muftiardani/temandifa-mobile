import { z } from "zod";
import { Logger } from "../services/logger";

const envSchema = z.object({
  API_URL: z.string().url().default("http://10.0.2.2:8080/api/v1"),
  SENTRY_DSN: z.string().optional(),
  // Add other env vars here
});

const _env = {
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
};

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(_env);
  Logger.info("Config", "Environment configuration loaded successfully");
} catch (error) {
  Logger.error("Config", "Invalid environment configuration", error);
  // Fallback to default if validation fails, or re-throw if critical
  // For safety in dev, we use the parsed result (which might use defaults) or fallback
  // If parsing failed completely (e.g. strict checks), we might crash.
  // But defaults in Zod handles missing values.

  // Re-parsing just defaults if _env is bad? No, Zod throws.
  // Let's safe parse.
  const parsed = envSchema.safeParse(_env);
  if (!parsed.success) {
    Logger.warn(
      "Config",
      "Environment validation failed, using defaults where possible",
      parsed.error
    );
    // Throwing here ensures we don't run with bad config in production
    if (!__DEV__) {
      throw new Error(
        "Invalid Environment Configuration: " +
          JSON.stringify(parsed.error.format())
      );
    }
    // In dev, maybe minimal defaults
    env = { API_URL: "http://localhost:8080/api/v1", SENTRY_DSN: "" };
  } else {
    env = parsed.data;
  }
}

export const ENV = env;
