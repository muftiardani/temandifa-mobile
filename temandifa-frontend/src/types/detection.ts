export interface DetectionResult {
  label: string;
  confidence: number;
  bbox: number[];
}

export interface ApiResponse {
  status: string;
  filename: string;
  data: DetectionResult[];
}
