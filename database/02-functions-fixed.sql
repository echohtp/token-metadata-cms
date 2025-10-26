-- Database Functions for Token Metadata CMS (Fixed Version)

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS validate_url(VARCHAR);
DROP FUNCTION IF EXISTS validate_solana_address(VARCHAR);
DROP FUNCTION IF EXISTS is_wallet_authorized(VARCHAR);
DROP FUNCTION IF EXISTS get_token_metadata_overrides(BOOLEAN, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_token_by_mint(VARCHAR);
DROP FUNCTION IF EXISTS upsert_token_metadata(VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, VARCHAR);
DROP FUNCTION IF EXISTS delete_token_metadata(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS add_authorized_wallet(VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS get_authorized_wallets();

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to token_metadata_overrides
DROP TRIGGER IF EXISTS update_token_metadata_updated_at ON token_metadata_overrides;
CREATE TRIGGER update_token_metadata_updated_at 
    BEFORE UPDATE ON token_metadata_overrides 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Input validation functions
CREATE FUNCTION validate_solana_address(address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Solana addresses are base58 encoded and typically 32-44 characters
    IF address IS NULL OR LENGTH(address) < 32 OR LENGTH(address) > 44 THEN
        RETURN false;
    END IF;
    
    -- Check for valid base58 characters (no 0, O, I, l)
    IF address ~ '[^123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION validate_url(p_url VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_url IS NULL OR p_url = '' THEN
        RETURN true; -- Allow empty URLs
    END IF;
    
    -- Basic URL validation
    IF NOT (p_url ~ '^https?://[^\s/$.?#].[^\s]*$') THEN
        RETURN false;
    END IF;
    
    -- Prevent suspicious URLs
    IF p_url ~* '(javascript:|data:|vbscript:|file:|ftp:)' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to check if wallet is authorized
CREATE FUNCTION is_wallet_authorized(p_wallet_address VARCHAR)
RETURNS TABLE (
    is_authorized BOOLEAN,
    role VARCHAR,
    name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aw.is_active as is_authorized,
        aw.role,
        COALESCE(aw.name, '') as name
    FROM authorized_wallets aw
    WHERE aw.wallet_address = p_wallet_address
    AND aw.is_active = true;
    
    -- If no rows found, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, 'none'::VARCHAR, ''::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get all token metadata with filtering and search
CREATE FUNCTION get_token_metadata_overrides(
    p_active_only BOOLEAN DEFAULT true,
    p_search TEXT DEFAULT '',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    mint VARCHAR,
    name VARCHAR,
    logo VARCHAR,
    description TEXT,
    twitter_url VARCHAR,
    telegram_url VARCHAR,
    website_url VARCHAR,
    discord_url VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR,
    updated_by VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.mint, t.name, t.logo, t.description,
        t.twitter_url, t.telegram_url, t.website_url, t.discord_url,
        t.is_active, t.created_at, t.updated_at, t.created_by, t.updated_by
    FROM token_metadata_overrides t
    WHERE 
        (NOT p_active_only OR t.is_active = true)
        AND (
            p_search = '' OR
            t.mint ILIKE '%' || p_search || '%' OR
            t.name ILIKE '%' || p_search || '%' OR
            t.description ILIKE '%' || p_search || '%'
        )
    ORDER BY t.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get single token by mint
CREATE FUNCTION get_token_by_mint(p_mint VARCHAR)
RETURNS TABLE (
    id BIGINT,
    mint VARCHAR,
    name VARCHAR,
    logo VARCHAR,
    description TEXT,
    twitter_url VARCHAR,
    telegram_url VARCHAR,
    website_url VARCHAR,
    discord_url VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR,
    updated_by VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id, t.mint, t.name, t.logo, t.description,
        t.twitter_url, t.telegram_url, t.website_url, t.discord_url,
        t.is_active, t.created_at, t.updated_at, t.created_by, t.updated_by
    FROM token_metadata_overrides t
    WHERE t.mint = p_mint;
END;
$$ LANGUAGE plpgsql;

-- Function to create or update token metadata
CREATE FUNCTION upsert_token_metadata(
    p_mint VARCHAR,
    p_name VARCHAR DEFAULT NULL,
    p_logo VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_twitter_url VARCHAR DEFAULT NULL,
    p_telegram_url VARCHAR DEFAULT NULL,
    p_website_url VARCHAR DEFAULT NULL,
    p_discord_url VARCHAR DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true,
    p_wallet_address VARCHAR DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_id BIGINT;
    v_exists BOOLEAN;
BEGIN
    -- Validate inputs
    IF NOT validate_solana_address(p_mint) THEN
        RAISE EXCEPTION 'Invalid mint address format: %', p_mint;
    END IF;
    
    IF NOT validate_url(p_logo) THEN
        RAISE EXCEPTION 'Invalid logo URL format';
    END IF;
    
    IF NOT validate_url(p_twitter_url) THEN
        RAISE EXCEPTION 'Invalid Twitter URL format';
    END IF;
    
    IF NOT validate_url(p_telegram_url) THEN
        RAISE EXCEPTION 'Invalid Telegram URL format';
    END IF;
    
    IF NOT validate_url(p_website_url) THEN
        RAISE EXCEPTION 'Invalid website URL format';
    END IF;
    
    IF NOT validate_url(p_discord_url) THEN
        RAISE EXCEPTION 'Invalid Discord URL format';
    END IF;
    
    -- Check if record exists
    SELECT EXISTS(SELECT 1 FROM token_metadata_overrides WHERE mint = p_mint) INTO v_exists;
    
    IF v_exists THEN
        -- Update existing record
        UPDATE token_metadata_overrides SET
            name = p_name,
            logo = p_logo,
            description = p_description,
            twitter_url = p_twitter_url,
            telegram_url = p_telegram_url,
            website_url = p_website_url,
            discord_url = p_discord_url,
            is_active = p_is_active,
            updated_by = p_wallet_address
        WHERE mint = p_mint
        RETURNING id INTO v_id;
    ELSE
        -- Insert new record
        INSERT INTO token_metadata_overrides (
            mint, name, logo, description,
            twitter_url, telegram_url, website_url, discord_url,
            is_active, created_by, updated_by
        ) VALUES (
            p_mint, p_name, p_logo, p_description,
            p_twitter_url, p_telegram_url, p_website_url, p_discord_url,
            p_is_active, p_wallet_address, p_wallet_address
        ) RETURNING id INTO v_id;
    END IF;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete token
CREATE FUNCTION delete_token_metadata(
    p_mint VARCHAR,
    p_wallet_address VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE token_metadata_overrides SET
        is_active = false,
        updated_by = p_wallet_address
    WHERE mint = p_mint AND is_active = true;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to add authorized wallet (admin only)
CREATE FUNCTION add_authorized_wallet(
    p_wallet_address VARCHAR,
    p_name VARCHAR DEFAULT NULL,
    p_role VARCHAR DEFAULT 'editor',
    p_added_by VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    admin_auth RECORD;
    v_id BIGINT;
BEGIN
    -- Validate wallet address
    IF NOT validate_solana_address(p_wallet_address) THEN
        RAISE EXCEPTION 'Invalid wallet address format: %', p_wallet_address;
    END IF;
    
    -- Check if the person adding has admin role (unless it's the first wallet)
    IF EXISTS (SELECT 1 FROM authorized_wallets WHERE is_active = true LIMIT 1) THEN
        SELECT * INTO admin_auth FROM is_wallet_authorized(p_added_by);
        IF NOT admin_auth.is_authorized OR admin_auth.role != 'admin' THEN
            RAISE EXCEPTION 'Only admin wallets can add new authorized wallets';
        END IF;
    END IF;
    
    -- Insert the new wallet
    INSERT INTO authorized_wallets (
        wallet_address, name, role, created_by, notes
    ) VALUES (
        p_wallet_address, p_name, p_role, p_added_by, p_notes
    ) RETURNING id INTO v_id;
    
    RETURN v_id;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Wallet address already exists: %', p_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Function to get all authorized wallets (admin only)
CREATE FUNCTION get_authorized_wallets()
RETURNS TABLE (
    id BIGINT,
    wallet_address VARCHAR,
    name VARCHAR,
    role VARCHAR,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aw.id, aw.wallet_address, aw.name, aw.role, aw.is_active,
        aw.created_at, aw.created_by, aw.notes
    FROM authorized_wallets aw
    ORDER BY aw.created_at DESC;
END;
$$ LANGUAGE plpgsql;