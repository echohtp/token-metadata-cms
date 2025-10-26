-- Initial Setup for Token Metadata CMS
-- Run this after creating the schema and functions

-- Add table constraints for data validation
DO $$
BEGIN
    -- Mint address validation
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_mint_address') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_mint_address 
        CHECK (validate_solana_address(mint));
    END IF;

    -- Wallet address validation for authorized_wallets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_wallet_address') THEN
        ALTER TABLE authorized_wallets 
        ADD CONSTRAINT check_wallet_address 
        CHECK (validate_solana_address(wallet_address));
    END IF;

    -- URL validations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_logo_url') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_logo_url 
        CHECK (validate_url(logo));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_twitter_url') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_twitter_url 
        CHECK (validate_url(twitter_url));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_telegram_url') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_telegram_url 
        CHECK (validate_url(telegram_url));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_website_url') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_website_url 
        CHECK (validate_url(website_url));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_discord_url') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_discord_url 
        CHECK (validate_url(discord_url));
    END IF;

    -- Text field security
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_name_length') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_name_length 
        CHECK (name IS NULL OR (LENGTH(name) <= 100 AND name !~ '[<>]'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_description_length') THEN
        ALTER TABLE token_metadata_overrides 
        ADD CONSTRAINT check_description_length 
        CHECK (description IS NULL OR (LENGTH(description) <= 2000 AND description !~ '[<>]'));
    END IF;
END
$$;

-- Insert the first admin wallet (replace with actual wallet address)
-- This allows the first user to access the system and add other users
-- IMPORTANT: Replace 'REPLACE_WITH_YOUR_WALLET_ADDRESS' with your actual wallet address

-- INSERT INTO authorized_wallets (wallet_address, name, role, notes) 
-- VALUES (
--     'REPLACE_WITH_YOUR_WALLET_ADDRESS', 
--     'Initial Admin', 
--     'admin', 
--     'First admin wallet added during setup'
-- ) ON CONFLICT (wallet_address) DO NOTHING;

-- Add some example token metadata (optional - for testing)
-- INSERT INTO token_metadata_overrides (
--     mint, name, description, is_active, created_by, updated_by
-- ) VALUES (
--     'So11111111111111111111111111111111111111112',
--     'Wrapped SOL',
--     'Wrapped Solana token for DeFi applications',
--     true,
--     'REPLACE_WITH_YOUR_WALLET_ADDRESS',
--     'REPLACE_WITH_YOUR_WALLET_ADDRESS'
-- ) ON CONFLICT (mint) DO NOTHING;