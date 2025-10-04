import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://rqzklkmajrgfchsyvjgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemtsa21hanJnZmNoc3l2amdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg3MDMsImV4cCI6MjA3NDYyNDcwM30.BF-5YenFGTusvl8905oIBAFlVlCu-bHuRNDDCj693TQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection and tables...\n');

    // Test basic connection
    console.log('1. Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      return;
    }
    console.log('✅ Supabase connection successful');

    // Check profiles table structure
    console.log('\n2. Checking profiles table structure...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(3);

    if (profilesError) {
      console.error('❌ Failed to fetch profiles:', profilesError.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found in database');
      return;
    }

    console.log(`✅ Found ${profiles.length} profiles`);
    console.log('\n3. Profile structure:');
    const firstProfile = profiles[0];
    Object.keys(firstProfile).forEach(key => {
      console.log(`   - ${key}: ${typeof firstProfile[key]} ${firstProfile[key] === null ? '(NULL)' : ''}`);
    });

    console.log('\n4. Sample profile data:');
    profiles.forEach((profile, index) => {
      console.log(`\nProfile ${index + 1}:`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   QR Code: ${profile.qr_code === null ? 'NULL' : `${profile.qr_code.length} chars`}`);
    });

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// Run the check
checkDatabase()
  .then(() => {
    console.log('\n✅ Database check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });
