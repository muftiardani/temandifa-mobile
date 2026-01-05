export interface OcrResult {
  full_text: string;
  lines: {
    text: string;
    confidence: number;
  }[];
}

export interface OcrApiResponse {
  status: string;
  filename: string;
  data: OcrResult;
}
