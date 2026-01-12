// API Configuration Constants
export const API_CONFIG = {
  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Maximum retry attempts for transient errors
  MAX_RETRIES: 3,

  // Base delay for exponential backoff (ms)
  RETRY_DELAY_BASE: 1000,

  // Content types
  CONTENT_TYPE_JSON: "application/json",
  CONTENT_TYPE_MULTIPART: "multipart/form-data",
};

// Storage keys for secure store
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  EXPIRES_AT: "token_expires_at",
  USER: "user",
  BIOMETRIC_CREDS: "biometric_creds",
  BIOMETRIC_ENABLED: "biometric_enabled_flag",
};

// HTTP status codes for reference
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// Feature types for history
export const FEATURE_TYPES = {
  OBJECT: "OBJECT",
  OCR: "OCR",
  VOICE: "VOICE",
} as const;

export type FeatureType = (typeof FEATURE_TYPES)[keyof typeof FEATURE_TYPES];
