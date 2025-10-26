-- Fix the filtering logic in get_token_metadata_overrides function
CREATE OR REPLACE FUNCTION get_token_metadata_overrides(
    p_active_only BOOLEAN DEFAULT true,
    p_include_deleted BOOLEAN DEFAULT false,
    p_search TEXT DEFAULT '',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id BIGINT,
    mint VARCHAR(44),
    name VARCHAR(100),
    logo VARCHAR(500),
    description TEXT,
    twitter_url VARCHAR(500),
    telegram_url VARCHAR(500),
    website_url VARCHAR(500),
    discord_url VARCHAR(500),
    is_active BOOLEAN,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(44),
    updated_by VARCHAR(44)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.mint,
        t.name,
        t.logo,
        t.description,
        t.twitter_url,
        t.telegram_url,
        t.website_url,
        t.discord_url,
        t.is_active,
        t.deleted_at,
        t.deleted_by,
        t.created_at,
        t.updated_at,
        t.created_by,
        t.updated_by
    FROM token_metadata_overrides t
    WHERE 
        -- Apply deletion filter first
        CASE 
            WHEN p_include_deleted THEN t.deleted_at IS NOT NULL  -- Show ONLY deleted tokens
            ELSE t.deleted_at IS NULL                              -- Show ONLY non-deleted tokens
        END
        -- Apply active filter only to non-deleted tokens
        AND (
            t.deleted_at IS NOT NULL OR                           -- If deleted, ignore active filter
            NOT p_active_only OR                                  -- If not filtering by active, include all
            t.is_active = true                                    -- If filtering by active, only include active
        )
        -- Apply search filter
        AND (
            p_search = '' OR
            t.mint ILIKE '%' || p_search || '%' OR
            t.name ILIKE '%' || p_search || '%' OR
            t.description ILIKE '%' || p_search || '%'
        )
    ORDER BY 
        CASE WHEN t.deleted_at IS NOT NULL THEN 1 ELSE 0 END, -- Show non-deleted first
        t.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;