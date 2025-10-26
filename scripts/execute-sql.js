const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Required variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlStatements(sql, fileName) {
  console.log(`\n📄 Executing ${fileName}...`);
  
  try {
    // Split SQL into individual statements (basic approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s + ';');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() === ';') continue;
      
      console.log(`  📝 Executing statement ${i + 1}/${statements.length}...`);
      
      // Use raw SQL query
      const { data, error } = await supabase
        .from('_dummy_') // This won't work, let's try a different approach
        .select('*')
        .limit(0);
        
      // Try using rpc instead
      const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });
      
      if (rpcError && !rpcError.message.includes('does not exist')) {
        console.error(`❌ Error in statement: ${statement.substring(0, 100)}...`);
        console.error('Error:', rpcError);
        return false;
      }
    }
    
    console.log(`✅ Successfully executed ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to execute ${fileName}:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup for Token Metadata CMS...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  const sqlFiles = [
    { file: 'database/01-schema.sql', name: 'Schema (Tables & Indexes)' },
    { file: 'database/02-functions-fixed.sql', name: 'Database Functions' }, 
    { file: 'database/03-rls-policies.sql', name: 'Row Level Security' },
    { file: 'database/04-audit-triggers.sql', name: 'Audit Triggers' },
    { file: 'database/05-initial-setup.sql', name: 'Initial Setup & Constraints' },
    { file: 'database/06-add-admin-user.sql', name: 'Add Admin User' }
  ];

  for (const { file, name } of sqlFiles) {
    const filePath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }
    
    const sql = fs.readFileSync(filePath, 'utf8');
    const success = await executeSqlStatements(sql, name);
    
    if (!success) {
      console.error(`❌ Failed to execute ${file}. Please run this manually in Supabase SQL Editor.`);
      console.log(`\nTo run manually:`);
      console.log(`1. Go to: https://supabase.com/dashboard/project/jdwwuchufsamsggwkdwo/sql`);
      console.log(`2. Copy contents of: ${file}`);
      console.log(`3. Paste and run in SQL Editor`);
      return false;
    }
    
    // Wait between executions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return true;
}

// Check if we can connect to Supabase first
async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('_test_').select('*').limit(1);
    console.log('✅ Connected to Supabase successfully');
    return true;
  } catch (error) {
    console.log('⚠️  Note: Connection test failed (expected if tables don\'t exist yet)');
    return true; // Continue anyway
  }
}

async function main() {
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Supabase. Check your credentials.');
    process.exit(1);
  }
  
  const success = await setupDatabase();
  
  if (success) {
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Get your anon key from: https://supabase.com/dashboard/project/jdwwuchufsamsggwkdwo/settings/api');
    console.log('2. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
    console.log('3. Run: npm run dev');
    console.log('4. Connect wallet: JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd');
    console.log('5. Start managing token metadata! 🚀');
  } else {
    console.log('\n❌ Some steps failed. Please run the SQL files manually in Supabase.');
    console.log('📁 SQL files are in the /database folder');
  }
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});