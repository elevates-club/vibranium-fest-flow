import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// Initialize Supabase client with your project details
const supabaseUrl = 'https://rqzklkmajrgfchsyvjgb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemtsa21hanJnZmNoc3l2amdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg3MDMsImV4cCI6MjA3NDYyNDcwM30.BF-5YenFGTusvl8905oIBAFlVlCu-bHuRNDDCj693TQ';

const supabase = createClient(supabaseUrl, supabaseKey);

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
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'L'
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

async function regenerateQRCodesWithNewSettings() {
  try {
    console.log('🚀 Regenerating QR codes with simplified settings...');

    // Get all profiles that have QR codes (to regenerate them)
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email, qr_code_data')
      .not('qr_code_data', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch profiles: ${fetchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profiles with QR codes found');
      return;
    }

    console.log(`📊 Found ${profiles.length} users with existing QR codes`);

    // Filter profiles to only include those with event registrations
    const profilesWithRegistrations = [];
    
    for (const profile of profiles) {
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', profile.user_id);
      
      if (registrations && registrations.length > 0) {
        profilesWithRegistrations.push(profile);
      }
    }

    console.log(`📊 Found ${profilesWithRegistrations.length} users with event registrations`);

    if (profilesWithRegistrations.length === 0) {
      console.log('ℹ️ No users with event registrations found');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each profile with event registrations
    for (const profile of profilesWithRegistrations) {
      try {
        console.log(`🔄 Regenerating QR code for: ${profile.first_name} ${profile.last_name} (${profile.email})`);

        // Generate new simplified QR code
        const qrCodeDataURL = await generateQRCodeForUser({
          userId: profile.user_id,
          userEmail: profile.email || '',
          userName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Participant',
        });

        // Update profile with new QR code
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            qr_code_data: qrCodeDataURL,
            qr_code_generated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`❌ Failed to update profile ${profile.id}:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Regenerated QR code for ${profile.first_name} ${profile.last_name}`);
          successCount++;
        }

        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing user ${profile.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n📈 QR Code Regeneration Summary:');
    console.log(`✅ Successfully regenerated: ${successCount} QR codes`);
    console.log(`❌ Failed to regenerate: ${errorCount} QR codes`);
    console.log(`📊 Total processed: ${profilesWithRegistrations.length} users with event registrations`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Run the script
regenerateQRCodesWithNewSettings()
  .then(() => {
    console.log('🎉 QR code regeneration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
