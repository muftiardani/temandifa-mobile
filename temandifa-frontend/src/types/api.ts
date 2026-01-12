/**
 * Centralized API types for TemanDifa frontend
 */

// ============================================================================
// Base Response Types
// ============================================================================

export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  status: "error";
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: number;
  email: string;
  full_name: string;
  profile_picture?: string;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

// ============================================================================
// History Types
// ============================================================================

export type FeatureType = "OBJECT" | "OCR" | "VOICE";

export interface HistoryItem {
  id: number;
  user_id: number;
  feature_type: FeatureType;
  input_source: string;
  result_text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHistoryRequest {
  feature_type: FeatureType;
  input_source: string;
  result_text: string;
}

export interface HistoryListResponse extends ApiResponse<HistoryItem[]> {
  meta: PaginationMeta;
}

// ============================================================================
// AI Detection Types
// ============================================================================

export interface Detection {
  label: string;
  label_original?: string;
  confidence: number;
  bbox: number[];
}

export interface DetectionResponse {
  status: "success";
  filename: string;
  language: string;
  count: number;
  data: Detection[];
}

// ============================================================================
// OCR Types
// ============================================================================

export interface OCRLine {
  text: string;
  confidence: number;
  bbox: {
    top_left: number[];
    top_right: number[];
    bottom_right: number[];
    bottom_left: number[];
  };
}

export interface OCRData {
  full_text: string;
  word_count: number;
  line_count: number;
  language: string;
  lines: OCRLine[];
}

export interface OCRResponse {
  status: "success";
  filename: string;
  data: OCRData;
}

// ============================================================================
// Transcription Types
// ============================================================================

export interface TranscriptionData {
  text: string;
  language: string;
}

export interface TranscriptionResponse {
  status: "success";
  filename: string;
  data: TranscriptionData;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
  status: "healthy" | "degraded";
  postgres: "up" | "down";
  redis: "up" | "down";
  ai_service: "up" | "down";
}
