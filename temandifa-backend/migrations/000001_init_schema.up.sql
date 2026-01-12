-- Enable UUID extension if needed (optional, keeping it simple for now)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    full_name VARCHAR(255),
    profile_picture VARCHAR(255),
    role VARCHAR(255) DEFAULT 'user'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_role ON users(role);

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    user_id INTEGER,
    name VARCHAR(255),
    phone_number VARCHAR(255),
    relation VARCHAR(255),
    is_primary BOOLEAN,
    CONSTRAINT fk_users_emergency_contacts FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_deleted_at ON emergency_contacts(deleted_at);

-- Histories Table
CREATE TABLE IF NOT EXISTS histories (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    user_id INTEGER,
    feature_type VARCHAR(20),
    input_source VARCHAR(255),
    result_text TEXT,
    CONSTRAINT fk_users_histories FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_histories_user_id ON histories(user_id);
CREATE INDEX IF NOT EXISTS idx_histories_deleted_at ON histories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_history_feature ON histories(feature_type);
-- Composite index for user history queries implicitly covered or added explicitly if needed
CREATE INDEX IF NOT EXISTS idx_history_user_created ON histories(user_id, created_at);

-- Call Logs Table
CREATE TABLE IF NOT EXISTS call_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    caller_id INTEGER,
    receiver_id INTEGER,
    room_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'INITIATED',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER,
    CONSTRAINT fk_call_logs_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_call_logs_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver_id ON call_logs(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_room_id ON call_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_deleted_at ON call_logs(deleted_at);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    user_id INTEGER NOT NULL,
    token VARCHAR(512) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_deleted_at ON refresh_tokens(deleted_at);
