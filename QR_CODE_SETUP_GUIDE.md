# QR Code Setup Guide for Vibranium 5.0

## 🚀 Quick Setup Steps

### Step 1: Apply Database Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Copy the contents of `APPLY_QR_MIGRATION.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the migration

3. **Verify Migration**
   - Go to **Table Editor** → **profiles** table
   - You should see new columns:
     - `qr_code_data` (text)
     - `participant_id` (varchar)
     - `qr_code_generated_at` (timestamptz)

### Step 2: Generate QR Codes for Existing Users

1. **Run the QR Code Generation Script**
   ```bash
   npm run generate-qr-codes
   ```

2. **What the Script Does**
   - Fetches all users without QR codes
   - Generates unique QR codes for each user
   - Updates the database with QR code data
   - Shows progress and results

3. **Expected Output**
   ```
   🚀 Starting QR code generation for all users...
   📊 Found 8 users without QR codes
   🔄 Processing user: John Doe (john@example.com)
   ✅ Generated QR code for John Doe
   ...
   📈 QR Code Generation Summary:
   ✅ Successfully generated: 8 QR codes
   ❌ Failed to generate: 0 QR codes
   📊 Total processed: 8 users
   ```

### Step 3: Verify QR Codes in Database

1. **Check Supabase Table**
   - Go to **Table Editor** → **profiles**
   - The `qr_code_data` column should now contain base64 encoded QR codes
   - The `participant_id` column should contain unique IDs like "VIB123ABC"

2. **Test in Application**
   - Login to the application
   - Go to Dashboard
   - You should see the "My Digital Pass" section with your QR code

## 🔧 Technical Details

### Database Schema Changes

The migration adds these columns to the `profiles` table:

```sql
-- New columns
qr_code_data TEXT                    -- Base64 encoded QR code image
participant_id VARCHAR(20) UNIQUE   -- Unique participant ID (e.g., VIB123ABC)
qr_code_generated_at TIMESTAMPTZ    -- When QR code was generated
```

### QR Code Data Structure

Each QR code contains this JSON data:

```json
{
  "userId": "user-uuid",
  "userEmail": "user@example.com", 
  "userName": "John Doe",
  "generatedAt": "2025-01-04T10:00:00Z",
  "type": "user"
}
```

### Functions Created

1. **`generate_participant_id()`**
   - Creates unique participant IDs
   - Format: VIB + timestamp + random string
   - Example: VIB1735996800ABC123

2. **`set_participant_id()`**
   - Trigger function for new users
   - Automatically assigns participant ID on profile creation

## 🎯 How It Works

### For Users (Participants)
1. **Digital Pass**: Each user gets a unique digital pass in their dashboard
2. **QR Code**: Contains their participant ID and user data
3. **Download/Share**: Can download or share their pass
4. **Event Entry**: Show QR code to volunteers for check-in

### For Volunteers
1. **QR Scanner**: Use camera to scan participant QR codes
2. **Real-time Validation**: Instantly verify participant identity
3. **Event Check**: Confirm participant is registered for the event
4. **Manual Entry**: Fallback option for manual participant ID entry

## 🛠️ Troubleshooting

### Common Issues

1. **Migration Fails**
   - Check if columns already exist
   - Verify database permissions
   - Run migration in smaller chunks

2. **QR Code Generation Fails**
   - Check Supabase connection
   - Verify environment variables
   - Check console for specific errors

3. **QR Codes Not Showing**
   - Clear browser cache
   - Check if user is logged in
   - Verify QR code data in database

### Manual QR Code Generation

If the script fails, you can manually generate QR codes:

1. **For Individual Users**
   ```sql
   UPDATE profiles 
   SET participant_id = generate_participant_id()
   WHERE id = 'user-uuid';
   ```

2. **Check QR Code Data**
   ```sql
   SELECT id, participant_id, qr_code_data, qr_code_generated_at
   FROM profiles 
   WHERE qr_code_data IS NOT NULL;
   ```

## 📱 Testing the System

### Test QR Code Generation
1. Login to the application
2. Go to Dashboard
3. Check if "My Digital Pass" section appears
4. Verify QR code is displayed
5. Test download/share functionality

### Test QR Code Scanning
1. Login as a volunteer
2. Go to Volunteer Dashboard
3. Use QR Scanner tool
4. Scan a participant's QR code
5. Verify user information appears

## 🔒 Security Considerations

1. **QR Code Data**: Contains user ID and email - keep secure
2. **Participant IDs**: Unique identifiers - don't expose unnecessarily
3. **Database Access**: Ensure proper RLS policies are in place
4. **Camera Permissions**: QR scanner requires camera access

## 📊 Monitoring

### Check QR Code Status
```sql
-- Count users with QR codes
SELECT COUNT(*) as users_with_qr_codes
FROM profiles 
WHERE qr_code_data IS NOT NULL;

-- Count users without QR codes
SELECT COUNT(*) as users_without_qr_codes
FROM profiles 
WHERE qr_code_data IS NULL;
```

### Recent QR Code Generation
```sql
-- Users who got QR codes recently
SELECT first_name, last_name, participant_id, qr_code_generated_at
FROM profiles 
WHERE qr_code_generated_at >= NOW() - INTERVAL '1 day'
ORDER BY qr_code_generated_at DESC;
```

## 🎉 Success Indicators

✅ **Migration Applied**: New columns visible in profiles table
✅ **QR Codes Generated**: All users have qr_code_data populated
✅ **Digital Pass Working**: Users can see their QR codes in dashboard
✅ **Scanner Working**: Volunteers can scan QR codes successfully
✅ **Data Validation**: Scanned QR codes show correct user information

---

**Need Help?** Check the console logs or contact support if you encounter any issues!
