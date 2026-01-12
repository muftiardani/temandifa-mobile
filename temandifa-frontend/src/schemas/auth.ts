import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const TokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_at: z.string(),
});

export type Tokens = z.infer<typeof TokensSchema>;

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    expires_at: z.string(),
    user: UserSchema,
  }),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
