-- Enable Row Level Security on all tables
ALTER TABLE authorized_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_metadata_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "authorized_wallets_admin_access" ON authorized_wallets;
DROP POLICY IF EXISTS "token_metadata_read_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_create_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_update_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "token_metadata_delete_access" ON token_metadata_overrides;
DROP POLICY IF EXISTS "audit_log_create_access" ON audit_log;
DROP POLICY IF EXISTS "audit_log_read_access" ON audit_log;

-- Authorized Wallets Policies - Only admins can manage
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

-- Token Metadata Policies - All authenticated users can read, editors+ can modify
CREATE POLICY "token_metadata_read_access" ON token_metadata_overrides
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM authorized_wallets aw 
            WHERE aw.wallet_address = current_setting('app.current_wallet', true)
            AND aw.is_active = true
            AND aw.role IN ('admin', 'editor', 'viewer')
        )
    );

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
CREATE POLICY "audit_log_create_access" ON audit_log
    FOR INSERT
    WITH CHECK (true);

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