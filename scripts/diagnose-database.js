// Diagnostic script to check database setup
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function diagnoseDatabaseSetup() {
  console.log('🔍 Diagnosing database setup...\n');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
    return;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('✅ Environment variables found');
  console.log(`📡 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  // Check 1: Can we connect?
  try {
    console.log('1️⃣ Testing database connection...');
    const { data, error } = await supabase.from('_dummy_').select().limit(1);
    // This will fail but should give us connection info
    console.log('✅ Database connection established\n');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }

  // Check 2: Does vocabulary table exist?
  console.log('2️⃣ Checking vocabulary table...');
  try {
    const { data, error } = await supabase.from('vocabulary').select('id').limit(1);
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation') || error.code === 'PGRST116') {
        console.log('❌ Vocabulary table does not exist');
        console.log('   👉 Run: scripts/sql/create_vocabulary_table.sql in Supabase SQL Editor\n');
      } else {
        console.log('❌ Vocabulary table error:', error.message);
        console.log('   👉 Check table permissions and RLS policies\n');
      }
    } else {
      console.log('✅ Vocabulary table exists');
      
      // Check vocabulary data
      const { data: countData, count } = await supabase
        .from('vocabulary')
        .select('id', { count: 'exact', head: true });
      console.log(`   📊 Contains ${count || 0} vocabulary words\n`);
      
      if (!count || count === 0) {
        console.log('❌ Vocabulary table is empty');
        console.log('   👉 Run: scripts/sql/vocabulary_data_inserts.sql in Supabase SQL Editor');
        console.log('   👉 Or use Supabase Dashboard CSV import\n');
      } else {
        console.log(`✅ Vocabulary table has ${count} words`);
        
        // Show a few sample words
        const { data: sampleData } = await supabase
          .from('vocabulary')
          .select('id, word')
          .limit(3);
        
        if (sampleData && sampleData.length > 0) {
          console.log(`   📝 Sample words: ${sampleData.map(w => w.word).join(', ')}\n`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error checking vocabulary table:', err.message);
  }

  // Check 3: Does generatequizquestion function exist?
  console.log('3️⃣ Checking generatequizquestion function...');
  try {
    const { data, error } = await supabase.rpc('generatequizquestion', { word_id: 1 });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ generatequizquestion function does not exist');
        console.log('   👉 Run: scripts/sql/create_generatequizquestion_function.sql in Supabase SQL Editor\n');
      } else if (error.message.includes('Insufficient vocabulary data')) {
        console.log('✅ generatequizquestion function exists (but no vocabulary data)');
      } else {
        console.log('❌ generatequizquestion function error:', error.message);
      }
    } else {
      console.log('✅ generatequizquestion function exists and working');
      if (data) {
        console.log(`   📝 Sample result: word="${data.word}", options=${data.options?.length} items\n`);
      }
    }
  } catch (err) {
    console.error('❌ Error checking generatequizquestion function:', err.message);
  }

  // Check 4: Other required tables
  console.log('4️⃣ Checking other tables...');
  
  const tables = ['quiz_scores', 'daily_streaks'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error && (error.message.includes('does not exist') || error.code === 'PGRST116')) {
        console.log(`❌ ${table} table does not exist`);
      } else {
        console.log(`✅ ${table} table exists`);
      }
    } catch (err) {
      console.log(`❌ Error checking ${table} table:`, err.message);
    }
  }

  console.log('\n📋 Summary:');
  console.log('To fix failing tests, make sure all database objects exist:');
  console.log('1. Create vocabulary table');
  console.log('2. Import vocabulary data (497 words)');
  console.log('3. Create generatequizquestion function');
  console.log('4. Run tests again: npm run test:db');
}

diagnoseDatabaseSetup().catch(console.error);