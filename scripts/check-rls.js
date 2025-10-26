const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkRLS() {
  try {
    console.log('Checking current table structure...');
    
    // Try to query the tables directly
    const { data: tokenData, error: tokenError } = await supabase
      .from('token_metadata_overrides')
      .select('count(*)')
      .limit(1);
    
    if (tokenError) {
      console.log('❌ Error accessing token_metadata_overrides:', tokenError);
    } else {
      console.log('✅ Can access token_metadata_overrides table');
    }
    
    const { data: walletData, error: walletError } = await supabase
      .from('authorized_wallets')
      .select('count(*)')
      .limit(1);
    
    if (walletError) {
      console.log('❌ Error accessing authorized_wallets:', walletError);
    } else {
      console.log('✅ Can access authorized_wallets table');
    }
    
    // Check if functions exist
    const { data: functionData, error: functionError } = await supabase
      .rpc('is_wallet_authorized', { p_wallet_address: 'test' });
    
    if (functionError) {
      console.log('❌ is_wallet_authorized function error:', functionError);
    } else {
      console.log('✅ is_wallet_authorized function exists');
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkRLS();