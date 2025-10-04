import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = 'https://rqzklkmajrgfchsyvjgb.supabase.co';
// You need to get the service role key from your Supabase dashboard
// Go to Settings > API > service_role key
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemtsa21hanJnZmNoc3l2amdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0ODcwMywiZXhwIjoyMDc0NjI0NzAzfQ.8'; // Replace with actual service role key

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateQRCodeForUser(userData) {
  const qrData = {
    userId: userData.userId,
    userEmail: userData.userEmail,
    userName: userData.userName,
    generatedAt: new Date().toISOString(),
    type: 'user'
  };

  try {
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

async function generateQRCodesForAllUsers() {
  try {
    console.log('🚀 Starting QR code generation for all users...');

    // Get all profiles that don't have QR codes yet
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, qr_code')
      .is('qr_code', null);

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('✅ All users already have QR codes!');
      return;
    }

    console.log(`📊 Found ${profiles.length} users without QR codes`);

    let successCount = 0;
    let errorCount = 0;

    // Process each profile
    for (const profile of profiles) {
      try {
        console.log(`🔄 Processing user: ${profile.first_name} ${profile.last_name} (${profile.email})`);

        // Generate QR code
        const qrCodeDataURL = await generateQRCodeForUser({
          userId: profile.user_id,
          userEmail: profile.email || '',
          userName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Participant',
        });

        // Update profile with QR code
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            qr_code: qrCodeDataURL,
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`❌ Failed to update profile ${profile.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Generated QR code for ${profile.first_name} ${profile.last_name}`);
          successCount++;
        }

        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing user ${profile.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📈 QR Code Generation Summary:');
    console.log(`✅ Successfully generated: ${successCount} QR codes`);
    console.log(`❌ Failed to generate: ${errorCount} QR codes`);
    console.log(`📊 Total processed: ${profiles.length} users`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Run the script
generateQRCodesForAllUsers()
  .then(() => {
    console.log('🎉 QR code generation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
