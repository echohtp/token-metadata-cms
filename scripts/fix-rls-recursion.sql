-- Fix infinite recursion in RLS policies
-- The issue is that is_wallet_authorized function queries authorized_wallets table
-- which has RLS policy that calls is_wallet_authorized, creating infinite recursion

-- First, disable RLS temporarily to fix the issue
ALTER TABLE authorized_wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE token_metadata_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "authorized_wallets_admin_access" ON authorized_wallets;
DROP POLICY IF EXISTS "token_metadata_read_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_create_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_update_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_delete_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "audit_log_create_access" ON audit_log;
DROP POLICY IF EXISTS "audit_log_read_access" ON audit_log;

-- Create a security definer function that bypasses RLS for authorization checks
CREATE OR REPLACE FUNCTION check_wallet_authorization(wallet_addr VARCHAR)
RETURNS TABLE (
    is_authorized BOOLEAN,
    role VARCHAR,
    name VARCHAR
) 
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aw.is_active as is_authorized,
        aw.role::VARCHAR,
        COALESCE(aw.name, '')::VARCHAR as name
    FROM authorized_wallets aw
    WHERE aw.wallet_address = wallet_addr
    AND aw.is_active = true;
    
    -- If no rows found, return false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, 'none'::VARCHAR, ''::VARCHAR;
    END IF;
END;
$$;

-- Now re-enable RLS on token_metadata_overrides only (not on authorized_wallets to avoid recursion)
ALTER TABLE token_metadata_overrides ENABLE ROW LEVEL SECURITY;

-- Create policies using the new security definer function
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

-- Leave authorized_wallets table WITHOUT RLS for now to avoid recursion
-- We'll secure it at the application level since only admins should access it

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

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