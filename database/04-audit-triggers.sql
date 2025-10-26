-- Audit Triggers for Token Metadata CMS

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            table_name, operation, old_values, wallet_address
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD),
            current_setting('app.current_wallet', true)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            table_name, operation, old_values, new_values, wallet_address
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW),
            current_setting('app.current_wallet', true)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            table_name, operation, new_values, wallet_address
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(NEW),
            current_setting('app.current_wallet', true)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to all tables
DROP TRIGGER IF EXISTS audit_authorized_wallets_trigger ON authorized_wallets;
CREATE TRIGGER audit_authorized_wallets_trigger
    AFTER INSERT OR UPDATE OR DELETE ON authorized_wallets
    FOR EACH ROW EXECUTE FUNCTION audit_changes();

DROP TRIGGER IF EXISTS audit_token_metadata_trigger ON token_metadata_overrides;
CREATE TRIGGER audit_token_metadata_trigger
    AFTER INSERT OR UPDATE OR DELETE ON token_metadata_overrides
    FOR EACH ROW EXECUTE FUNCTION audit_changes();