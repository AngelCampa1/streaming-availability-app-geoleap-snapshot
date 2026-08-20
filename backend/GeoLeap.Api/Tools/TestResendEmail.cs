// Quick test tool to verify Resend email service
// Run with: dotnet run --project GeoLeap.Api -- test-resend your-email@example.com

using GeoLeap.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Resend;

namespace GeoLeap.Api.Tools;

public class TestResendEmail
{
    public static async Task<int> ExecuteAsync(string[] args)
    {
        if (args.Length < 2 || args[0] != "test-resend")
        {
            Console.WriteLine("Usage: dotnet run --project GeoLeap.Api -- test-resend your-email@example.com");
            return 1;
        }

        var testEmail = args[1];

        Console.WriteLine("╔════════════════════════════════════════════════════════════════╗");
        Console.WriteLine("║          Resend Email Service Test Tool                       ║");
        Console.WriteLine("╚════════════════════════════════════════════════════════════════╝");
        Console.WriteLine();

        try
        {
            // Setup configuration
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .AddUserSecrets<Program>()
                .Build();

            // Check API key
            var apiKey = configuration["Resend:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("❌ ERROR: Resend:ApiKey not configured");
                Console.ResetColor();
                Console.WriteLine();
                Console.WriteLine("Please set your API key:");
                Console.WriteLine("  dotnet user-secrets set \"Resend:ApiKey\" \"re_xxxxx\"");
                Console.WriteLine();
                return 1;
            }

            Console.WriteLine($"✓ API Key configured: {apiKey.Substring(0, Math.Min(10, apiKey.Length))}...");
            Console.WriteLine($"✓ From Address: {configuration["Resend:FromAddress"]}");
            Console.WriteLine($"✓ From Name: {configuration["Resend:FromName"]}");
            Console.WriteLine($"✓ Test Email: {testEmail}");
            Console.WriteLine();

            // Setup logger
            using var loggerFactory = LoggerFactory.Create(builder =>
            {
                builder.AddConsole();
                builder.SetMinimumLevel(LogLevel.Information);
            });
            var logger = loggerFactory.CreateLogger<ResendEmailService>();

            // Setup Resend client
            var httpClient = new HttpClient();
            // Create an IOptionsSnapshot wrapper for the test tool
            var resendOptions = new ResendClientOptions { ApiToken = apiKey };
            var optionsSnapshot = new OptionsWrapper<ResendClientOptions>(resendOptions) as IOptionsSnapshot<ResendClientOptions>;
            var resendClient = new ResendClient(optionsSnapshot!, httpClient);

            // Create email service
            var emailService = new ResendEmailService(logger, configuration, resendClient);

            // Test 1: Welcome Email
            Console.WriteLine("═══════════════════════════════════════════════════════════════");
            Console.WriteLine("Test 1: Sending Welcome Email...");
            Console.WriteLine("═══════════════════════════════════════════════════════════════");

            var result1 = await emailService.SendWelcomeEmailAsync(testEmail, "Test User");

            if (result1)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("✓ Welcome email sent successfully!");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("✗ Failed to send welcome email");
                Console.ResetColor();
            }
            Console.WriteLine();

            // Test 2: Password Reset Email
            Console.WriteLine("═══════════════════════════════════════════════════════════════");
            Console.WriteLine("Test 2: Sending Password Reset Email...");
            Console.WriteLine("═══════════════════════════════════════════════════════════════");

            var resetToken = Guid.NewGuid().ToString();
            var result2 = await emailService.SendPasswordResetEmailAsync(testEmail, resetToken, "Test User");

            if (result2)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("✓ Password reset email sent successfully!");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("✗ Failed to send password reset email");
                Console.ResetColor();
            }
            Console.WriteLine();

            // Test 3: Subscription Email
            Console.WriteLine("═══════════════════════════════════════════════════════════════");
            Console.WriteLine("Test 3: Sending Subscription Email...");
            Console.WriteLine("═══════════════════════════════════════════════════════════════");

            var result3 = await emailService.SendSubscriptionCreatedEmailAsync(
                testEmail, "Test User", "Premium", 9.99m, "monthly");

            if (result3)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("✓ Subscription email sent successfully!");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("✗ Failed to send subscription email");
                Console.ResetColor();
            }
            Console.WriteLine();

            // Summary
            Console.WriteLine("═══════════════════════════════════════════════════════════════");
            Console.WriteLine("Test Summary");
            Console.WriteLine("═══════════════════════════════════════════════════════════════");

            var successCount = (result1 ? 1 : 0) + (result2 ? 1 : 0) + (result3 ? 1 : 0);

            if (successCount == 3)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("✓ ALL TESTS PASSED (3/3)");
                Console.ResetColor();
                Console.WriteLine();
                Console.WriteLine("Check your inbox at: " + testEmail);
                Console.WriteLine("Also check Resend dashboard: https://resend.com/emails");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"⚠ SOME TESTS FAILED ({successCount}/3)");
                Console.ResetColor();
            }

            Console.WriteLine();
            Console.WriteLine("═══════════════════════════════════════════════════════════════");

            return successCount == 3 ? 0 : 1;
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine();
            Console.WriteLine("❌ ERROR:");
            Console.WriteLine(ex.Message);
            Console.ResetColor();

            if (ex.InnerException != null)
            {
                Console.WriteLine();
                Console.WriteLine("Inner Exception:");
                Console.WriteLine(ex.InnerException.Message);
            }

            Console.WriteLine();
            Console.WriteLine("Stack Trace:");
            Console.WriteLine(ex.StackTrace);

            return 1;
        }
    }
}
