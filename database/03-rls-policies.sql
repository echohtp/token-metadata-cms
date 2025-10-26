-- Row Level Security Policies for Token Metadata CMS

-- Enable RLS on all tables
ALTER TABLE authorized_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_metadata_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Authorized Wallets Policies
-- Only admins can view and manage authorized wallets
CREATE POLICY "authorized_wallets_admin_access" ON authorized_wallets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.role = 'admin' 
            AND aw.is_active = true
        )
    );

-- Token Metadata Overrides Policies
-- All authenticated users can read active tokens
CREATE POLICY "token_metadata_read_access" ON token_metadata_overrides
    FOR SELECT
    USING (
        is_active = true OR
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.is_active = true
            AND aw.role IN ('admin', 'editor', 'viewer')
        )
    );

-- Editors and admins can create tokens
CREATE POLICY "token_metadata_create_access" ON token_metadata_overrides
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.is_active = true
            AND aw.role IN ('admin', 'editor')
        )
    );

-- Editors and admins can update tokens
CREATE POLICY "token_metadata_update_access" ON token_metadata_overrides
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.is_active = true
            AND aw.role IN ('admin', 'editor')
        )
    );

-- Only admins can permanently delete tokens
CREATE POLICY "token_metadata_delete_access" ON token_metadata_overrides
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.role = 'admin' 
            AND aw.is_active = true
        )
    );

-- Audit Log Policies
-- All authenticated users can create audit entries (handled by triggers)
CREATE POLICY "audit_log_create_access" ON audit_log
    FOR INSERT
    WITH CHECK (true);

-- Only admins can read audit logs
CREATE POLICY "audit_log_read_access" ON audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.role = 'admin' 
            AND aw.is_active = true
        )
    );

-- Create a function to set the current wallet context for RLS
CREATE OR REPLACE FUNCTION set_current_wallet(wallet_address VARCHAR)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;