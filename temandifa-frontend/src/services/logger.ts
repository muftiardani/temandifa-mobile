import * as Sentry from "@sentry/react-native";

class LoggerService {
  private isDevelopment = __DEV__;

  private formatMessage(tag: string, message: string, data?: any) {
    const prefix = `[${tag}]`;
    return { prefix, message, data };
  }

  debug(tag: string, message: string, data?: any) {
    if (this.isDevelopment) {
      const { prefix } = this.formatMessage(tag, message, data);
      if (data) {
        console.debug(`${prefix} ${message}`, data);
      } else {
        console.debug(`${prefix} ${message}`);
      }
    }
  }

  info(tag: string, message: string, data?: any) {
    if (this.isDevelopment) {
      const { prefix } = this.formatMessage(tag, message, data);
      if (data) {
        console.info(`${prefix} ${message}`, data);
      } else {
        console.info(`${prefix} ${message}`);
      }
    } else {
      // Optional: Add breadcrumb to Sentry for info logs
      Sentry.addBreadcrumb({
        category: tag,
        message: message,
        data: data,
        level: "info",
      });
    }
  }

  warn(tag: string, message: string, data?: any) {
    if (this.isDevelopment) {
      const { prefix } = this.formatMessage(tag, message, data);
      if (data) {
        console.warn(`${prefix} ${message}`, data);
      } else {
        console.warn(`${prefix} ${message}`);
      }
    } else {
      Sentry.addBreadcrumb({
        category: tag,
        message: message,
        data: data,
        level: "warning",
      });
    }
  }

  error(tag: string, message: string, error?: any) {
    const { prefix } = this.formatMessage(tag, message, error);

    if (this.isDevelopment) {
      if (error) {
        console.error(`${prefix} ${message}`, error);
      } else {
        console.error(`${prefix} ${message}`);
      }
    } else {
      // Send to Sentry
      Sentry.captureException(error || new Error(message), {
        tags: { source: tag },
        extra: { message },
      });
    }
  }
}

export const Logger = new LoggerService();
