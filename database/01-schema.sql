-- Token Metadata CMS Database Schema
-- Run these scripts in your Supabase SQL editor in order

-- Enable Row Level Security
-- Note: We'll configure RLS policies after creating tables

-- 1. Authorized Wallets Table
CREATE TABLE IF NOT EXISTS authorized_wallets (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(44), -- Wallet address of who added this user
    notes TEXT
);

-- 2. Token Metadata Overrides Table (based on V1 featured_mints)
CREATE TABLE IF NOT EXISTS token_metadata_overrides (
    id BIGSERIAL PRIMARY KEY,
    mint VARCHAR(44) UNIQUE NOT NULL, -- Solana token mint address
    name VARCHAR(100),
    logo VARCHAR(500), -- URL to logo image
    description TEXT,
    
    -- Social media links
    twitter_url VARCHAR(500),
    telegram_url VARCHAR(500),
    website_url VARCHAR(500),
    discord_url VARCHAR(500),
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(44), -- Wallet address of creator
    updated_by VARCHAR(44)  -- Wallet address of last updater
);

-- 3. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    wallet_address VARCHAR(44),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_authorized_wallets_address ON authorized_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_authorized_wallets_active ON authorized_wallets(is_active);
CREATE INDEX IF NOT EXISTS idx_authorized_wallets_role ON authorized_wallets(role);

CREATE INDEX IF NOT EXISTS idx_token_metadata_mint ON token_metadata_overrides(mint);
CREATE INDEX IF NOT EXISTS idx_token_metadata_active ON token_metadata_overrides(is_active);
CREATE INDEX IF NOT EXISTS idx_token_metadata_created_by ON token_metadata_overrides(created_by);
CREATE INDEX IF NOT EXISTS idx_token_metadata_updated_at ON token_metadata_overrides(updated_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_wallet ON audit_log(wallet_address);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);

-- Enable full-text search on token metadata
CREATE INDEX IF NOT EXISTS idx_token_metadata_search ON token_metadata_overrides 
USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(mint, '')));