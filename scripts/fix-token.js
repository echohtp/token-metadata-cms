const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixToken() {
  try {
    // Update the token to be active
    const { data, error } = await supabase
      .from('token_metadata_overrides')
      .update({ is_active: true })
      .eq('mint', '2oQNkePakuPbHzrVVkQ875WHeewLHCd2cAwfwiLQbonk')
      .select();
    
    if (error) {
      console.log('❌ Error updating token:', error);
    } else {
      console.log('✅ Token updated successfully:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixToken();