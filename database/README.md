# Database Setup for Token Metadata CMS

This directory contains the SQL scripts to set up your Supabase database for the Token Metadata CMS.

## Setup Instructions

Run these scripts **in order** in your Supabase SQL editor:

### 1. Create Schema
```sql
-- Run: 01-schema.sql
```
Creates the main tables:
- `authorized_wallets` - User permissions
- `token_metadata_overrides` - Token data  
- `audit_log` - Change tracking

### 2. Add Functions
```sql
-- Run: 02-functions.sql
```
Creates database functions for:
- Data validation
- CRUD operations
- Authorization checks

### 3. Configure Security
```sql
-- Run: 03-rls-policies.sql
```
Sets up Row Level Security policies for access control.

### 4. Enable Auditing
```sql
-- Run: 04-audit-triggers.sql
```
Creates audit triggers to track all changes.

### 5. Initial Setup
```sql
-- Run: 05-initial-setup.sql
```
Adds data validation constraints and setup instructions.

## Post-Setup Configuration

### Add Your First Admin User

After running all scripts, add your wallet address as the first admin:

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

### Environment Variables

Make sure to set these in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SOLANA_RPC_URL=your-custom-rpc-endpoint
```

## Database Schema Overview

### authorized_wallets
- Stores wallet addresses and their permission levels
- Roles: `admin`, `editor`, `viewer`
- Admins can manage users, editors can manage tokens, viewers are read-only

### token_metadata_overrides
- Stores token metadata based on V1 featured_mints structure
- Fields: mint, name, logo, description, social URLs
- Tracks who created/updated each entry

### audit_log
- Complete audit trail of all changes
- Tracks wallet address, operation type, and data changes
- Admins can view full audit history

## Security Features

- **Row Level Security**: Database-level access control
- **Input Validation**: Prevents invalid data and XSS
- **Audit Logging**: Complete change tracking
- **URL Validation**: Prevents malicious links
- **Role-based Access**: Admin/Editor/Viewer permissions

## Functions Available

- `is_wallet_authorized(address)` - Check wallet permissions
- `get_token_metadata_overrides()` - List tokens with search
- `upsert_token_metadata()` - Create/update tokens
- `add_authorized_wallet()` - Add new users (admin only)
- `set_current_wallet()` - Set context for RLS

The application uses these functions through the Supabase client for type-safe database operations.