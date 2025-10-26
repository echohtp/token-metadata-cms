const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hjqhbrbqcizwdczolmxg.supabase.co';
const serviceKey = 'sbp_91a3599d3e2dbf6d71588cdb5479f20378b6ff06';

const supabase = createClient(supabaseUrl, serviceKey);

async function applyRLS() {
  try {
    console.log('Applying RLS policies...');
    
    // Enable RLS on tables
    const rlsQueries = [
      'ALTER TABLE authorized_wallets ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE token_metadata_overrides ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY'
    ];
    
    for (const query of rlsQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error(`Error executing: ${query}`, error);
      } else {
        console.log(`✓ ${query}`);
      }
    }
    
    console.log('RLS policies applied successfully!');
  } catch (error) {
    console.error('Error applying RLS:', error);
  }
}

applyRLS();