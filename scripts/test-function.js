const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testFunction() {
  try {
    const walletAddress = 'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd';
    
    console.log('Testing is_wallet_authorized function...');
    
    const { data, error } = await supabase.rpc('is_wallet_authorized', {
      p_wallet_address: walletAddress
    });
    
    if (error) {
      console.error('❌ Function error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Function result:', data);
    }
    
    // Also test direct table access
    console.log('\nTesting direct table access...');
    const { data: directData, error: directError } = await supabase
      .from('authorized_wallets')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('is_active', true);
    
    if (directError) {
      console.error('❌ Direct access error:', directError);
    } else {
      console.log('✅ Direct access result:', directData);
    }
    
  } catch (error) {
    console.error('Caught error:', error);
  }
}

testFunction();