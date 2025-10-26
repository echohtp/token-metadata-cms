-- Initial Token Metadata CMS Schema Migration

-- Create the main tables
CREATE TABLE IF NOT EXISTS authorized_wallets (
    id BIGSERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(44),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS token_metadata_overrides (
    id BIGSERIAL PRIMARY KEY,
    mint VARCHAR(44) UNIQUE NOT NULL,
    name VARCHAR(100),
    logo VARCHAR(500),
    description TEXT,
    twitter_url VARCHAR(500),
    telegram_url VARCHAR(500),
    website_url VARCHAR(500),
    discord_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(44),
    updated_by VARCHAR(44)
);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_authorized_wallets_address ON authorized_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_authorized_wallets_active ON authorized_wallets(is_active);
CREATE INDEX IF NOT EXISTS idx_token_metadata_mint ON token_metadata_overrides(mint);
CREATE INDEX IF NOT EXISTS idx_token_metadata_active ON token_metadata_overrides(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_wallet ON audit_log(wallet_address);

-- Insert admin user
INSERT INTO authorized_wallets (wallet_address, name, role, notes) 
VALUES (
    'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd', 
    'Initial Admin', 
    'admin', 
    'First admin wallet added during setup'
) ON CONFLICT (wallet_address) DO NOTHING;