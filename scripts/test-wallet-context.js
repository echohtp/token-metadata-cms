const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testWalletContext() {
  try {
    const walletAddress = 'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd';
    
    console.log('Testing wallet context setting...');
    
    // Test setting wallet context
    const { data: setResult, error: setError } = await supabase.rpc('set_current_wallet', {
      wallet_address: walletAddress
    });
    
    if (setError) {
      console.error('❌ Error setting wallet context:', setError);
    } else {
      console.log('✅ Wallet context set successfully');
    }
    
    // Test the new authorization function
    console.log('\nTesting check_wallet_authorization...');
    const { data: authResult, error: authError } = await supabase.rpc('check_wallet_authorization', {
      wallet_addr: walletAddress
    });
    
    if (authError) {
      console.error('❌ Error checking authorization:', authError);
    } else {
      console.log('✅ Authorization check result:', authResult);
    }
    
    // Test if we can access tokens now
    console.log('\nTesting token access with RLS...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('token_metadata_overrides')
      .select('*')
      .limit(1);
    
    if (tokenError) {
      console.error('❌ Error accessing tokens:', tokenError);
    } else {
      console.log('✅ Can access tokens:', tokenData?.length || 0, 'found');
    }
    
  } catch (error) {
    console.error('Caught error:', error);
  }
}

testWalletContext();