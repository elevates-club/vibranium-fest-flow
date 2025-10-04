import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://rqzklkmajrgfchsyvjgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemtsa21hanJnZmNoc3l2amdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg3MDMsImV4cCI6MjA3NDYyNDcwM30.BF-5YenFGTusvl8905oIBAFlVlCu-bHuRNDDCj693TQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQRCodeStatus() {
  try {
    console.log('🔍 Checking QR code status in database...\n');

    // Get all profiles
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, qr_code')
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles found in database');
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles in database:\n`);

    let withQR = 0;
    let withoutQR = 0;

    profiles.forEach((profile, index) => {
      const hasQR = profile.qr_code !== null && profile.qr_code !== '';
      const qrStatus = hasQR ? '✅ HAS QR' : '❌ NO QR';
      
      console.log(`${index + 1}. ${profile.first_name} ${profile.last_name} (${profile.email})`);
      console.log(`   User ID: ${profile.user_id}`);
      console.log(`   QR Status: ${qrStatus}`);
      if (hasQR) {
        console.log(`   QR Length: ${profile.qr_code.length} characters`);
      }
      console.log('');

      if (hasQR) withQR++;
      else withoutQR++;
    });

    console.log('📈 Summary:');
    console.log(`✅ Users with QR codes: ${withQR}`);
    console.log(`❌ Users without QR codes: ${withoutQR}`);
    console.log(`📊 Total users: ${profiles.length}`);

    if (withoutQR > 0) {
      console.log('\n🚀 Ready to generate QR codes for users without them!');
    } else {
      console.log('\n🎉 All users already have QR codes!');
    }

  } catch (error) {
    console.error('💥 Error checking QR code status:', error);
  }
}

// Run the check
checkQRCodeStatus()
  .then(() => {
    console.log('\n✅ QR code status check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });
