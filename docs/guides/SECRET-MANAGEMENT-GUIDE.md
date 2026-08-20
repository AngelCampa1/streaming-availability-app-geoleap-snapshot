# Secret Management Guide for StreamVPN (GeoLeap)

## 🔒 Overview

This document describes how secrets are managed in the StreamVPN project using .NET User Secrets for development and Azure Key Vault for production.

**Last Updated:** 2025-11-11
**Security Status:** ✅ All hardcoded secrets removed from source control

---

## Quick Start for Developers

### Setting Up Your Local Environment

1. **Install Required Tools**
   ```bash
   # .NET SDK 9.0 or later (includes User Secrets tool)
   dotnet --version
   ```

2. **Initialize User Secrets** (Already done - skip if User Secrets ID exists)
   ```bash
   cd backend/GeoLeap.Api
   dotnet user-secrets init
   ```

3. **Set Required Secrets**
   ```bash
   # JWT Secret (get from team lead or generate new for development)
   dotnet user-secrets set "JWT:Secret" "your-512-bit-secret-here"

   # Database Connection (development)
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,9020;Database=GeoLeap_Dev;User Id=sa;Password=your-password;TrustServerCertificate=True;MultipleActiveResultSets=true;Encrypt=False"

   # Redis Connection (development)
   dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379,abortConnect=false,allowAdmin=true,password=your-redis-password"

   # RapidAPI Key (get from rapidapi.com)
   dotnet user-secrets set "StreamingApi:ApiKey" "your-rapidapi-key"
   ```

4. **Verify Secrets Are Set**
   ```bash
   dotnet user-secrets list
   ```

5. **Run Application**
   ```bash
   dotnet run
   # Secrets will be automatically loaded from User Secrets
   ```

---

## Architecture

### Development Environment (.NET User Secrets)

**Storage Location:**
- Windows: `%APPDATA%\Microsoft\UserSecrets\<user_secrets_id>\secrets.json`
- Mac/Linux: `~/.microsoft/usersecrets/<user_secrets_id>/secrets.json`

**User Secrets ID:** `<your-user-secrets-id>` (see `GeoLeap.Api.csproj`)

**Advantages:**
- ✅ Never checked into source control
- ✅ Per-developer configuration
- ✅ Easy to manage with dotnet CLI
- ✅ Automatically loaded by ASP.NET Core configuration system

**Limitations:**
- ⚠️ Not encrypted at rest
- ⚠️ Development only (not for production)
- ⚠️ Local to each developer machine

### Production Environment (Azure Key Vault)

**Setup** (For production deployment):
```csharp
// Program.cs
var keyVaultName = configuration["KeyVaultName"];
if (!string.IsNullOrEmpty(keyVaultName))
{
    var keyVaultUri = new Uri($"https://{keyVaultName}.vault.azure.net/");
    configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential());
}
```

**Advantages:**
- ✅ Encrypted at rest and in transit
- ✅ Centralized secret management
- ✅ Automatic secret rotation support
- ✅ Access logging and auditing
- ✅ Integration with Azure services

---

## Configuration File Structure

### appsettings.json (Checked into Git)
Contains non-sensitive configuration and placeholders:
```json
{
  "JWT": {
    "Secret": "[Retrieved from Azure Key Vault]",
    "Issuer": "GeoLeap.Api",
    "Audience": "GeoLeap.Client"
  }
}
```

### appsettings.Development.json (Checked into Git)
Contains development-specific settings and placeholders:
```json
{
  "JWT": {
    "Secret": "Retrieved from User Secrets - run: dotnet user-secrets set JWT:Secret 'your-secret'",
    "Issuer": "GeoLeap.Api.Dev"
  }
}
```

### User Secrets (Not in Git)
Contains actual secrets for local development:
```json
{
  "JWT:Secret": "<64-char-random-secret>",
  "StreamingApi:ApiKey": "your-actual-rapidapi-key",
  "ConnectionStrings:DefaultConnection": "Server=localhost,9020;..."
}
```

---

## Secret Types and Generation

### 1. JWT Secret
**Purpose:** Sign and validate JSON Web Tokens for authentication

**Requirements:**
- Minimum 256 bits (32 characters)
- Recommended 512 bits (64 characters)
- Cryptographically secure random

**Generation:**
```bash
# Generate 512-bit secret (recommended)
openssl rand -base64 64

# Example output:
# <64-char-random-secret>
```

**Storage:**
```bash
dotnet user-secrets set "JWT:Secret" "$(openssl rand -base64 64)"
```

### 2. Database Password
**Purpose:** SQL Server authentication

**Requirements:**
- Minimum 16 characters
- Recommended 32+ characters
- Mix of uppercase, lowercase, numbers, symbols

**Generation:**
```bash
# Generate strong password
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Example output:
# <32-char-random-password>
```

**Storage:**
```bash
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,9020;Database=GeoLeap_Dev;User Id=sa;Password=$NEW_PASSWORD;TrustServerCertificate=True;MultipleActiveResultSets=true;Encrypt=False"
```

### 3. Redis Password
**Purpose:** Redis cache authentication

**Requirements:**
- Minimum 16 characters
- Recommended 32+ characters
- Alphanumeric

**Generation:**
```bash
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Example output:
# <32-char-random-password>
```

**Storage:**
```bash
NEW_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379,abortConnect=false,allowAdmin=true,password=$NEW_REDIS_PASSWORD"
```

### 4. RapidAPI Key
**Purpose:** External API authentication

**Generation:**
1. Login to https://rapidapi.com
2. Navigate to My Apps → Streaming Availability
3. Click "Generate New Key"
4. (Optional) Add IP restrictions
5. Copy key to User Secrets

**Storage:**
```bash
dotnet user-secrets set "StreamingApi:ApiKey" "your-new-rapidapi-key-here"
```

---

## Frontend Secret Management

### .env.local (Not in Git)
Contains frontend environment variables:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8020
PORT=3020
NEXT_PUBLIC_RAPIDAPI_STREAMING_HOST=streaming-availability.p.rapidapi.com
NEXT_PUBLIC_RAPIDAPI_STREAMING_KEY=your-rapidapi-key
```

### .env.local.template (Checked into Git)
Template showing required variables without actual secrets:
```bash
# Copy this to .env.local and fill in values
NEXT_PUBLIC_API_URL=http://localhost:8020
PORT=3020
NEXT_PUBLIC_RAPIDAPI_STREAMING_KEY=your-rapidapi-key-here
```

**Setup:**
```bash
cd frontend
cp .env.local.template .env.local
# Edit .env.local with actual values
```

---

## Secret Rotation Process

### When to Rotate Secrets

**Immediate Rotation Required:**
- ✅ Secret exposed in source control
- ✅ Secret exposed in logs or error messages
- ✅ Suspected compromise
- ✅ Former team member had access

**Regular Rotation Schedule:**
- JWT Secret: Every 90 days
- Database Passwords: Every 180 days
- API Keys: Annually or when provider recommends
- Redis Password: Every 180 days

### Rotation Procedure

**Step 1: Generate New Secret**
```bash
# Example: Rotate JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)
echo $NEW_JWT_SECRET
```

**Step 2: Update User Secrets (Development)**
```bash
dotnet user-secrets set "JWT:Secret" "$NEW_JWT_SECRET"
```

**Step 3: Update Azure Key Vault (Production)**
```bash
az keyvault secret set --vault-name "<your-key-vault>" --name "JWT--Secret" --value "$NEW_JWT_SECRET"
```

**Step 4: Deploy New Secret**
```bash
# For production, restart services to pick up new secret
az webapp restart --name <your-web-app> --resource-group <your-resource-group>
```

**Step 5: Validate**
```bash
# Test authentication still works
curl -X POST https://api.geoleap.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Step 6: Revoke Old Secret**
- For API keys: Delete old key from provider dashboard
- For passwords: Wait 24 hours grace period, then revoke
- For JWT: Old tokens expire naturally (15 min default)

---

## Security Best Practices

### DO ✅

1. **Use User Secrets for Development**
   ```bash
   dotnet user-secrets set "Key" "Value"
   ```

2. **Use Azure Key Vault for Production**
   ```csharp
   configuration.AddAzureKeyVault(keyVaultUri, credential);
   ```

3. **Generate Strong Secrets**
   ```bash
   openssl rand -base64 64  # For JWT
   openssl rand -base64 32  # For passwords
   ```

4. **Rotate Secrets Regularly**
   - Set calendar reminders
   - Document rotation dates
   - Automate where possible

5. **Use Environment Variables in CI/CD**
   ```yaml
   # .github/workflows/deploy.yml
   env:
     JWT_SECRET: ${{ secrets.JWT_SECRET }}
   ```

6. **Audit Secret Access**
   - Review Azure Key Vault logs monthly
   - Track who accessed secrets
   - Monitor for unusual patterns

### DON'T ❌

1. **Never Commit Secrets to Git**
   ```bash
   # BAD - Never do this
   git add appsettings.Development.json
   git commit -m "Add API key"
   ```

2. **Never Share Secrets in Plain Text**
   - ❌ Email
   - ❌ Slack/Teams messages
   - ❌ Text files
   - ✅ Use secure password managers (1Password, LastPass)

3. **Never Hardcode Secrets**
   ```csharp
   // BAD - Never do this
   var apiKey = "your-actual-api-key-here";
   ```

4. **Never Log Secrets**
   ```csharp
   // BAD - Never do this
   logger.LogInformation($"API Key: {apiKey}");

   // GOOD - Redact sensitive data
   logger.LogInformation($"API Key: {apiKey.Substring(0, 4)}...");
   ```

5. **Never Use Weak Secrets**
   ```bash
   # BAD examples:
   # - "password123"
   # - "mysecretkey"
   # - "admin"

   # GOOD example (cryptographically random):
   # - "<64-char-random-secret>"
   ```

6. **Never Expose Secrets in URLs**
   ```bash
   # BAD - Never put secrets in query params
   https://api.example.com/data?apiKey=SECRET_KEY

   # GOOD - Use Authorization header
   curl -H "Authorization: Bearer SECRET_KEY" https://api.example.com/data
   ```

---

## Troubleshooting

### "Configuration value not found"

**Problem:** Application can't find secret value

**Solution:**
```bash
# 1. Check if secret is set
dotnet user-secrets list

# 2. If not found, set it
dotnet user-secrets set "Key:Name" "value"

# 3. Verify User Secrets ID matches project
cat GeoLeap.Api.csproj | grep UserSecretsId
# Should show a GUID, e.g.: 00000000-0000-0000-0000-000000000000
```

### "Authentication failed" after secret rotation

**Problem:** Old tokens still in use after JWT secret rotation

**Solution:**
```bash
# Wait for tokens to expire (default: 15 minutes)
# Or force logout all users by changing JWT issuer temporarily
```

### "Database connection failed" after password change

**Problem:** SQL Server password changed but application using old password

**Solution:**
```bash
# 1. Update User Secret
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,9020;Database=GeoLeap_Dev;User Id=sa;Password=NEW_PASSWORD;..."

# 2. Restart application
dotnet run

# 3. Verify connection
dotnet test --filter "Category=Database"
```

### "Can't find secrets.json file"

**Problem:** User Secrets file doesn't exist

**Solution:**
```bash
# 1. Initialize User Secrets
cd backend/GeoLeap.Api
dotnet user-secrets init

# 2. Set secrets
dotnet user-secrets set "JWT:Secret" "your-secret"

# 3. Verify location
# Windows: %APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json
# Mac/Linux: ~/.microsoft/usersecrets/<UserSecretsId>/secrets.json
```

---

## Git History Cleanup (If Secrets Were Committed)

### Using BFG Repo-Cleaner (Recommended)

```bash
# 1. Install BFG
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Clone fresh mirror
git clone --mirror https://github.com/<owner>/<repo>.git

# 3. Create secrets file with exposed values
cat > secrets.txt <<EOF
your-exposed-api-key-here
your-exposed-password-here
your-exposed-secret-here
EOF

# 4. Run BFG
java -jar bfg.jar --replace-text secrets.txt geoleap.git

# 5. Clean up
cd geoleap.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Force push (DANGEROUS - coordinate with team)
git push --force
```

### Manual Approach (Alternative)

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/GeoLeap.Api/appsettings.Development.json" \
  --prune-empty --tag-name-filter cat -- --all

git push --force
```

---

## Onboarding New Developers

### Day 1 Setup Checklist

- [ ] Clone repository
- [ ] Install .NET SDK 9.0+
- [ ] Install Node.js 18+
- [ ] Run `dotnet user-secrets init` in backend/GeoLeap.Api
- [ ] Request secrets from team lead (via secure channel)
- [ ] Set all required User Secrets
- [ ] Copy frontend/.env.local.template to .env.local
- [ ] Fill in frontend environment variables
- [ ] Run `dotnet test` to verify setup (should pass 1,358 tests)
- [ ] Run `dotnet run` to start backend
- [ ] Run `npm run dev` in frontend to start frontend
- [ ] Verify you can access http://localhost:3020

### Getting Secrets from Team

**DO:**
- Request via 1Password shared vault
- Request via encrypted password manager
- Request via secure messaging (Signal, ProtonMail)

**DON'T:**
- Ask via Slack/Teams
- Ask via regular email
- Ask via text message

---

## Current secrets status

This is a portfolio snapshot of a project that is not deployed and has no live
environment, so there is no secret inventory to publish and nothing here is in
rotation. The tracking table that used to sit in this section named specific
credentials and their rotation state, which is exactly the kind of map an attacker
wants; it has been removed rather than sanitised.

The process above is the part worth reading: secrets live in .NET User Secrets for
development and a key vault for production, never in `appsettings*.json`, and the
rotation runbook applies to whichever secret needs it.

---

## References

- [ASP.NET Core User Secrets](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets)
- [Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**Maintained By:** StreamVPN Security Team
**Last Review:** 2025-11-11
**Next Review:** 2025-12-11 (Monthly)
