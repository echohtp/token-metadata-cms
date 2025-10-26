-- Add the missing set_current_wallet function
CREATE OR REPLACE FUNCTION set_current_wallet(wallet_address VARCHAR)
RETURNS VOID 
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('app.current_wallet', wallet_address, true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_current_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_wallet TO anon;