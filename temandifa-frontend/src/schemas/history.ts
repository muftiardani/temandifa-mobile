import { z } from "zod";

// Feature Type Enum
export const FeatureTypeSchema = z.enum(["OBJECT", "OCR", "VOICE", "VQA"]);
export type FeatureType = z.infer<typeof FeatureTypeSchema>;

// History Item Schema
export const HistoryItemSchema = z.object({
  ID: z.number(),
  CreatedAt: z.string(),
  UpdatedAt: z.string(),
  user_id: z.number(),
  feature_type: FeatureTypeSchema,
  input_source: z.string(),
  result_text: z.string(),
});

export type HistoryItem = z.infer<typeof HistoryItemSchema>;

// Get History Response Schema
export const HistoryListResponseSchema = z.object({
  data: z.array(HistoryItemSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

// Create History Response Schema
export const HistoryCreateResponseSchema = z.object({
  message: z.string(),
  data: HistoryItemSchema,
});
