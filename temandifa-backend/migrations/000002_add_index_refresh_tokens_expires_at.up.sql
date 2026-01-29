-- Add index to `expires_at` column in `refresh_tokens` table
-- This optimizes the cleanup job which runs `DELETE FROM refresh_tokens WHERE expires_at < NOW()`

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
