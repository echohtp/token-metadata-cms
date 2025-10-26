const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function testUsersApi() {
  try {
    console.log('Testing get_authorized_wallets function...');
    
    const { data, error } = await supabase.rpc('get_authorized_wallets');
    
    if (error) {
      console.error('❌ Function error:', error);
    } else {
      console.log('✅ Function result:', data);
    }
    
    // Also test direct table access
    console.log('\nTesting direct authorized_wallets access...');
    const { data: directData, error: directError } = await supabase
      .from('authorized_wallets')
      .select('*');
    
    if (directError) {
      console.error('❌ Direct access error:', directError);
    } else {
      console.log('✅ Direct access result:', directData);
    }
    
  } catch (error) {
    console.error('Caught error:', error);
  }
}

testUsersApi();