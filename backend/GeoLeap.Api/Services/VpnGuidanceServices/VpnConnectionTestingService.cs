using GeoLeap.Api.Models;
using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Text.Json;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public interface IVpnConnectionTestingService
{
    Task<VpnConnectionResult> TestVpnConnectionAsync(
        VpnConnectionConfig config, 
        CancellationToken cancellationToken = default);
    
    Task<VpnSpeedTestResult> MeasureConnectionSpeedAsync(
        string testEndpoint, 
        CancellationToken cancellationToken = default);
    
    Task<bool> ValidateVpnConnectivityAsync(
        string vpnServerEndpoint, 
        VpnProtocolType protocol, 
        CancellationToken cancellationToken = default);
    
    Task<List<string>> GetOptimalVpnServersAsync(
        Guid vpnProviderId, 
        string regionCode, 
        CancellationToken cancellationToken = default);
}

public class VpnConnectionTestingService : IVpnConnectionTestingService
{
    private readonly ILogger<VpnConnectionTestingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    
    // Speed test endpoints for different regions
    private readonly Dictionary<string, string> _speedTestEndpoints = new()
    {
        ["US"] = "https://speed.cloudflare.com/__down?bytes=104857600", // 100MB test file
        ["UK"] = "https://proof.ovh.net/files/100Mb.dat",
        ["CA"] = "https://www.google.com/images/nav_logo229.png",
        ["AU"] = "https://mirror.aarnet.edu.au/pub/speedtest/100MB.zip",
        ["DE"] = "https://speedtest.belwue.net/100M",
        ["FR"] = "https://proof.ovh.net/files/100Mb.dat",
        ["JP"] = "https://speed.hinet.net/test_100m.zip"
    };

    public VpnConnectionTestingService(
        ILogger<VpnConnectionTestingService> logger,
        IConfiguration configuration,
        HttpClient httpClient)
    {
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
        
        // Configure HttpClient for testing
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
    }

    public async Task<VpnConnectionResult> TestVpnConnectionAsync(
        VpnConnectionConfig config, 
        CancellationToken cancellationToken = default)
    {
        var testStartTime = DateTime.UtcNow;
        var testId = Guid.NewGuid();
        
        try
        {
            _logger.LogInformation("Starting VPN connection test {TestId} for {ServerEndpoint}", 
                testId, config.ServerEndpoint);

            var result = new VpnConnectionResult
            {
                TestId = testId,
                StartTime = testStartTime,
                ServerEndpoint = config.ServerEndpoint,
                Protocol = config.Protocol,
                RegionCode = config.RegionCode
            };

            // Step 1: Test basic connectivity
            var connectivityResult = await TestBasicConnectivityAsync(config, cancellationToken);
            result.ConnectionEstablished = connectivityResult.Success;
            result.ConnectionLatencyMs = connectivityResult.LatencyMs;
            result.ErrorMessage = connectivityResult.ErrorMessage;

            if (!result.ConnectionEstablished)
            {
                result.EndTime = DateTime.UtcNow;
                result.TestDurationMs = (result.EndTime - result.StartTime).TotalMilliseconds;
                return result;
            }

            // Step 2: Test IP address change (VPN effectiveness)
            var ipChangeResult = await TestIpAddressChangeAsync(config, cancellationToken);
            result.IpAddressChanged = ipChangeResult.IpChanged;
            result.OriginalIp = ipChangeResult.OriginalIp;
            result.VpnIp = ipChangeResult.VpnIp;
            result.LocationMasked = ipChangeResult.LocationChanged;

            // Step 3: DNS leak test
            var dnsLeakResult = await TestDnsLeaksAsync(config, cancellationToken);
            result.DnsLeakDetected = dnsLeakResult.LeakDetected;
            result.DnsServers = dnsLeakResult.DnsServers;

            // Step 4: Speed test
            if (result.ConnectionEstablished && result.IpAddressChanged)
            {
                var speedResult = await MeasureConnectionSpeedAsync(
                    GetSpeedTestEndpoint(config.RegionCode), cancellationToken);
                result.DownloadSpeedMbps = speedResult.DownloadSpeedMbps;
                result.UploadSpeedMbps = speedResult.UploadSpeedMbps;
                result.LatencyMs = speedResult.LatencyMs;
            }

            result.EndTime = DateTime.UtcNow;
            result.TestDurationMs = (result.EndTime - result.StartTime).TotalMilliseconds;
            result.OverallSuccess = result.ConnectionEstablished && 
                                   result.IpAddressChanged && 
                                   !result.DnsLeakDetected;

            _logger.LogInformation("VPN connection test {TestId} completed: Success={Success}, Speed={Speed}Mbps", 
                testId, result.OverallSuccess, result.DownloadSpeedMbps);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "VPN connection test {TestId} failed", testId);
            
            return new VpnConnectionResult
            {
                TestId = testId,
                StartTime = testStartTime,
                EndTime = DateTime.UtcNow,
                ServerEndpoint = config.ServerEndpoint,
                Protocol = config.Protocol,
                RegionCode = config.RegionCode,
                ConnectionEstablished = false,
                OverallSuccess = false,
                ErrorMessage = ex.Message,
                TestDurationMs = (DateTime.UtcNow - testStartTime).TotalMilliseconds
            };
        }
    }

    public async Task<VpnSpeedTestResult> MeasureConnectionSpeedAsync(
        string testEndpoint, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = new VpnSpeedTestResult { TestEndpoint = testEndpoint };
            
            // Test latency first
            var latencyResult = await MeasureLatencyAsync(testEndpoint, cancellationToken);
            result.LatencyMs = latencyResult.AverageLatency;
            result.JitterMs = latencyResult.Jitter;

            // Test download speed
            var downloadResult = await MeasureDownloadSpeedAsync(testEndpoint, cancellationToken);
            result.DownloadSpeedMbps = downloadResult.SpeedMbps;
            result.DownloadTimeMs = downloadResult.DurationMs;

            // Test upload speed (if supported)
            try
            {
                var uploadResult = await MeasureUploadSpeedAsync(testEndpoint, cancellationToken);
                result.UploadSpeedMbps = uploadResult.SpeedMbps;
                result.UploadTimeMs = uploadResult.DurationMs;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Upload speed test failed: {Error}", ex.Message);
                result.UploadSpeedMbps = 0; // Upload testing not always available
            }

            result.TestSuccessful = result.DownloadSpeedMbps > 0;
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Speed test failed for endpoint {Endpoint}", testEndpoint);
            return new VpnSpeedTestResult
            {
                TestEndpoint = testEndpoint,
                TestSuccessful = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<bool> ValidateVpnConnectivityAsync(
        string vpnServerEndpoint, 
        VpnProtocolType protocol, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Test basic network connectivity to VPN server
            var uri = new Uri(vpnServerEndpoint);
            var ping = new Ping();
            var reply = await ping.SendPingAsync(uri.Host, 5000);
            
            if (reply.Status != IPStatus.Success)
            {
                _logger.LogWarning("Ping to VPN server {Server} failed: {Status}", 
                    vpnServerEndpoint, reply.Status);
                return false;
            }

            // Test port connectivity based on protocol
            var portOpen = await TestPortConnectivityAsync(uri.Host, GetProtocolPort(protocol), cancellationToken);
            
            if (!portOpen)
            {
                _logger.LogWarning("Port connectivity to VPN server {Server} failed for protocol {Protocol}", 
                    vpnServerEndpoint, protocol);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "VPN connectivity validation failed for {Server}", vpnServerEndpoint);
            return false;
        }
    }

    public async Task<List<string>> GetOptimalVpnServersAsync(
        Guid vpnProviderId, 
        string regionCode, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // This would integrate with VPN provider APIs to get server lists
            // For now, return simulated server endpoints based on region
            var servers = new List<string>();
            
            var regionServers = GetRegionalServers(regionCode);
            
            // Test connectivity to each server and return ordered by performance
            var serverTests = new List<(string Server, double ResponseTime)>();
            
            foreach (var server in regionServers)
            {
                try
                {
                    var ping = new Ping();
                    var reply = await ping.SendPingAsync(server, 3000);
                    
                    if (reply.Status == IPStatus.Success)
                    {
                        serverTests.Add((server, reply.RoundtripTime));
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Server {Server} connectivity test failed: {Error}", server, ex.Message);
                }
            }
            
            // Return servers ordered by response time (best first)
            return serverTests
                .OrderBy(s => s.ResponseTime)
                .Select(s => s.Server)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get optimal VPN servers for provider {ProviderId}, region {RegionCode}", 
                vpnProviderId, regionCode);
            return new List<string>();
        }
    }

    // Private helper methods
    private async Task<VpnConnectivityTestResult> TestBasicConnectivityAsync(
        VpnConnectionConfig config, 
        CancellationToken cancellationToken)
    {
        try
        {
            var stopwatch = Stopwatch.StartNew();
            
            // Test HTTP connectivity through potential VPN connection
            var request = new HttpRequestMessage(HttpMethod.Get, "https://httpbin.org/ip");
            var response = await _httpClient.SendAsync(request, cancellationToken);
            
            stopwatch.Stop();
            
            if (response.IsSuccessStatusCode)
            {
                return new VpnConnectivityTestResult
                {
                    Success = true,
                    LatencyMs = (int)stopwatch.ElapsedMilliseconds
                };
            }
            
            return new VpnConnectivityTestResult
            {
                Success = false,
                ErrorMessage = $"HTTP {response.StatusCode}: {response.ReasonPhrase}"
            };
        }
        catch (Exception ex)
        {
            return new VpnConnectivityTestResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<IpChangeTestResult> TestIpAddressChangeAsync(
        VpnConnectionConfig config, 
        CancellationToken cancellationToken)
    {
        try
        {
            // Get current IP address
            var originalIpResponse = await _httpClient.GetStringAsync("https://httpbin.org/ip", cancellationToken);
            var originalIpData = JsonSerializer.Deserialize<JsonElement>(originalIpResponse);
            var originalIp = originalIpData.GetProperty("origin").GetString() ?? "unknown";

            // Simulate VPN connection and test again
            // In a real implementation, this would establish VPN connection first
            await Task.Delay(1000, cancellationToken); // Simulate connection time
            
            var vpnIpResponse = await _httpClient.GetStringAsync("https://httpbin.org/ip", cancellationToken);
            var vpnIpData = JsonSerializer.Deserialize<JsonElement>(vpnIpResponse);
            var vpnIp = vpnIpData.GetProperty("origin").GetString() ?? "unknown";

            // Test geolocation change
            var originalLocation = await GetIpGeolocationAsync(originalIp, cancellationToken);
            var vpnLocation = await GetIpGeolocationAsync(vpnIp, cancellationToken);

            return new IpChangeTestResult
            {
                OriginalIp = originalIp,
                VpnIp = vpnIp,
                IpChanged = originalIp != vpnIp,
                LocationChanged = originalLocation != vpnLocation,
                OriginalLocation = originalLocation,
                VpnLocation = vpnLocation
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "IP address change test failed");
            return new IpChangeTestResult
            {
                IpChanged = false,
                LocationChanged = false,
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<DnsLeakTestResult> TestDnsLeaksAsync(
        VpnConnectionConfig config, 
        CancellationToken cancellationToken)
    {
        try
        {
            // Test DNS resolution to detect leaks
            var dnsTestResponse = await _httpClient.GetStringAsync(
                "https://dnsleaktest.com/", cancellationToken);
            
            // Parse DNS servers from response (simplified)
            var dnsServers = new List<string> { "8.8.8.8", "8.8.4.4" }; // Placeholder
            
            // Check if DNS servers match VPN provider's servers
            var expectedVpnDnsServers = GetExpectedVpnDnsServers(config.RegionCode);
            var leakDetected = !dnsServers.Any(dns => expectedVpnDnsServers.Contains(dns));
            
            return new DnsLeakTestResult
            {
                LeakDetected = leakDetected,
                DnsServers = dnsServers,
                ExpectedDnsServers = expectedVpnDnsServers
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DNS leak test failed");
            return new DnsLeakTestResult
            {
                LeakDetected = true, // Assume leak on error
                ErrorMessage = ex.Message
            };
        }
    }

    private async Task<LatencyTestResult> MeasureLatencyAsync(
        string endpoint, 
        CancellationToken cancellationToken)
    {
        var latencies = new List<long>();
        
        for (int i = 0; i < 5; i++) // 5 ping tests
        {
            try
            {
                var stopwatch = Stopwatch.StartNew();
                var response = await _httpClient.GetAsync(endpoint, 
                    HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                stopwatch.Stop();
                
                if (response.IsSuccessStatusCode)
                {
                    latencies.Add(stopwatch.ElapsedMilliseconds);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Latency test iteration {Iteration} failed: {Error}", i, ex.Message);
            }
            
            if (i < 4) await Task.Delay(100, cancellationToken); // Brief pause between tests
        }
        
        if (!latencies.Any())
        {
            return new LatencyTestResult { AverageLatency = 0, Jitter = 0 };
        }
        
        var averageLatency = (int)latencies.Average();
        var jitter = latencies.Any() ? (int)latencies.Select(l => Math.Abs(l - averageLatency)).Average() : 0;
        
        return new LatencyTestResult
        {
            AverageLatency = averageLatency,
            Jitter = jitter,
            MinLatency = (int)latencies.Min(),
            MaxLatency = (int)latencies.Max()
        };
    }

    private async Task<SpeedTestResult> MeasureDownloadSpeedAsync(
        string testEndpoint, 
        CancellationToken cancellationToken)
    {
        try
        {
            var stopwatch = Stopwatch.StartNew();
            var response = await _httpClient.GetAsync(testEndpoint, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Speed test endpoint returned {response.StatusCode}");
            }
            
            var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            stopwatch.Stop();
            
            var bytesDownloaded = content.Length;
            var durationSeconds = stopwatch.Elapsed.TotalSeconds;
            var speedMbps = (bytesDownloaded * 8.0) / (1024 * 1024 * durationSeconds); // Convert to Mbps
            
            return new SpeedTestResult
            {
                SpeedMbps = speedMbps,
                DurationMs = stopwatch.ElapsedMilliseconds,
                BytesTransferred = bytesDownloaded
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Download speed test failed for endpoint {Endpoint}", testEndpoint);
            throw;
        }
    }

    private async Task<SpeedTestResult> MeasureUploadSpeedAsync(
        string testEndpoint, 
        CancellationToken cancellationToken)
    {
        try
        {
            // Generate test data (1MB)
            var testData = new byte[1024 * 1024];
            new Random().NextBytes(testData);
            
            var stopwatch = Stopwatch.StartNew();
            var content = new ByteArrayContent(testData);
            var response = await _httpClient.PostAsync(testEndpoint + "/upload", content, cancellationToken);
            stopwatch.Stop();
            
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException($"Upload test endpoint returned {response.StatusCode}");
            }
            
            var durationSeconds = stopwatch.Elapsed.TotalSeconds;
            var speedMbps = (testData.Length * 8.0) / (1024 * 1024 * durationSeconds);
            
            return new SpeedTestResult
            {
                SpeedMbps = speedMbps,
                DurationMs = stopwatch.ElapsedMilliseconds,
                BytesTransferred = testData.Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Upload speed test failed for endpoint {Endpoint}", testEndpoint);
            throw;
        }
    }

    private async Task<bool> TestPortConnectivityAsync(
        string host, 
        int port, 
        CancellationToken cancellationToken)
    {
        try
        {
            using var tcpClient = new System.Net.Sockets.TcpClient();
            await tcpClient.ConnectAsync(host, port);
            return tcpClient.Connected;
        }
        catch
        {
            return false;
        }
    }

    private async Task<string> GetIpGeolocationAsync(string ipAddress, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetStringAsync(
                $"http://ip-api.com/json/{ipAddress}?fields=country,regionName,city", 
                cancellationToken);
            
            var locationData = JsonSerializer.Deserialize<JsonElement>(response);
            var country = locationData.GetProperty("country").GetString();
            var region = locationData.GetProperty("regionName").GetString();
            var city = locationData.GetProperty("city").GetString();
            
            return $"{city}, {region}, {country}";
        }
        catch (Exception ex)
        {
            _logger.LogDebug("Geolocation lookup failed for IP {IpAddress}: {Error}", ipAddress, ex.Message);
            return "Unknown";
        }
    }

    private string GetSpeedTestEndpoint(string regionCode)
    {
        return _speedTestEndpoints.TryGetValue(regionCode, out var endpoint) 
            ? endpoint 
            : _speedTestEndpoints["US"]; // Default fallback
    }

    private int GetProtocolPort(VpnProtocolType protocol)
    {
        return protocol switch
        {
            VpnProtocolType.OpenVPN => 1194,
            VpnProtocolType.WireGuard => 51820,
            VpnProtocolType.IKEv2 => 500,
            VpnProtocolType.L2TP => 1701,
            VpnProtocolType.PPTP => 1723,
            _ => 1194 // Default to OpenVPN port
        };
    }

    private List<string> GetRegionalServers(string regionCode)
    {
        // This would typically come from a database or VPN provider API
        var serverMap = new Dictionary<string, List<string>>
        {
            ["US"] = new() { "us1.example-vpn.com", "us2.example-vpn.com", "us3.example-vpn.com" },
            ["UK"] = new() { "uk1.example-vpn.com", "uk2.example-vpn.com", "uk3.example-vpn.com" },
            ["CA"] = new() { "ca1.example-vpn.com", "ca2.example-vpn.com" },
            ["AU"] = new() { "au1.example-vpn.com", "au2.example-vpn.com" },
            ["DE"] = new() { "de1.example-vpn.com", "de2.example-vpn.com" },
            ["FR"] = new() { "fr1.example-vpn.com", "fr2.example-vpn.com" },
            ["JP"] = new() { "jp1.example-vpn.com", "jp2.example-vpn.com" }
        };

        return serverMap.TryGetValue(regionCode, out var servers) 
            ? servers 
            : new List<string>();
    }

    private List<string> GetExpectedVpnDnsServers(string regionCode)
    {
        // Expected DNS servers for the VPN provider in each region
        return new List<string> { "10.8.8.8", "10.8.8.4" }; // Example VPN DNS servers
    }
}

// Supporting classes for test results
public class VpnConnectionConfig
{
    public string ServerEndpoint { get; set; } = string.Empty;
    public VpnProtocolType Protocol { get; set; }
    public string RegionCode { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public Dictionary<string, string> AdditionalConfig { get; set; } = new();
}

public class VpnConnectionResult
{
    public Guid TestId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public double TestDurationMs { get; set; }
    public string ServerEndpoint { get; set; } = string.Empty;
    public VpnProtocolType Protocol { get; set; }
    public string RegionCode { get; set; } = string.Empty;
    
    // Connection Results
    public bool ConnectionEstablished { get; set; }
    public int ConnectionLatencyMs { get; set; }
    public bool IpAddressChanged { get; set; }
    public string? OriginalIp { get; set; }
    public string? VpnIp { get; set; }
    public bool LocationMasked { get; set; }
    
    // Security Results
    public bool DnsLeakDetected { get; set; }
    public List<string> DnsServers { get; set; } = new();
    
    // Performance Results
    public double DownloadSpeedMbps { get; set; }
    public double UploadSpeedMbps { get; set; }
    public int LatencyMs { get; set; }
    
    // Overall Assessment
    public bool OverallSuccess { get; set; }
    public string? ErrorMessage { get; set; }
}

public class VpnSpeedTestResult
{
    public string TestEndpoint { get; set; } = string.Empty;
    public double DownloadSpeedMbps { get; set; }
    public double UploadSpeedMbps { get; set; }
    public int LatencyMs { get; set; }
    public int JitterMs { get; set; }
    public long DownloadTimeMs { get; set; }
    public long UploadTimeMs { get; set; }
    public bool TestSuccessful { get; set; }
    public string? ErrorMessage { get; set; }
}

// Helper result classes
internal class VpnConnectivityTestResult
{
    public bool Success { get; set; }
    public int LatencyMs { get; set; }
    public string? ErrorMessage { get; set; }
}

internal class IpChangeTestResult
{
    public string? OriginalIp { get; set; }
    public string? VpnIp { get; set; }
    public bool IpChanged { get; set; }
    public bool LocationChanged { get; set; }
    public string? OriginalLocation { get; set; }
    public string? VpnLocation { get; set; }
    public string? ErrorMessage { get; set; }
}

internal class DnsLeakTestResult
{
    public bool LeakDetected { get; set; }
    public List<string> DnsServers { get; set; } = new();
    public List<string> ExpectedDnsServers { get; set; } = new();
    public string? ErrorMessage { get; set; }
}

internal class LatencyTestResult
{
    public int AverageLatency { get; set; }
    public int Jitter { get; set; }
    public int MinLatency { get; set; }
    public int MaxLatency { get; set; }
}

internal class SpeedTestResult
{
    public double SpeedMbps { get; set; }
    public long DurationMs { get; set; }
    public long BytesTransferred { get; set; }
}

public enum VpnProtocolType
{
    OpenVPN,
    WireGuard,
    IKEv2,
    L2TP,
    PPTP,
    SSTP
}