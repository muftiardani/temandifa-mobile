import * as Sentry from "@sentry/react-native";
import { ENV } from "./env";
import { Logger } from "../services/logger";

export function initSentry() {
  if (ENV.SENTRY_DSN) {
    Sentry.init({
      dsn: ENV.SENTRY_DSN,
      debug: __DEV__, // Enable debug mode in development
      tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring
      // Set to a lower value in production
      _experiments: {
        profilesSampleRate: 1.0,
      },
      integrations: [
        // Add integrations here if needed
      ],
    });
    Logger.info("Sentry", "Initialized successfully");
  } else {
    Logger.warn("Sentry", "DSN not found, Sentry disabled");
  }
}
