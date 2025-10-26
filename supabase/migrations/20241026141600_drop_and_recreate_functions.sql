-- Drop existing functions first
DROP FUNCTION IF EXISTS upsert_token_metadata(VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, VARCHAR);
DROP FUNCTION IF EXISTS validate_solana_address(VARCHAR);
DROP FUNCTION IF EXISTS validate_url(VARCHAR);
DROP FUNCTION IF EXISTS is_wallet_authorized(VARCHAR);
DROP FUNCTION IF EXISTS get_token_metadata_overrides(BOOLEAN, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_token_by_mint(VARCHAR);
DROP FUNCTION IF EXISTS delete_token_metadata(VARCHAR, VARCHAR);

-- Recreate functions with correct signatures
CREATE FUNCTION validate_solana_address(address VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    IF address IS NULL OR LENGTH(address) < 32 OR LENGTH(address) > 44 THEN
        RETURN false;
    END IF;
    
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
        RETURN true;
    END IF;
    
    IF NOT (p_url ~ '^https?://[^\s/$.?#].[^\s]*$') THEN
        RETURN false;
    END IF;
    
    IF p_url ~* '(javascript:|data:|vbscript:|file:|ftp:)' THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

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
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, 'none'::VARCHAR, ''::VARCHAR;
    END IF;
END;
$$ LANGUAGE plpgsql;

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
    IF NOT validate_solana_address(p_mint) THEN
        RAISE EXCEPTION 'Invalid mint address format: %', p_mint;
    END IF;
    
    SELECT EXISTS(SELECT 1 FROM token_metadata_overrides WHERE mint = p_mint) INTO v_exists;
    
    IF v_exists THEN
        UPDATE token_metadata_overrides SET
            name = p_name,
            logo = p_logo,
            description = p_description,
            twitter_url = p_twitter_url,
            telegram_url = p_telegram_url,
            website_url = p_website_url,
            discord_url = p_discord_url,
            is_active = p_is_active,
            updated_by = p_wallet_address,
            updated_at = CURRENT_TIMESTAMP
        WHERE mint = p_mint
        RETURNING id INTO v_id;
    ELSE
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
        updated_by = p_wallet_address,
        updated_at = CURRENT_TIMESTAMP
    WHERE mint = p_mint AND is_active = true;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Add the admin user
INSERT INTO authorized_wallets (wallet_address, name, role, notes) 
VALUES (
    'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd', 
    'Initial Admin', 
    'admin', 
    'First admin wallet added during setup'
) ON CONFLICT (wallet_address) DO NOTHING;