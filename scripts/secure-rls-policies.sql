-- Secure RLS policies without recursion
-- Strategy: Use a security definer function that bypasses RLS for auth checks

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

-- Enable RLS on all tables
ALTER TABLE authorized_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_metadata_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Authorized Wallets Policies
-- Only allow admins to view/manage authorized wallets
CREATE POLICY "authorized_wallets_admin_only" ON authorized_wallets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role = 'admin'
        )
    );

-- Token Metadata Policies
-- All authenticated users can read tokens
CREATE POLICY "token_metadata_read_access" ON token_metadata_overrides
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role IN ('admin', 'editor', 'viewer')
        )
    );

-- Editors and admins can create tokens
CREATE POLICY "token_metadata_create_access" ON token_metadata_overrides
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role IN ('admin', 'editor')
        )
    );

-- Editors and admins can update tokens
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

-- Only admins can delete tokens
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
-- Allow inserts for audit logging (done by triggers)
CREATE POLICY "audit_log_create_access" ON audit_log
    FOR INSERT
    WITH CHECK (true);

-- Only admins can read audit logs
CREATE POLICY "audit_log_read_access" ON audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM check_wallet_authorization(current_setting('app.current_wallet', true)) auth
            WHERE auth.is_authorized = true
            AND auth.role = 'admin'
        )
    );

-- Grant execute permission on the helper function to authenticated users
GRANT EXECUTE ON FUNCTION check_wallet_authorization TO authenticated;
GRANT EXECUTE ON FUNCTION check_wallet_authorization TO anon;