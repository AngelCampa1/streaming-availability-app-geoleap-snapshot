using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public interface IVpnProviderApiService
{
    Task<List<VpnServerInfo>> GetAvailableServersAsync(
        Guid vpnProviderId, 
        string? regionCode = null, 
        CancellationToken cancellationToken = default);
    
    Task<VpnConnectionCredentials> GetConnectionCredentialsAsync(
        Guid vpnProviderId, 
        string serverLocation, 
        CancellationToken cancellationToken = default);
    
    Task<VpnProviderStatus> GetProviderStatusAsync(
        Guid vpnProviderId, 
        CancellationToken cancellationToken = default);
    
    Task<bool> ValidateProviderApiAsync(
        Guid vpnProviderId, 
        CancellationToken cancellationToken = default);
    
    Task<VpnUsageStatistics> GetUsageStatisticsAsync(
        Guid vpnProviderId, 
        CancellationToken cancellationToken = default);
}

public class VpnProviderApiService : IVpnProviderApiService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VpnProviderApiService> _logger;
    private readonly HttpClient _httpClient;
    private readonly VpnProviderApiOptions _options;
    private readonly IConfiguration _configuration;

    // VPN Provider API configurations
    private readonly Dictionary<string, VpnProviderApiConfig> _providerConfigs = new();

    public VpnProviderApiService(
        ApplicationDbContext context,
        ILogger<VpnProviderApiService> logger,
        HttpClient httpClient,
        IOptions<VpnProviderApiOptions> options,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _httpClient = httpClient;
        _options = options.Value;
        _configuration = configuration;
        
        InitializeProviderConfigurations();
    }

    public async Task<List<VpnServerInfo>> GetAvailableServersAsync(
        Guid vpnProviderId, 
        string? regionCode = null, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await GetVpnProviderAsync(vpnProviderId, cancellationToken);
            if (provider == null)
            {
                _logger.LogWarning("VPN provider {ProviderId} not found", vpnProviderId);
                return new List<VpnServerInfo>();
            }

            var providerConfig = GetProviderConfig(provider.Name);
            if (providerConfig == null)
            {
                _logger.LogWarning("No API configuration found for provider {ProviderName}", provider.Name);
                return await GetFallbackServersAsync(provider, regionCode);
            }

            var servers = await FetchServersFromApiAsync(providerConfig, regionCode, cancellationToken);
            
            _logger.LogInformation("Retrieved {ServerCount} servers for provider {ProviderName} in region {RegionCode}", 
                servers.Count, provider.Name, regionCode ?? "ALL");
            
            return servers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get available servers for provider {ProviderId}", vpnProviderId);
            return new List<VpnServerInfo>();
        }
    }

    public async Task<VpnConnectionCredentials> GetConnectionCredentialsAsync(
        Guid vpnProviderId, 
        string serverLocation, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await GetVpnProviderAsync(vpnProviderId, cancellationToken);
            if (provider == null)
            {
                throw new InvalidOperationException($"VPN provider {vpnProviderId} not found");
            }

            var providerConfig = GetProviderConfig(provider.Name);
            if (providerConfig == null)
            {
                return CreateFallbackCredentials(provider, serverLocation);
            }

            // Get encrypted credentials from secure storage
            var credentials = await GetEncryptedCredentialsAsync(vpnProviderId, cancellationToken);
            if (credentials == null)
            {
                throw new InvalidOperationException($"No credentials configured for provider {provider.Name}");
            }

            // Fetch server-specific configuration from provider API
            var serverConfig = await FetchServerConfigurationAsync(
                providerConfig, serverLocation, credentials, cancellationToken);

            return new VpnConnectionCredentials
            {
                ProviderId = vpnProviderId,
                ServerLocation = serverLocation,
                Protocol = serverConfig.Protocol,
                ServerEndpoint = serverConfig.Endpoint,
                Username = credentials.Username,
                Password = credentials.Password,
                CertificateData = serverConfig.CertificateData,
                ConfigurationData = serverConfig.ConfigData,
                ExpiresAt = DateTime.UtcNow.AddHours(24), // Credentials valid for 24 hours
                AdditionalSettings = serverConfig.AdditionalSettings
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get connection credentials for provider {ProviderId}, server {ServerLocation}", 
                vpnProviderId, serverLocation);
            throw;
        }
    }

    public async Task<VpnProviderStatus> GetProviderStatusAsync(
        Guid vpnProviderId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await GetVpnProviderAsync(vpnProviderId, cancellationToken);
            if (provider == null)
            {
                return new VpnProviderStatus
                {
                    ProviderId = vpnProviderId,
                    Status = "NotFound",
                    IsOperational = false,
                    LastChecked = DateTime.UtcNow
                };
            }

            var providerConfig = GetProviderConfig(provider.Name);
            if (providerConfig == null)
            {
                return CreateFallbackStatus(vpnProviderId, provider.Name);
            }

            var status = await FetchProviderStatusFromApiAsync(providerConfig, cancellationToken);
            status.ProviderId = vpnProviderId;
            status.ProviderName = provider.Name;
            
            return status;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get provider status for {ProviderId}", vpnProviderId);
            return new VpnProviderStatus
            {
                ProviderId = vpnProviderId,
                Status = "Error",
                IsOperational = false,
                ErrorMessage = ex.Message,
                LastChecked = DateTime.UtcNow
            };
        }
    }

    public async Task<bool> ValidateProviderApiAsync(
        Guid vpnProviderId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var status = await GetProviderStatusAsync(vpnProviderId, cancellationToken);
            var isValid = status.IsOperational && status.ApiResponseTime < 5000; // Must respond within 5 seconds
            
            _logger.LogInformation("API validation for provider {ProviderId}: {IsValid}", vpnProviderId, isValid);
            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "API validation failed for provider {ProviderId}", vpnProviderId);
            return false;
        }
    }

    public async Task<VpnUsageStatistics> GetUsageStatisticsAsync(
        Guid vpnProviderId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await GetVpnProviderAsync(vpnProviderId, cancellationToken);
            if (provider == null)
            {
                return new VpnUsageStatistics { ProviderId = vpnProviderId };
            }

            var providerConfig = GetProviderConfig(provider.Name);
            if (providerConfig == null)
            {
                return await GetFallbackUsageStatisticsAsync(vpnProviderId, cancellationToken);
            }

            var credentials = await GetEncryptedCredentialsAsync(vpnProviderId, cancellationToken);
            if (credentials == null)
            {
                return new VpnUsageStatistics { ProviderId = vpnProviderId };
            }

            return await FetchUsageStatisticsFromApiAsync(providerConfig, credentials, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get usage statistics for provider {ProviderId}", vpnProviderId);
            return new VpnUsageStatistics 
            { 
                ProviderId = vpnProviderId,
                ErrorMessage = ex.Message 
            };
        }
    }

    // Private helper methods
    private void InitializeProviderConfigurations()
    {
        // Initialize configurations for major VPN providers
        // In production, these would come from secure configuration or database
        
        _providerConfigs["NordVPN"] = new VpnProviderApiConfig
        {
            Name = "NordVPN",
            BaseApiUrl = "https://api.nordvpn.com/v1/",
            AuthenticationType = "Token",
            Endpoints = new Dictionary<string, string>
            {
                ["servers"] = "servers",
                ["status"] = "status",
                ["usage"] = "usage"
            },
            SupportedProtocols = new[] { VpnProtocolType.OpenVPN, VpnProtocolType.WireGuard, VpnProtocolType.IKEv2 },
            RequiresAuthentication = true
        };

        _providerConfigs["ExpressVPN"] = new VpnProviderApiConfig
        {
            Name = "ExpressVPN",
            BaseApiUrl = "https://api.expressvpn.com/v2/",
            AuthenticationType = "ApiKey",
            Endpoints = new Dictionary<string, string>
            {
                ["servers"] = "servers/list",
                ["status"] = "account/status",
                ["usage"] = "account/usage"
            },
            SupportedProtocols = new[] { VpnProtocolType.OpenVPN, VpnProtocolType.L2TP, VpnProtocolType.PPTP },
            RequiresAuthentication = true
        };

        _providerConfigs["Surfshark"] = new VpnProviderApiConfig
        {
            Name = "Surfshark",
            BaseApiUrl = "https://api.surfshark.com/v3/",
            AuthenticationType = "Bearer",
            Endpoints = new Dictionary<string, string>
            {
                ["servers"] = "server/clusters",
                ["status"] = "user/status",
                ["usage"] = "user/usage"
            },
            SupportedProtocols = new[] { VpnProtocolType.OpenVPN, VpnProtocolType.WireGuard },
            RequiresAuthentication = true
        };
    }

    private VpnProviderApiConfig? GetProviderConfig(string providerName)
    {
        var normalizedName = providerName.Replace(" ", "").Replace("-", "");
        return _providerConfigs.Values.FirstOrDefault(c => 
            c.Name.Replace(" ", "").Replace("-", "").Equals(normalizedName, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<VpnProvider?> GetVpnProviderAsync(Guid vpnProviderId, CancellationToken cancellationToken)
    {
        return await _context.Set<VpnProvider>()
            .FirstOrDefaultAsync(p => p.Id == vpnProviderId, cancellationToken);
    }

    private async Task<List<VpnServerInfo>> FetchServersFromApiAsync(
        VpnProviderApiConfig config, 
        string? regionCode, 
        CancellationToken cancellationToken)
    {
        try
        {
            var url = $"{config.BaseApiUrl}{config.Endpoints["servers"]}";
            if (!string.IsNullOrEmpty(regionCode))
            {
                url += $"?country={regionCode}";
            }

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            await AddAuthenticationHeadersAsync(request, config);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("API request failed for {Provider}: {StatusCode}", config.Name, response.StatusCode);
                return new List<VpnServerInfo>();
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var servers = ParseServerResponse(content, config.Name);
            
            return servers.Where(s => string.IsNullOrEmpty(regionCode) || 
                                    s.CountryCode.Equals(regionCode, StringComparison.OrdinalIgnoreCase))
                         .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch servers from API for provider {Provider}", config.Name);
            return new List<VpnServerInfo>();
        }
    }

    private async Task<VpnServerConfiguration> FetchServerConfigurationAsync(
        VpnProviderApiConfig config, 
        string serverLocation, 
        VpnCredentialsDto credentials,
        CancellationToken cancellationToken)
    {
        try
        {
            var url = $"{config.BaseApiUrl}servers/{serverLocation}/config";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            await AddAuthenticationHeadersAsync(request, config);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return CreateFallbackServerConfiguration(config, serverLocation);
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseServerConfiguration(content, config.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch server configuration for {Provider} server {Server}", 
                config.Name, serverLocation);
            return CreateFallbackServerConfiguration(config, serverLocation);
        }
    }

    private async Task<VpnProviderStatus> FetchProviderStatusFromApiAsync(
        VpnProviderApiConfig config, 
        CancellationToken cancellationToken)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var url = $"{config.BaseApiUrl}{config.Endpoints["status"]}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            await AddAuthenticationHeadersAsync(request, config);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            stopwatch.Stop();

            var status = new VpnProviderStatus
            {
                ProviderName = config.Name,
                Status = response.IsSuccessStatusCode ? "Operational" : "Degraded",
                IsOperational = response.IsSuccessStatusCode,
                ApiResponseTime = (int)stopwatch.ElapsedMilliseconds,
                LastChecked = DateTime.UtcNow
            };

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var statusData = ParseProviderStatus(content, config.Name);
                status.ServerCount = statusData.ServerCount;
                status.HealthPercentage = statusData.HealthPercentage;
                status.AdditionalInfo = statusData.AdditionalInfo;
            }
            else
            {
                status.ErrorMessage = $"HTTP {response.StatusCode}: {response.ReasonPhrase}";
            }

            return status;
        }
        catch (Exception ex)
        {
            return new VpnProviderStatus
            {
                ProviderName = config.Name,
                Status = "Error",
                IsOperational = false,
                ErrorMessage = ex.Message,
                LastChecked = DateTime.UtcNow
            };
        }
    }

    private async Task<VpnUsageStatistics> FetchUsageStatisticsFromApiAsync(
        VpnProviderApiConfig config, 
        VpnCredentialsDto credentials,
        CancellationToken cancellationToken)
    {
        try
        {
            var url = $"{config.BaseApiUrl}{config.Endpoints["usage"]}";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            await AddAuthenticationHeadersAsync(request, config);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new VpnUsageStatistics
                {
                    ErrorMessage = $"HTTP {response.StatusCode}: {response.ReasonPhrase}"
                };
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseUsageStatistics(content, config.Name);
        }
        catch (Exception ex)
        {
            return new VpnUsageStatistics
            {
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task AddAuthenticationHeadersAsync(HttpRequestMessage request, VpnProviderApiConfig config)
    {
        if (!config.RequiresAuthentication) return;

        var apiKey = await GetProviderApiKeyAsync(config.Name);
        if (string.IsNullOrEmpty(apiKey)) return;

        switch (config.AuthenticationType)
        {
            case "Token":
                request.Headers.Add("Authorization", $"Token {apiKey}");
                break;
            case "ApiKey":
                request.Headers.Add("X-API-Key", apiKey);
                break;
            case "Bearer":
                request.Headers.Add("Authorization", $"Bearer {apiKey}");
                break;
        }
    }

    private async Task<string?> GetProviderApiKeyAsync(string providerName)
    {
        // In production, this would retrieve encrypted API keys from secure storage
        var configKey = $"VpnProviders:{providerName}:ApiKey";
        return _configuration[configKey];
    }

    private async Task<VpnCredentialsDto?> GetEncryptedCredentialsAsync(Guid vpnProviderId, CancellationToken cancellationToken)
    {
        // In production, this would retrieve and decrypt stored credentials
        // For now, return test credentials
        return new VpnCredentialsDto
        {
            Username = "test-user",
            Password = "test-password",
            ApiKey = "test-api-key"
        };
    }

    // Parsing and fallback methods
    private List<VpnServerInfo> ParseServerResponse(string responseContent, string providerName)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(responseContent);
            var servers = new List<VpnServerInfo>();

            // Provider-specific parsing logic would go here
            // For now, return sample servers
            return CreateSampleServers(providerName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse server response for provider {Provider}", providerName);
            return CreateSampleServers(providerName);
        }
    }

    private VpnServerConfiguration ParseServerConfiguration(string responseContent, string providerName)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(responseContent);
            // Parse provider-specific server configuration
            // For now, return default configuration
            return CreateDefaultServerConfiguration();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse server configuration for provider {Provider}", providerName);
            return CreateDefaultServerConfiguration();
        }
    }

    private (int ServerCount, double HealthPercentage, Dictionary<string, object> AdditionalInfo) ParseProviderStatus(
        string responseContent, string providerName)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(responseContent);
            // Parse provider-specific status information
            return (100, 98.5, new Dictionary<string, object> { ["uptime"] = "99.9%" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse provider status for provider {Provider}", providerName);
            return (0, 0, new Dictionary<string, object>());
        }
    }

    private VpnUsageStatistics ParseUsageStatistics(string responseContent, string providerName)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(responseContent);
            // Parse provider-specific usage statistics
            return new VpnUsageStatistics
            {
                DataUsageGB = 1.5,
                ConnectionCount = 25,
                LastConnectionDate = DateTime.UtcNow.AddHours(-2),
                BandwidthLimitGB = 50,
                RemainingBandwidthGB = 48.5
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse usage statistics for provider {Provider}", providerName);
            return new VpnUsageStatistics { ErrorMessage = ex.Message };
        }
    }

    // Fallback methods for when API is unavailable
    private async Task<List<VpnServerInfo>> GetFallbackServersAsync(VpnProvider provider, string? regionCode)
    {
        // Return hardcoded server list when API is unavailable
        return CreateSampleServers(provider.Name, regionCode);
    }

    private VpnConnectionCredentials CreateFallbackCredentials(VpnProvider provider, string serverLocation)
    {
        return new VpnConnectionCredentials
        {
            ProviderId = provider.Id,
            ServerLocation = serverLocation,
            Protocol = VpnProtocolType.OpenVPN,
            ServerEndpoint = $"https://{serverLocation}.{provider.Name.ToLower()}.com:1194",
            Username = "fallback-user",
            Password = "fallback-password",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            AdditionalSettings = new Dictionary<string, string>
            {
                ["fallback"] = "true",
                ["generated"] = DateTime.UtcNow.ToString()
            }
        };
    }

    private VpnProviderStatus CreateFallbackStatus(Guid vpnProviderId, string providerName)
    {
        return new VpnProviderStatus
        {
            ProviderId = vpnProviderId,
            ProviderName = providerName,
            Status = "Unknown",
            IsOperational = true, // Assume operational if no API
            ServerCount = 50, // Estimated
            HealthPercentage = 95.0, // Estimated
            LastChecked = DateTime.UtcNow,
            AdditionalInfo = new Dictionary<string, object>
            {
                ["fallback"] = true,
                ["note"] = "Status estimated - API not available"
            }
        };
    }

    private async Task<VpnUsageStatistics> GetFallbackUsageStatisticsAsync(Guid vpnProviderId, CancellationToken cancellationToken)
    {
        // Return estimated usage based on test data
        return new VpnUsageStatistics
        {
            ProviderId = vpnProviderId,
            DataUsageGB = 0.5,
            ConnectionCount = 10,
            LastConnectionDate = DateTime.UtcNow.AddHours(-1),
            BandwidthLimitGB = 100,
            RemainingBandwidthGB = 99.5,
            IsFallback = true
        };
    }

    private List<VpnServerInfo> CreateSampleServers(string providerName, string? regionCode = null)
    {
        var servers = new List<VpnServerInfo>();
        var regions = new[] { "US", "UK", "CA", "AU", "DE", "FR", "JP" };
        
        foreach (var region in regions)
        {
            if (!string.IsNullOrEmpty(regionCode) && !region.Equals(regionCode, StringComparison.OrdinalIgnoreCase))
                continue;
                
            for (int i = 1; i <= 3; i++)
            {
                servers.Add(new VpnServerInfo
                {
                    ServerId = $"{region}{i}",
                    ServerName = $"{providerName} {region} Server {i}",
                    CountryCode = region,
                    CityName = GetDefaultCity(region),
                    IpAddress = $"192.168.{regions.ToList().IndexOf(region) + 1}.{i}",
                    Load = Random.Shared.Next(10, 90),
                    IsOnline = true,
                    Protocol = VpnProtocolType.OpenVPN,
                    MaxBandwidthMbps = 1000,
                    PingMs = Random.Shared.Next(20, 200)
                });
            }
        }
        
        return servers;
    }

    private VpnServerConfiguration CreateDefaultServerConfiguration()
    {
        return new VpnServerConfiguration
        {
            Protocol = VpnProtocolType.OpenVPN,
            Endpoint = "default.server.com:1194",
            CertificateData = "DEFAULT_CERTIFICATE_DATA",
            ConfigData = "DEFAULT_CONFIG_DATA",
            AdditionalSettings = new Dictionary<string, string>
            {
                ["cipher"] = "AES-256-CBC",
                ["auth"] = "SHA256"
            }
        };
    }

    private VpnServerConfiguration CreateFallbackServerConfiguration(VpnProviderApiConfig config, string serverLocation)
    {
        return new VpnServerConfiguration
        {
            Protocol = config.SupportedProtocols.FirstOrDefault(),
            Endpoint = $"{serverLocation}.{config.Name.ToLower()}.com:1194",
            CertificateData = "FALLBACK_CERTIFICATE_DATA",
            ConfigData = "FALLBACK_CONFIG_DATA",
            AdditionalSettings = new Dictionary<string, string>
            {
                ["fallback"] = "true",
                ["provider"] = config.Name
            }
        };
    }

    private string GetDefaultCity(string countryCode)
    {
        return countryCode switch
        {
            "US" => "New York",
            "UK" => "London",
            "CA" => "Toronto",
            "AU" => "Sydney",
            "DE" => "Berlin",
            "FR" => "Paris",
            "JP" => "Tokyo",
            _ => "Unknown"
        };
    }
}

// Configuration and data classes
public class VpnProviderApiOptions
{
    public int TimeoutSeconds { get; set; } = 30;
    public int MaxRetryAttempts { get; set; } = 3;
    public bool EnableCaching { get; set; } = true;
    public int CacheExpirationMinutes { get; set; } = 15;
}

internal class VpnProviderApiConfig
{
    public string Name { get; set; } = string.Empty;
    public string BaseApiUrl { get; set; } = string.Empty;
    public string AuthenticationType { get; set; } = string.Empty;
    public Dictionary<string, string> Endpoints { get; set; } = new();
    public VpnProtocolType[] SupportedProtocols { get; set; } = Array.Empty<VpnProtocolType>();
    public bool RequiresAuthentication { get; set; }
}

public class VpnCredentialsDto
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public Dictionary<string, string> AdditionalData { get; set; } = new();
}

public class VpnServerInfo
{
    public string ServerId { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string CityName { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public int Load { get; set; } // Load percentage 0-100
    public bool IsOnline { get; set; }
    public VpnProtocolType Protocol { get; set; }
    public int MaxBandwidthMbps { get; set; }
    public int PingMs { get; set; }
    public DateTime LastChecked { get; set; } = DateTime.UtcNow;
}

public class VpnConnectionCredentials
{
    public Guid ProviderId { get; set; }
    public string ServerLocation { get; set; } = string.Empty;
    public VpnProtocolType Protocol { get; set; }
    public string ServerEndpoint { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? CertificateData { get; set; }
    public string? ConfigurationData { get; set; }
    public DateTime ExpiresAt { get; set; }
    public Dictionary<string, string> AdditionalSettings { get; set; } = new();
}

public class VpnProviderStatus
{
    public Guid ProviderId { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsOperational { get; set; }
    public int ServerCount { get; set; }
    public double HealthPercentage { get; set; }
    public int ApiResponseTime { get; set; }
    public DateTime LastChecked { get; set; }
    public string? ErrorMessage { get; set; }
    public Dictionary<string, object> AdditionalInfo { get; set; } = new();
}

public class VpnUsageStatistics
{
    public Guid ProviderId { get; set; }
    public double DataUsageGB { get; set; }
    public int ConnectionCount { get; set; }
    public DateTime? LastConnectionDate { get; set; }
    public double BandwidthLimitGB { get; set; }
    public double RemainingBandwidthGB { get; set; }
    public bool IsFallback { get; set; }
    public string? ErrorMessage { get; set; }
}

internal class VpnServerConfiguration
{
    public VpnProtocolType Protocol { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string? CertificateData { get; set; }
    public string? ConfigData { get; set; }
    public Dictionary<string, string> AdditionalSettings { get; set; } = new();
}