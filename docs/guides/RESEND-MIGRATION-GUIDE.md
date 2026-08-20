# Resend Email Migration Guide

## Overview
This guide covers the steps needed to complete the migration from Azure Communication Services (ACS) to Resend for transactional email delivery.

**Status**: ✅ Code implementation complete, DNS setup required

---

## What You Need to Do

### Step 1: Create Resend Account (5 minutes)

1. Go to https://resend.com/signup
2. Create an account (free tier: 3,000 emails/month)
3. Verify your account via email

### Step 2: Add Domain in Resend Dashboard (10 minutes)

1. Log into Resend dashboard: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter: `mail.geoleap.app`
4. Choose your DNS provider (e.g., Cloudflare, Azure DNS, GoDaddy)

### Step 3: Configure DNS Records (15-30 minutes)

Resend will provide specific DNS records. Add these to your DNS provider:

#### Required DNS Records

| Type | Name/Host | Value | TTL |
|------|-----------|-------|-----|
| **TXT** | `mail` | `v=spf1 include:_spf.resend.com ~all` | 3600 |
| **TXT** | `resend._domainkey.mail` | *(DKIM key from Resend dashboard)* | 3600 |
| **TXT** | `_dmarc.mail` | `v=DMARC1; p=quarantine; rua=mailto:hello@example.com` | 3600 |
| **MX** | `mail` | *(MX record from Resend dashboard)* | 3600 |

**Important Notes:**
- Copy the DKIM key EXACTLY as shown in Resend dashboard
- DNS propagation can take 15 minutes to 24 hours
- Resend will auto-verify once DNS propagates

#### How to Add DNS Records

**If using Cloudflare:**
1. Go to cloudflare.com → Select geoleap.app domain
2. Navigate to DNS → Records
3. Click "Add record" for each entry above
4. Save changes

**If using Azure DNS:**
1. Azure Portal → DNS zones → geoleap.app
2. Add each record type as specified
3. Save changes

### Step 4: Verify Domain in Resend (5 minutes)

1. In Resend dashboard, click **"Verify DNS Records"** next to your domain
2. Wait for all checks to turn green ✅
3. Domain status should change to **"Verified"**

If verification fails:
- Wait 30 minutes for DNS propagation
- Use https://mxtoolbox.com to verify DNS records are published
- Check for typos in DNS records

### Step 5: Get Resend API Key (2 minutes)

1. In Resend dashboard, go to **API Keys**: https://resend.com/api-keys
2. Click **"Create API Key"**
3. Name it: `GeoLeap Production`
4. Select permissions: **"Sending access"**
5. Copy the API key (starts with `re_`)

**⚠️ CRITICAL**: Save this key immediately - you can only see it once!

### Step 6: Configure Production API Key (5 minutes)

**Option A: Azure Key Vault (Recommended for Production)**
1. Azure Portal → Key Vaults → Your vault
2. Add secret: `Resend--ApiKey` (value: `re_xxxxx`)
3. Update app configuration to read from Key Vault

**Option B: User Secrets (Development)**
```bash
cd backend/GeoLeap.Api
dotnet user-secrets set "Resend:ApiKey" "re_xxxxx"
```

**Option C: Environment Variables (Production)**
```bash
# Configure in the production deployment platform
Resend__ApiKey=re_xxxxx
```

### Step 7: Email Forwarding Setup (10 minutes)

Configure these email addresses to forward to `hello@example.com`:

| Email Address | Purpose |
|---------------|---------|
| support@geoleap.app | Customer support inquiries |
| contact@geoleap.app | General contact form |
| feedback@geoleap.app | Product feedback |
| billing@geoleap.app | Billing inquiries |

**How to Set Up Forwarding:**

**Option A: Email Forwarding Rules (Domain Registrar)**
1. Log into your domain registrar (where geoleap.app is registered)
2. Navigate to Email → Email Forwarding
3. Add each forwarding rule above
4. Verify by sending test emails

**Option B: Catch-All Forwarding**
1. Set up catch-all: `*@geoleap.app` → `hello@example.com`
2. Simpler but forwards ALL emails

**Option C: Third-Party Email Service**
- Use Cloudflare Email Routing (free)
- Use Google Workspace
- Use Microsoft 365

### Step 8: Test Email Delivery (10 minutes)

Once DNS is verified and API key is configured:

1. **Start the backend**:
   ```bash
   cd backend
   dotnet run --project GeoLeap.Api
   ```

2. **Send a test email** via API:
   ```bash
   curl -X POST https://api.geoleap.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-test-email@example.com",
       "password": "Test123!",
       "firstName": "Test"
     }'
   ```

3. **Check Resend Dashboard**:
   - Go to https://resend.com/emails
   - Verify email was sent
   - Check delivery status

4. **Check Your Inbox**:
   - Look for "Welcome to GeoLeap" email
   - Verify HTML rendering
   - Click links to test

### Step 9: Monitor & Verify (Ongoing)

**For First 48 Hours:**
- Monitor Resend dashboard for delivery rates
- Check Application Insights for errors
- Verify no email-related errors in logs

**Success Criteria:**
- ✅ Domain verified in Resend
- ✅ Test welcome email received
- ✅ Email forwarding working
- ✅ No errors in application logs
- ✅ 95%+ delivery rate in Resend dashboard

---

## Rollback Plan (If Issues Occur)

If you encounter problems, you can quickly rollback to ACS:

1. **Update appsettings.json**:
   ```json
   "EmailProvider": "AzureCommunicationServices"
   ```

2. **Restart application**:
   ```bash
   # On production VM
   cd /data
   docker compose restart geoleap-api
   ```

3. **Verify ACS is working**:
   - Check logs for "Email sent successfully" messages
   - Send test email

**ACS code is still intact** - no code changes needed for rollback!

---

## Troubleshooting

### Issue: "Resend:ApiKey not configured" Error

**Solution**:
```bash
# Check if API key is set
dotnet user-secrets list

# If not set, add it
dotnet user-secrets set "Resend:ApiKey" "re_xxxxx"
```

### Issue: DNS Records Not Verifying

**Solutions**:
1. Wait 30-60 minutes for DNS propagation
2. Verify DNS with: https://mxtoolbox.com/SuperTool.aspx
3. Check for typos in DNS records
4. Ensure no conflicting records exist
5. Try flushing local DNS: `ipconfig /flushdns` (Windows)

### Issue: Emails Not Being Received

**Check**:
1. Spam/junk folder
2. Resend dashboard → Emails → Check status
3. Application logs for errors
4. Verify `EmailProvider` is set to `Resend` in config

### Issue: "Type or namespace name 'Resend' could not be found"

**Solution**:
```bash
cd backend
dotnet restore
dotnet build
```

---

## Cost Estimation

| Plan | Monthly Cost | Emails/Month |
|------|--------------|--------------|
| Free | $0 | 3,000 |
| Pro | $20 | 50,000 |
| Scale | $90 | 100,000 |

**Current Usage Estimate**: ~500-1,000 emails/month
**Recommended**: Start with Free tier, upgrade if needed

---

## Testing Checklist

Before marking as complete, test all email types:

- [ ] Welcome email (user registration)
- [ ] Password reset email
- [ ] Password reset confirmation
- [ ] Subscription created email
- [ ] Payment receipt email
- [ ] Invoice email with PDF attachment
- [ ] Email forwarding (support@geoleap.app)

---

## Production Deployment Checklist

- [ ] DNS records added and verified in Resend
- [ ] Resend API key configured in production
- [ ] Email forwarding rules set up
- [ ] Test emails sent and received successfully
- [ ] Application logs show no email errors
- [ ] Resend dashboard shows successful deliveries
- [ ] Update deployment documentation
- [ ] Notify team of new email system

---

## Support & Resources

- **Resend Dashboard**: https://resend.com/domains
- **Resend Documentation**: https://resend.com/docs
- **DNS Verification Tool**: https://mxtoolbox.com
- **Code Location**: `backend/GeoLeap.Api/Services/ResendEmailService.cs`
- **Tests Location**: `backend/GeoLeap.Api.Tests/Services/ResendEmailServiceTests.cs`

---

## Post-Migration (After 2 Weeks)

Once Resend is stable:

1. **Consider removing ACS**:
   - Remove `Azure.Communication.Email` NuGet package
   - Delete `AcsEmailService.cs`
   - Remove ACS configuration from appsettings.json

2. **Update documentation**:
   - Deployment guide
   - Runbooks
   - API key rotation procedures

---

## Questions?

If you encounter any issues not covered here, check:
1. Application logs: `/var/log/geoleap-api/`
2. Resend dashboard: https://resend.com/emails
3. This repository's Issues tab
