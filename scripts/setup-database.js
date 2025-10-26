const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSqlFile(filePath) {
  console.log(`\n📄 Executing ${filePath}...`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error(`❌ Error in ${filePath}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully executed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to read or execute ${filePath}:`, error.message);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  const sqlFiles = [
    'database/01-schema.sql',
    'database/02-functions-fixed.sql', 
    'database/03-rls-policies.sql',
    'database/04-audit-triggers.sql',
    'database/05-initial-setup.sql',
    'database/06-add-admin-user.sql'
  ];

  for (const file of sqlFiles) {
    const filePath = path.join(__dirname, '..', file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }
    
    const success = await executeSqlFile(filePath);
    if (!success) {
      console.error(`❌ Failed to execute ${file}. Stopping setup.`);
      process.exit(1);
    }
    
    // Wait a bit between executions
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 Database setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Add your NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
  console.log('2. Run: npm run dev');
  console.log('3. Connect your wallet and start using the CMS!');
}

setupDatabase().catch(error => {
  console.error('❌ Database setup failed:', error);
  process.exit(1);
});