using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using GeoLeap.Api.Tests.Infrastructure;
using GeoLeap.Api.Models;

// Quick test to check the backup endpoint
var factory = new UnifiedTestFactory();
var client = factory.CreateClient();

// Get admin token
var registerRequest = new RegisterRequest
{
    Email = "admin@backup.test",
    Password = "AdminPassword123!",
    FirstName = "Backup",
    LastName = "Admin"
};
await client.PostAsJsonAsync("/api/auth/register", registerRequest);

var loginRequest = new LoginRequest
{
    Email = "admin@backup.test",
    Password = "AdminPassword123!",
    RememberMe = false
};
var loginResponse = await client.PostAsJsonAsync("/api/auth/login", loginRequest);
var loginContent = await loginResponse.Content.ReadAsStringAsync();
Console.WriteLine($"Login Response: {loginResponse.StatusCode}");
Console.WriteLine($"Login Content: {loginContent}");

// Try the backup endpoint
client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "fake-token");

var backupRequest = new
{
    BackupType = "full",
    IncludeUserData = true,
    IncludeContentData = true,
    IncludeSystemData = true,
    Compression = true,
    Description = "Manual backup test"
};

var response = await client.PostAsJsonAsync("/api/admin/backup/create", backupRequest);
Console.WriteLine($"Backup Response Status: {response.StatusCode}");

var content = await response.Content.ReadAsStringAsync();
Console.WriteLine($"Backup Response Content: {content}");

factory.Dispose();