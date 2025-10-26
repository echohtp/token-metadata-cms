-- Final RLS setup with proper security
-- This version avoids recursion and works correctly

-- Ensure the helper function exists
CREATE OR REPLACE FUNCTION check_wallet_authorization(wallet_addr VARCHAR)
RETURNS TABLE (
    is_authorized BOOLEAN,
    role VARCHAR,
    name VARCHAR
) 
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
    -- This function runs with definer privileges, bypassing RLS
    RETURN QUERY
    SELECT 
        aw.is_active as is_authorized,
        aw.role::VARCHAR,
        COALESCE(aw.name, '')::VARCHAR as name
    FROM authorized_wallets aw
    WHERE aw.wallet_address = wallet_addr
    AND aw.is_active = true;
    
    -- If no rows found, return unauthorized
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, 'none'::VARCHAR, ''::VARCHAR;
    END IF;
END;
$$;

-- Ensure set_current_wallet function exists
CREATE OR REPLACE FUNCTION set_current_wallet(wallet_address VARCHAR)
RETURNS VOID 
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('app.current_wallet', wallet_address, true);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_wallet_authorization TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_current_wallet TO authenticated, anon;

-- Enable RLS on tables
ALTER TABLE token_metadata_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Don't enable RLS on authorized_wallets to avoid recursion
-- We'll secure it at the application level

-- Drop existing policies first
DROP POLICY IF EXISTS "token_metadata_read_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_create_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_update_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_delete_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "audit_log_create_access" ON audit_log;
DROP POLICY IF EXISTS "audit_log_read_access" ON audit_log;

-- Token Metadata Policies
CREATE POLICY "token_metadata_read_access" ON token_metadata_overrides
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role IN ('admin', 'editor', 'viewer')
        )
    );

CREATE POLICY "token_metadata_create_access" ON token_metadata_overrides
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "token_metadata_update_access" ON token_metadata_overrides
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role IN ('admin', 'editor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "token_metadata_delete_access" ON token_metadata_overrides
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role = 'admin'
        )
    );

-- Audit Log Policies
CREATE POLICY "audit_log_create_access" ON audit_log
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "audit_log_read_access" ON audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role = 'admin'
        )
    );