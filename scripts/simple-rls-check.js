const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function simpleCheck() {
  try {
    // Try basic table access
    const { data, error } = await supabase
      .from('token_metadata_overrides')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Error accessing token_metadata_overrides:', error);
      console.log('This suggests RLS might be enabled and blocking access');
    } else {
      console.log('✅ Can access token_metadata_overrides table');
      console.log('Rows found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Sample row:', data[0]);
      }
    }
    
    // Check authorized wallets
    const { data: walletData, error: walletError } = await supabase
      .from('authorized_wallets')
      .select('*')
      .limit(5);
    
    if (walletError) {
      console.log('❌ Error accessing authorized_wallets:', walletError);
    } else {
      console.log('✅ Can access authorized_wallets table');
      console.log('Wallets found:', walletData?.length || 0);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

simpleCheck();