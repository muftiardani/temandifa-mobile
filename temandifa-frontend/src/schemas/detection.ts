import { z } from "zod";

export const DetectionItemSchema = z.object({
  label: z.string(),
  confidence: z.number(),
  box: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});

export const DetectionResponseSchema = z.object({
  status: z.string(),
  data: z.array(DetectionItemSchema),
});

export type DetectionItem = z.infer<typeof DetectionItemSchema>;
export type DetectionResponse = z.infer<typeof DetectionResponseSchema>;
