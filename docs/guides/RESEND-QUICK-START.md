# Resend Email - Quick Start Guide

**5-Minute Setup** for testing Resend email integration.

---

## Prerequisites

- Resend account (free): https://resend.com/signup
- Domain verified in Resend (see RESEND-MIGRATION-GUIDE.md for DNS setup)

---

## Quick Setup (3 Steps)

### Step 1: Get Your Resend API Key (2 minutes)

1. Login to Resend: https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name: `GeoLeap Test`
4. Copy the key (starts with `re_`)

### Step 2: Configure API Key (1 minute)

```bash
cd backend/GeoLeap.Api
dotnet user-secrets set "Resend:ApiKey" "re_xxxxx"
```

### Step 3: Test Email Service (2 minutes)

```bash
cd backend
dotnet run --project GeoLeap.Api -- test-resend your-email@example.com
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════════╗
║          Resend Email Service Test Tool                       ║
╚════════════════════════════════════════════════════════════════╝

✓ API Key configured: re_xxxxxxx...
✓ From Address: noreply@mail.geoleap.app
✓ From Name: GeoLeap
✓ Test Email: your-email@example.com

═══════════════════════════════════════════════════════════════
Test 1: Sending Welcome Email...
═══════════════════════════════════════════════════════════════
✓ Welcome email sent successfully!

═══════════════════════════════════════════════════════════════
Test 2: Sending Password Reset Email...
═══════════════════════════════════════════════════════════════
✓ Password reset email sent successfully!

═══════════════════════════════════════════════════════════════
Test 3: Sending Subscription Email...
═══════════════════════════════════════════════════════════════
✓ Subscription email sent successfully!

═══════════════════════════════════════════════════════════════
Test Summary
═══════════════════════════════════════════════════════════════
✓ ALL TESTS PASSED (3/3)

Check your inbox at: your-email@example.com
Also check Resend dashboard: https://resend.com/emails
```

---

## Verify Results

1. **Check Your Inbox**:
   - Look for 3 emails from "GeoLeap"
   - Subject lines: "Welcome to GeoLeap", "Reset Your Password", "Welcome to GeoLeap Premium"

2. **Check Resend Dashboard**:
   - Go to: https://resend.com/emails
   - Verify 3 emails with status "Delivered"

---

## Troubleshooting

### Error: "Resend:ApiKey not configured"

**Solution:**
```bash
# Check if key is set
dotnet user-secrets list

# Set the key
dotnet user-secrets set "Resend:ApiKey" "re_xxxxx"
```

### Error: "Domain not verified"

**Solution:**
You can still test with the free Resend domain. The from address will be:
- Test: `onboarding@resend.dev`
- Production requires: DNS verification for `mail.geoleap.app`

See `docs/RESEND-MIGRATION-GUIDE.md` for DNS setup.

### No Emails Received

**Check:**
1. Spam/junk folder
2. Resend dashboard for delivery status
3. Email address is correct
4. API key is valid

---

## Next Steps

Once testing is successful:

1. **Production DNS Setup**: Follow `docs/RESEND-MIGRATION-GUIDE.md`
2. **Email Forwarding**: Configure support@, contact@, etc.
3. **Production API Key**: Use separate key for production
4. **Monitoring**: Set up alerts in Resend dashboard

---

## Run Automated Tests

```bash
# Run all Resend tests
cd backend
dotnet test --filter "FullyQualifiedName~ResendEmailService"

# Expected: 46 tests passed (34 unit + 12 integration)
```

---

## Full Documentation

- **Setup Guide**: `docs/RESEND-MIGRATION-GUIDE.md`
- **Verification Report**: `docs/RESEND-VERIFICATION-REPORT.md`
- **Code**: `backend/GeoLeap.Api/Services/ResendEmailService.cs`
- **Tests**: `backend/GeoLeap.Api.Tests/Services/ResendEmailServiceTests.cs`

---

**Ready to go!** 🚀 Your email system is now powered by Resend.
