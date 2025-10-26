# Database Setup Instructions

## Quick Setup

You need to run these SQL scripts **in order** in your Supabase SQL Editor:

### 1. Run Schema (Required)
Copy and paste `01-schema.sql` into your Supabase SQL Editor and run it.

### 2. Run Functions (Required) 
Copy and paste `02-functions-fixed.sql` (NOT the original 02-functions.sql) into your Supabase SQL Editor and run it.

### 3. Run RLS Policies (Required)
Copy and paste `03-rls-policies.sql` into your Supabase SQL Editor and run it.

### 4. Run Audit Triggers (Required)
Copy and paste `04-audit-triggers.sql` into your Supabase SQL Editor and run it.

### 5. Run Initial Setup (Required)
Copy and paste `05-initial-setup.sql` into your Supabase SQL Editor and run it.

## Missing Environment Variable

You need to add your Supabase anon key to `.env.local`. Get it from your Supabase project settings:

1. Go to https://supabase.com/dashboard/project/jdwwuchufsamsggwkdwo/settings/api
2. Copy the "anon public" key
3. Update `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
```

## Add Your First Admin User

After running all the database scripts, add your wallet address as the first admin:

```sql
INSERT INTO authorized_wallets (wallet_address, name, role, notes) 
VALUES (
    'YOUR_WALLET_ADDRESS_HERE', 
    'Initial Admin', 
    'admin', 
    'First admin wallet added during setup'
);
```

Replace `YOUR_WALLET_ADDRESS_HERE` with your actual Solana wallet address.

## Test the Setup

After completing the database setup and adding your admin wallet:

1. Run `npm run dev` in the project directory
2. Connect your wallet 
3. You should see the CMS interface

Let me know if you encounter any errors during the database setup!