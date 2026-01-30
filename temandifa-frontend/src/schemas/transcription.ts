import { z } from "zod";

export const TranscriptionDataSchema = z.object({
  text: z.string(),
  language: z.string(),
});

export const TranscriptionResponseSchema = z.object({
  status: z.string(),
  filename: z.string().optional(),
  data: TranscriptionDataSchema.optional(),
  error: z.string().optional(),
});

// Alias for backward compatibility if needed, or better naming
export type TranscriptionResult = {
  status: string;
  text?: string;
  language?: string;
  error?: string;
};
