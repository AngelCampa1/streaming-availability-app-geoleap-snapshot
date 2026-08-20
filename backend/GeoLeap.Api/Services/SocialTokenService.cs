using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Secure OAuth token management service with encryption
/// </summary>
public class SocialTokenService : ISocialTokenService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;
    private readonly ISocialPlatformProviderFactory _providerFactory;
    
    private readonly string _encryptionKey;
    private readonly string _currentKeyId;

    public SocialTokenService(
        ApplicationDbContext context,
        ILoggerService logger,
        IConfiguration configuration,
        ISocialPlatformProviderFactory providerFactory)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _providerFactory = providerFactory;
        
        // Get encryption key from configuration (should be stored securely in production)
        _encryptionKey = _configuration["SocialAuth:EncryptionKey"] ?? 
            throw new InvalidOperationException("SocialAuth:EncryptionKey is not configured");
        _currentKeyId = _configuration["SocialAuth:KeyId"] ?? "default-key-v1";
    }

    public async Task<ServiceResult> StoreTokensAsync(string platform, Guid userId, OAuthTokens tokens)
    {
        try
        {
            // Check if tokens already exist
            var existingToken = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform.ToLower());

            if (existingToken != null)
            {
                // Update existing tokens
                existingToken.EncryptedAccessToken = EncryptToken(tokens.AccessToken);
                existingToken.EncryptedRefreshToken = string.IsNullOrEmpty(tokens.RefreshToken) 
                    ? null : EncryptToken(tokens.RefreshToken);
                existingToken.Scope = tokens.Scope;
                existingToken.ExpiresAt = tokens.IssuedAt.AddSeconds(tokens.ExpiresIn);
                existingToken.LastRefreshed = DateTime.UtcNow;
                existingToken.IsValid = true;
                existingToken.EncryptionKeyId = _currentKeyId;
                existingToken.Metadata = tokens.AdditionalData ?? new Dictionary<string, object>();
            }
            else
            {
                // Create new token record
                var tokenRecord = new OAuthToken
                {
                    UserId = userId,
                    Platform = platform.ToLower(),
                    EncryptedAccessToken = EncryptToken(tokens.AccessToken),
                    EncryptedRefreshToken = string.IsNullOrEmpty(tokens.RefreshToken) 
                        ? null : EncryptToken(tokens.RefreshToken),
                    Scope = tokens.Scope,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = tokens.IssuedAt.AddSeconds(tokens.ExpiresIn),
                    TokenType = tokens.TokenType,
                    IsValid = true,
                    EncryptionKeyId = _currentKeyId,
                    Metadata = tokens.AdditionalData ?? new Dictionary<string, object>()
                };

                _context.OAuthTokens.Add(tokenRecord);
            }

            await _context.SaveChangesAsync();

            LogTokenUsage(platform, userId, "store", true);

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error storing OAuth tokens for platform {Platform}", platform);
            LogTokenUsage(platform, userId, "store", false, ex.Message);
            
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to store OAuth tokens" 
            };
        }
    }

    public async Task<OAuthTokens?> GetTokensAsync(string platform, Guid userId)
    {
        try
        {
            var tokenRecord = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && 
                                         t.Platform == platform.ToLower() && 
                                         t.IsValid);

            if (tokenRecord == null)
            {
                return null;
            }

            // Check if tokens are expired
            if (tokenRecord.ExpiresAt <= DateTime.UtcNow)
            {
                _logger.LogError($"Tokens expired for platform {platform}, user {userId}");
                return null;
            }

            // Decrypt tokens
            var accessToken = DecryptToken(tokenRecord.EncryptedAccessToken, tokenRecord.EncryptionKeyId ?? _currentKeyId);
            var refreshToken = string.IsNullOrEmpty(tokenRecord.EncryptedRefreshToken) 
                ? null 
                : DecryptToken(tokenRecord.EncryptedRefreshToken, tokenRecord.EncryptionKeyId ?? _currentKeyId);

            // Update last used timestamp
            tokenRecord.LastUsed = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            LogTokenUsage(platform, userId, "retrieve", true);

            return new OAuthTokens
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                TokenType = tokenRecord.TokenType,
                ExpiresIn = (int)(tokenRecord.ExpiresAt - DateTime.UtcNow).TotalSeconds,
                Scope = tokenRecord.Scope,
                IssuedAt = tokenRecord.CreatedAt,
                AdditionalData = tokenRecord.Metadata
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving OAuth tokens for platform {Platform}", platform);
            LogTokenUsage(platform, userId, "retrieve", false, ex.Message);
            
            return null;
        }
    }

    public async Task<TokenRefreshResult> RefreshTokensAsync(string platform, Guid userId)
    {
        try
        {
            var tokenRecord = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform.ToLower());

            if (tokenRecord == null)
            {
                return new TokenRefreshResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No tokens found to refresh" 
                };
            }

            if (string.IsNullOrEmpty(tokenRecord.EncryptedRefreshToken))
            {
                return new TokenRefreshResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No refresh token available" 
                };
            }

            // Decrypt refresh token
            var refreshToken = DecryptToken(tokenRecord.EncryptedRefreshToken, tokenRecord.EncryptionKeyId ?? _currentKeyId);

            // Use platform provider to refresh tokens
            var provider = await _providerFactory.GetProviderAsync(platform);
            var refreshResult = await provider.RefreshTokensAsync(refreshToken);

            if (!refreshResult.IsSuccess || refreshResult.Tokens == null)
            {
                // Mark tokens as invalid if refresh failed
                tokenRecord.IsValid = false;
                await _context.SaveChangesAsync();

                LogTokenUsage(platform, userId, "refresh", false, refreshResult.ErrorMessage);

                return new TokenRefreshResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = refreshResult.ErrorMessage ?? "Failed to refresh tokens" 
                };
            }

            // Update stored tokens
            tokenRecord.EncryptedAccessToken = EncryptToken(refreshResult.Tokens.AccessToken);
            
            // Update refresh token if a new one was provided
            if (!string.IsNullOrEmpty(refreshResult.Tokens.RefreshToken))
            {
                tokenRecord.EncryptedRefreshToken = EncryptToken(refreshResult.Tokens.RefreshToken);
            }

            tokenRecord.ExpiresAt = refreshResult.Tokens.IssuedAt.AddSeconds(refreshResult.Tokens.ExpiresIn);
            tokenRecord.LastRefreshed = DateTime.UtcNow;
            tokenRecord.IsValid = true;
            tokenRecord.Scope = refreshResult.Tokens.Scope;
            
            // Update metadata if provided
            if (refreshResult.Tokens.AdditionalData != null)
            {
                tokenRecord.Metadata = refreshResult.Tokens.AdditionalData;
            }

            await _context.SaveChangesAsync();

            LogTokenUsage(platform, userId, "refresh", true);

            return new TokenRefreshResult
            {
                IsSuccess = true,
                ExpiresAt = tokenRecord.ExpiresAt,
                UpdatedScopes = refreshResult.Tokens.Scope.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing OAuth tokens for platform {Platform}", platform);
            LogTokenUsage(platform, userId, "refresh", false, ex.Message);
            
            return new TokenRefreshResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to refresh OAuth tokens" 
            };
        }
    }

    public async Task<bool> ValidateTokensAsync(string platform, Guid userId)
    {
        try
        {
            var tokenRecord = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && 
                                         t.Platform == platform.ToLower() && 
                                         t.IsValid);

            if (tokenRecord == null)
            {
                return false;
            }

            // Check if tokens are expired (with 5 minute buffer for refresh)
            if (tokenRecord.ExpiresAt <= DateTime.UtcNow.AddMinutes(5))
            {
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating OAuth tokens for platform {Platform}", platform);
            return false;
        }
    }

    public async Task<ServiceResult> RevokeTokensAsync(string platform, Guid userId)
    {
        try
        {
            var tokenRecord = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform.ToLower());

            if (tokenRecord == null)
            {
                return new ServiceResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No tokens found to revoke" 
                };
            }

            // Attempt to revoke tokens with the platform
            try
            {
                var accessToken = DecryptToken(tokenRecord.EncryptedAccessToken, tokenRecord.EncryptionKeyId ?? _currentKeyId);
                var provider = await _providerFactory.GetProviderAsync(platform);
                await provider.RevokeTokenAsync(accessToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to revoke tokens with platform {platform}, proceeding with local deletion");
            }

            // Remove token record
            _context.OAuthTokens.Remove(tokenRecord);
            await _context.SaveChangesAsync();

            LogTokenUsage(platform, userId, "revoke", true);

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking OAuth tokens for platform {Platform}", platform);
            LogTokenUsage(platform, userId, "revoke", false, ex.Message);
            
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to revoke OAuth tokens" 
            };
        }
    }

    public async Task<TokenExpiryInfo?> GetTokenExpiryAsync(string platform, Guid userId)
    {
        try
        {
            var tokenRecord = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform.ToLower());

            if (tokenRecord == null)
            {
                return null;
            }

            var now = DateTime.UtcNow;
            var timeUntilExpiry = tokenRecord.ExpiresAt - now;

            return new TokenExpiryInfo
            {
                ExpiresAt = tokenRecord.ExpiresAt,
                IsExpired = tokenRecord.ExpiresAt <= now,
                TimeUntilExpiry = timeUntilExpiry > TimeSpan.Zero ? timeUntilExpiry : TimeSpan.Zero,
                HasRefreshToken = !string.IsNullOrEmpty(tokenRecord.EncryptedRefreshToken)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting token expiry for platform {Platform}", platform);
            return null;
        }
    }

    public async Task UpdateTokenMetadataAsync(string platform, Guid userId, Dictionary<string, object> metadata)
    {
        try
        {
            var tokenRecord = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform.ToLower());

            if (tokenRecord != null)
            {
                // Merge existing metadata with new metadata
                var existingMetadata = tokenRecord.Metadata ?? new Dictionary<string, object>();
                foreach (var kvp in metadata)
                {
                    existingMetadata[kvp.Key] = kvp.Value;
                }
                
                tokenRecord.Metadata = existingMetadata;
                await _context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating token metadata for platform {Platform}", platform);
        }
    }

    public async Task<List<ExpiringToken>> GetExpiringTokensAsync(TimeSpan beforeExpiry)
    {
        try
        {
            var cutoffTime = DateTime.UtcNow.Add(beforeExpiry);

            var expiringTokens = await _context.OAuthTokens
                .Where(t => t.IsValid && 
                           t.ExpiresAt <= cutoffTime && 
                           !string.IsNullOrEmpty(t.EncryptedRefreshToken))
                .Select(t => new ExpiringToken
                {
                    UserId = t.UserId,
                    Platform = t.Platform,
                    ExpiresAt = t.ExpiresAt,
                    HasRefreshToken = !string.IsNullOrEmpty(t.EncryptedRefreshToken)
                })
                .ToListAsync();

            return expiringTokens;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving expiring tokens");
            return new List<ExpiringToken>();
        }
    }

    public async Task<ServiceResult> RotateEncryptionKeysAsync()
    {
        try
        {
            // This is a complex operation that would involve:
            // 1. Generating a new encryption key
            // 2. Re-encrypting all existing tokens with the new key
            // 3. Updating the key ID
            // 4. Keeping old keys for a transition period
            
            // For now, we'll log that this operation was requested
            _logger.LogError("Encryption key rotation requested - this should be implemented with proper key management");
            
            // In a production system, this would use Azure Key Vault, AWS KMS, or similar
            // to manage encryption keys securely
            
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Key rotation not implemented - requires secure key management system" 
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rotating encryption keys");
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to rotate encryption keys" 
            };
        }
    }

    public void LogTokenUsage(string platform, Guid userId, string operation, bool success, string? errorMessage = null)
    {
        try
        {
            _logger.LogBusinessEvent($"TokenUsage_{operation}", new 
            { 
                Platform = platform,
                UserId = userId,
                Success = success,
                ErrorMessage = errorMessage,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging token usage");
        }
    }

    private string EncryptToken(string token)
    {
        try
        {
            using var aes = Aes.Create();
            aes.Key = DeriveKeyFromPassword(_encryptionKey);
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();
            ms.Write(aes.IV, 0, aes.IV.Length); // Prepend IV

            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            using (var writer = new StreamWriter(cs))
            {
                writer.Write(token);
            }

            return Convert.ToBase64String(ms.ToArray());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error encrypting token");
            throw new InvalidOperationException("Failed to encrypt token");
        }
    }

    private string DecryptToken(string encryptedToken, string keyId)
    {
        try
        {
            var encryptedData = Convert.FromBase64String(encryptedToken);
            
            using var aes = Aes.Create();
            aes.Key = DeriveKeyFromPassword(_encryptionKey); // In production, use keyId to get correct key

            // Extract IV from the beginning of the encrypted data
            var iv = new byte[aes.BlockSize / 8];
            Array.Copy(encryptedData, 0, iv, 0, iv.Length);
            aes.IV = iv;

            // Decrypt the remaining data
            using var decryptor = aes.CreateDecryptor();
            using var ms = new MemoryStream(encryptedData, iv.Length, encryptedData.Length - iv.Length);
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var reader = new StreamReader(cs);
            
            return reader.ReadToEnd();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error decrypting token");
            throw new InvalidOperationException("Failed to decrypt token");
        }
    }

    private byte[] DeriveKeyFromPassword(string password)
    {
        // Use PBKDF2 to derive a key from the password
        using var pbkdf2 = new Rfc2898DeriveBytes(
            password, 
            Encoding.UTF8.GetBytes("GeoLeapSocialAuth2024"), // Salt - should be configurable
            100000, // Iterations
            HashAlgorithmName.SHA256
        );
        
        return pbkdf2.GetBytes(32); // 256-bit key
    }
}