const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function enableRLS() {
  try {
    console.log('Enabling Row Level Security...');
    
    // Read the RLS policies file
    const rlsPoliciesPath = path.join(__dirname, '..', 'database', '03-rls-policies.sql');
    const rlsPolicies = fs.readFileSync(rlsPoliciesPath, 'utf8');
    
    // Split into individual statements
    const statements = rlsPolicies
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      console.log(`SQL: ${statement.substring(0, 60)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: statement + ';' 
      });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        console.log('Statement:', statement);
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('\n🎉 RLS setup completed!');
    
    // Verify RLS is enabled
    console.log('\nVerifying RLS status...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname, 
          tablename, 
          rowsecurity 
        FROM pg_tables 
        WHERE tablename IN ('token_metadata_overrides', 'authorized_wallets', 'audit_log')
        AND schemaname = 'public'
      `
    });
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS Status:', rlsStatus);
    }
    
  } catch (error) {
    console.error('❌ Failed to enable RLS:', error);
    process.exit(1);
  }
}

// Create exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE sql;
        GET DIAGNOSTICS result = ROW_COUNT;
        RETURN json_build_object('rows_affected', result);
      EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
      END;
      $$;
    `
  });
  
  if (error && !error.message.includes('already exists')) {
    console.log('Creating exec_sql function...');
    // Function creation might fail, but let's try anyway
  }
}

async function main() {
  await createExecSqlFunction();
  await enableRLS();
}

main();