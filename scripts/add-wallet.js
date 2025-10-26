const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function addWallet() {
  try {
    const walletAddress = 'JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd';
    
    // First check if wallet already exists
    const { data: existing, error: checkError } = await supabase
      .from('authorized_wallets')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (existing) {
      console.log('✅ Wallet already exists:', existing);
      
      // Update to make sure it's active and admin
      const { data: updated, error: updateError } = await supabase
        .from('authorized_wallets')
        .update({ 
          is_active: true,
          role: 'admin',
          name: 'Admin User'
        })
        .eq('wallet_address', walletAddress)
        .select();
      
      if (updateError) {
        console.error('❌ Error updating wallet:', updateError);
      } else {
        console.log('✅ Wallet updated successfully:', updated);
      }
    } else {
      // Add new wallet
      const { data: newWallet, error: insertError } = await supabase
        .from('authorized_wallets')
        .insert({
          wallet_address: walletAddress,
          name: 'Admin User',
          role: 'admin',
          is_active: true,
          created_by: walletAddress,
          notes: 'Initial admin user'
        })
        .select();
      
      if (insertError) {
        console.error('❌ Error adding wallet:', insertError);
      } else {
        console.log('✅ Wallet added successfully:', newWallet);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addWallet();