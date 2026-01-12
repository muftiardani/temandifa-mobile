import { z } from "zod";

export const OcrResponseSchema = z.object({
  status: z.string(),
  filename: z.string(),
  data: z.object({
    full_text: z.string(),
    lines: z.array(
      z.object({
        text: z.string(),
        confidence: z.number(),
      })
    ),
  }),
});

export type OcrResponse = z.infer<typeof OcrResponseSchema>;
