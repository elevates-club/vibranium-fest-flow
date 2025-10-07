# 🧪 How to Test the QR Scanner

## Quick Test Guide - 5 Minutes

### Step 1: Start the Application
```bash
npm run dev
```
Open: `http://localhost:5173` (or your dev URL)

---

### Step 2: Navigate to QR Scanner
1. Login as a **volunteer** user
2. Go to **Volunteer Dashboard**
3. Click on **QR Check-in** or **Scanner** section
4. You should see the camera scanner interface

---

### Step 3: Test Permission Button ✅

**What You Should See:**

```
┌────────────────────────────────────┐
│   📷 Camera Icon                   │
│   "Camera not active"              │
│                                    │
│  [🛡️ Allow Camera Access] Button  │
│                                    │
│  💡 Help text about privacy        │
└────────────────────────────────────┘
```

**Action:** Click the **"Allow Camera Access"** button

**Expected Result:**
- ✅ Browser shows permission popup
- ✅ Popup asks to allow camera access
- ✅ Button shows "Requesting Permission..." with loading icon

---

### Step 4: Grant Permission ✅

**Action:** Click **"Allow"** in browser popup

**Expected Result:**
```
┌────────────────────────────────────┐
│  ✅ Camera access granted! ✓       │
│                                    │
│  Click "Start Camera Scan" below   │
│  to begin scanning QR codes.       │
│                                    │
│  [📷 Start Camera Scan] Button     │
└────────────────────────────────────┘
```

---

### Step 5: Start Camera ✅

**Action:** Click **"Start Camera Scan"** button

**Expected Result:**
- ✅ Live camera feed appears
- ✅ Square scanning box overlay visible (250x250px)
- ✅ Text appears: "📱 Position QR code in frame"
- ✅ "Stop Camera" button visible

**Camera View:**
```
┌────────────────────────────────────┐
│  ╔══════════════════════════════╗ │
│  ║                              ║ │
│  ║   📹 LIVE CAMERA FEED        ║ │
│  ║                              ║ │
│  ║      ┌────────────┐          ║ │
│  ║      │ Scan Box   │          ║ │
│  ║      │            │          ║ │
│  ║      └────────────┘          ║ │
│  ║                              ║ │
│  ║  Position QR code in frame   ║ │
│  ╚══════════════════════════════╝ │
│                                    │
│  [⏹️ Stop Camera] Button           │
└────────────────────────────────────┘
```

---

### Step 6: Test QR Code Scanning ✅

**You need a test QR code. Two options:**

#### Option A: Use Manual Entry (Quick Test)
1. Switch to **"Manual Entry"** tab
2. Enter test token: `VIB1234ABCD`
3. Select an event
4. Click "Check In Participant"

#### Option B: Generate Real QR Code
1. Login as a **participant** 
2. Go to your **Profile/Dashboard**
3. Click **"Generate QR Code"** or **"My Digital Pass"**
4. Your QR code will show a token like: `VIB1234ABCD`
5. Use this QR code with the scanner

**Expected Result:**
- ✅ QR code detected within 1-2 seconds
- ✅ Toast notification: "QR Code Detected"
- ✅ Camera stops automatically
- ✅ User info appears for verification

---

### Step 7: Test Error Scenarios ⚠️

#### Test 7.1: Deny Permission
1. Refresh page
2. Click "Allow Camera Access"
3. Click **"Block"** in browser popup

**Expected Result:**
```
┌────────────────────────────────────┐
│  ❌ Permission Denied               │
│                                    │
│  Camera access blocked. Please:    │
│  1. Click 🔒 icon in address bar  │
│  2. Select "Allow" for camera      │
│  3. Click button below             │
│                                    │
│  [🔄 Request Camera Access Again]  │
└────────────────────────────────────┘
```

#### Test 7.2: Retry After Denial
1. Click **"Request Camera Access Again"**
2. This time click **"Allow"**
3. Should work normally

---

## 🎯 Quick Checklist

### ✅ All Tests Passing?

- [ ] **Permission button visible** when camera not active
- [ ] **Browser popup appears** when button clicked
- [ ] **Camera feed displays** after permission granted
- [ ] **Scanning box overlay** visible when scanning
- [ ] **QR code detection works** (manual or camera)
- [ ] **Camera stops** after successful scan
- [ ] **Error messages clear** when permission denied
- [ ] **Retry button works** after errors
- [ ] **Mobile responsive** (test on phone if available)

---

## 🐛 Troubleshooting

### Camera Not Showing?

**Check:**
1. ✅ Using Chrome, Firefox, or Safari (not IE)
2. ✅ On HTTPS or localhost
3. ✅ Camera not blocked in browser settings
4. ✅ Camera not in use by another app
5. ✅ Device has a working camera

**Fix:**
- Clear browser cache and reload
- Check browser camera settings
- Close other apps using camera
- Try different browser

### Permission Popup Not Appearing?

**Check:**
1. ✅ Browser allows popups
2. ✅ Not in private/incognito mode (some browsers block)
3. ✅ Button actually clicked (must be user action)

**Fix:**
- Look for blocked popup icon in address bar
- Allow popups for this site
- Reload and try again

### QR Code Not Detected?

**Check:**
1. ✅ QR code is clear and not blurry
2. ✅ Good lighting conditions
3. ✅ QR code within scanning box
4. ✅ Camera focused (not too close/far)

**Fix:**
- Adjust distance (8-12 inches ideal)
- Improve lighting
- Clean camera lens
- Try manual entry instead

---

## 📱 Mobile Testing

### iOS (Safari)
1. Open in Safari (required for camera)
2. Tap "Allow Camera Access"
3. Tap "Allow" in iOS permission dialog
4. Camera should use **back camera** automatically

### Android (Chrome)
1. Open in Chrome
2. Tap "Allow Camera Access"
3. Tap "Allow" in Android permission dialog
4. Camera should use **back camera** automatically

**Note:** Mobile browsers may behave differently. Always test on actual devices!

---

## ✅ Success Criteria

**Your QR scanner is working if:**

1. ✅ Permission button triggers browser popup
2. ✅ Camera feed appears after permission granted
3. ✅ QR codes are detected successfully
4. ✅ Camera stops after detection
5. ✅ Error messages are clear and helpful
6. ✅ Works on mobile devices
7. ✅ No console errors

---

## 🎉 If All Tests Pass

**Congratulations!** Your QR check-in scanner is:
- ✅ Secure (token-based)
- ✅ User-friendly (clear permission flow)
- ✅ Functional (camera works, QR detection works)
- ✅ Robust (error handling in place)
- ✅ Production ready!

**Next Steps:**
1. Test with real event check-ins
2. Train volunteers on usage
3. Prepare backup manual entry process
4. Monitor for any issues in production

---

**Need Help?** Check the comprehensive guides:
- `CAMERA_PERMISSION_GUIDE.md` - Technical details
- `QR_SCANNER_COMPLETE_SUMMARY.md` - Full overview
- `QR_CHECK_IN_IMPROVEMENTS.md` - Security improvements

