import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = 'https://rqzklkmajrgfchsyvjgb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemtsa21hanJnZmNoc3l2amdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODcwMywiZXhwIjoyMDc0NjI0NzAzfQ.8'; // Replace with actual service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testServiceConnection() {
  try {
    console.log('🔍 Testing service role connection...\n');

    // Test basic connection
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, qr_code')
      .limit(5);

    if (error) {
      console.error('❌ Service role connection failed:', error.message);
      console.log('\n💡 Make sure you have the complete service role key from:');
      console.log('   Supabase Dashboard → Settings → API → service_role key');
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found (this might be expected if table is empty)');
      return;
    }

    console.log(`✅ Service role connection successful!`);
    console.log(`📊 Found ${profiles.length} profiles:\n`);

    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.first_name} ${profile.last_name}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   QR Code: ${profile.qr_code === null ? 'NULL' : `${profile.qr_code.length} chars`}`);
      console.log('');
    });

    console.log('🚀 Ready to generate QR codes!');

  } catch (error) {
    console.error('💥 Error:', error.message);
    console.log('\n💡 The service role key might be incomplete or incorrect.');
    console.log('   Please check your Supabase dashboard for the complete key.');
  }
}

// Run the test
testServiceConnection()
  .then(() => {
    console.log('\n✅ Service connection test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
