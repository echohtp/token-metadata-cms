const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvValue = (key) => {
  const match = envContent.match(new RegExp(`${key}="([^"]+)"`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAdminUser() {
  console.log('👤 Adding admin user...');
  
  const adminWallet = 'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd';
  
  try {
    // First check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('authorized_wallets')
      .select('count(*)')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Tables may not exist yet. Please run the SQL files manually in Supabase SQL Editor.');
      console.log('Go to: https://supabase.com/dashboard/project/jdwwuchufsamsggwkdwo/sql');
      console.log('And run the SQL files in order from the /database folder');
      return;
    }
    
    // Try to insert admin user
    const { data, error } = await supabase
      .from('authorized_wallets')
      .upsert({
        wallet_address: adminWallet,
        name: 'Initial Admin',
        role: 'admin',
        notes: 'First admin wallet added during setup'
      }, {
        onConflict: 'wallet_address'
      })
      .select();

    if (error) {
      console.error('❌ Error adding admin user:', error);
      console.log('\n💡 Please run this SQL manually in Supabase SQL Editor:');
      console.log(`
INSERT INTO authorized_wallets (wallet_address, name, role, notes) 
VALUES (
    '${adminWallet}', 
    'Initial Admin', 
    'admin', 
    'First admin wallet added during setup'
) ON CONFLICT (wallet_address) DO NOTHING;
      `);
    } else {
      console.log('✅ Admin user added successfully!');
      console.log(`👤 Wallet: ${adminWallet}`);
      console.log('🔑 Role: admin');
    }
    
  } catch (error) {
    console.error('❌ Failed to add admin user:', error.message);
  }
}

addAdminUser();