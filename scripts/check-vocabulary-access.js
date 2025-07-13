// Check if RLS is blocking vocabulary access
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkVocabularyAccess() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('🔍 Checking vocabulary table access...\n');

  // Test 1: Try to select with no auth
  console.log('1️⃣ Testing anonymous access...');
  try {
    const { data, error, count } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact' })
      .limit(3);

    console.log('Query result:');
    console.log('- Data:', data ? `${data.length} rows` : 'null');
    console.log('- Count:', count);
    console.log('- Error:', error ? error.message : 'none');
    
    if (error) {
      console.log('- Error code:', error.code);
      console.log('- Error details:', error.details);
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }

  console.log('\n2️⃣ Testing different query approaches...');
  
  // Test 2: Try direct count
  try {
    const { count } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });
    console.log('Direct count result:', count);
  } catch (err) {
    console.error('Direct count error:', err.message);
  }

  // Test 3: Try simple select without count
  try {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('id, word')
      .limit(1);
    console.log('Simple select - Data:', data);
    console.log('Simple select - Error:', error);
  } catch (err) {
    console.error('Simple select error:', err.message);
  }

  console.log('\n🔧 Possible issues:');
  console.log('1. RLS policy blocks anonymous users');
  console.log('2. Vocabulary data not imported');  
  console.log('3. Wrong table name or schema');
  console.log('\n💡 Solutions:');
  console.log('1. Check RLS policies in Supabase Dashboard');
  console.log('2. Verify vocabulary data is imported');
  console.log('3. Try signing in with a test user');
}

checkVocabularyAccess().catch(console.error);