-- Add initial admin user
-- Run this after completing the database setup (steps 1-5)

INSERT INTO authorized_wallets (wallet_address, name, role, notes) 
VALUES (
    'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd', 
    'Initial Admin', 
    'admin', 
    'First admin wallet added during setup'
) ON CONFLICT (wallet_address) DO NOTHING;

-- Verify the admin user was added
SELECT * FROM authorized_wallets WHERE wallet_address = 'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd';