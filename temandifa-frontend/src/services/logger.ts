import * as Sentry from "@sentry/react-native";

class LoggerService {
  private isDevelopment = __DEV__;

  // Keys that might contain sensitive data
  private SENSITIVE_KEYS = [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "secret",
    "creditCard",
    "pin",
  ];

  private maskSensitiveData(data: any): any {
    if (!data) return data;

    if (typeof data === "object") {
      if (Array.isArray(data)) {
        return data.map((item) => this.maskSensitiveData(item));
      }

      const masked: any = { ...data };
      for (const key in masked) {
        if (
          this.SENSITIVE_KEYS.some((sensitive) =>
            key.toLowerCase().includes(sensitive.toLowerCase())
          )
        ) {
          masked[key] = "***MASKED***";
        } else if (typeof masked[key] === "object") {
          masked[key] = this.maskSensitiveData(masked[key]);
        }
      }
      return masked;
    }

    return data;
  }

  private formatMessage(tag: string, message: string, data?: any) {
    const prefix = `[${tag}]`;
    const safeData = this.maskSensitiveData(data);
    return { prefix, message, data: safeData };
  }

  debug(tag: string, message: string, data?: any) {
    if (this.isDevelopment) {
      const { prefix, data: safeData } = this.formatMessage(tag, message, data);
      if (safeData) {
        console.debug(`${prefix} ${message}`, safeData);
      } else {
        console.debug(`${prefix} ${message}`);
      }
    }
  }

  info(tag: string, message: string, data?: any) {
    const { prefix, data: safeData } = this.formatMessage(tag, message, data);

    if (this.isDevelopment) {
      if (safeData) {
        console.info(`${prefix} ${message}`, safeData);
      } else {
        console.info(`${prefix} ${message}`);
      }
    }

    // Always add breadcrumb for info, even in prod (but careful with volume)
    Sentry.addBreadcrumb({
      category: tag,
      message: message,
      data: safeData,
      level: "info",
    });
  }

  warn(tag: string, message: string, data?: any) {
    const { prefix, data: safeData } = this.formatMessage(tag, message, data);

    if (this.isDevelopment) {
      if (safeData) {
        console.warn(`${prefix} ${message}`, safeData);
      } else {
        console.warn(`${prefix} ${message}`);
      }
    } else {
      Sentry.addBreadcrumb({
        category: tag,
        message: message,
        data: safeData,
        level: "warning",
      });
    }
  }

  error(tag: string, message: string, error?: any) {
    const { prefix, data: safeData } = this.formatMessage(tag, message, error);

    if (this.isDevelopment) {
      if (error) {
        console.error(`${prefix} ${message}`, error);
      } else {
        console.error(`${prefix} ${message}`);
      }
    }

    // Send to Sentry with enriched context
    Sentry.captureException(error || new Error(message), {
      tags: { source: tag },
      extra: {
        message,
        context: safeData, // masked data context
      },
    });
  }
}

export const Logger = new LoggerService();
