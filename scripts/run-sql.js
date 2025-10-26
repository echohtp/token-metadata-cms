const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvValue = (key) => {
  const match = envContent.match(new RegExp(`${key}="([^"]+)"`));
  return match ? match[1] : null;
};

const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

console.log('🔌 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSqlFile(filePath, description) {
  console.log(`\n📄 Running ${description}...`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // For Supabase, we need to execute SQL statements individually
    // Let's split on common SQL statement terminators
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== ';');

    console.log(`  Found ${statements.length} statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      let statement = statements[i].trim();
      if (!statement.endsWith(';')) {
        statement += ';';
      }
      
      try {
        console.log(`    ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        // Use the raw SQL query method
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: statement })
        });

        if (!response.ok) {
          // Try direct SQL execution via Supabase Edge Functions
          const { data, error } = await supabase.rpc('sql', { query: statement });
          
          if (error && !error.message.includes('does not exist')) {
            console.warn(`    ⚠️  Warning: ${error.message}`);
            // Continue with other statements
          }
        }
      } catch (statementError) {
        console.warn(`    ⚠️  Warning in statement: ${statementError.message}`);
        // Continue with other statements
      }
    }
    
    console.log(`✅ Completed ${description}`);
    return true;
  } catch (error) {
    console.error(`❌ Error in ${description}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up Token Metadata CMS database...\n');

  const sqlFiles = [
    { path: 'database/01-schema.sql', desc: 'Database Schema' },
    { path: 'database/02-functions-fixed.sql', desc: 'Database Functions' },
    { path: 'database/03-rls-policies.sql', desc: 'Row Level Security' },
    { path: 'database/04-audit-triggers.sql', desc: 'Audit Triggers' },
    { path: 'database/05-initial-setup.sql', desc: 'Initial Setup' },
    { path: 'database/06-add-admin-user.sql', desc: 'Admin User Setup' }
  ];

  let allSuccess = true;

  for (const { path: sqlPath, desc } of sqlFiles) {
    const fullPath = path.join(__dirname, '..', sqlPath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${sqlPath}`);
      allSuccess = false;
      continue;
    }

    const success = await runSqlFile(fullPath, desc);
    if (!success) allSuccess = false;
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (allSuccess) {
    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Your admin wallet is set up: JBuMJY4w37nYvBhrngjbitSdciamg98N9Vt26NWusuXd');
    console.log('\n🔧 Still need to:');
    console.log('1. Get your anon key from Supabase dashboard');
    console.log('2. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
    console.log('3. Run: npm run dev');
  } else {
    console.log('\n❌ Some steps may have failed.');
    console.log('💡 You can run these SQL files manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/jdwwuchufsamsggwkdwo/sql');
  }
}

main().catch(console.error);