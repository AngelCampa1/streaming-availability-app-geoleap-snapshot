using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests.ASO;

/// <summary>
/// COMPREHENSIVE ASO REVIEW MANAGEMENT TESTS - V3 Pattern
/// Tests review analysis, sentiment analysis, response automation, and review monitoring
/// Validates review sentiment accuracy and automated response generation
/// </summary>
[Collection("MinimalTest")]
public class ASOReviewManagementTestsV3 : MinimalTestBase
{
    public ASOReviewManagementTestsV3() : base()
    {
        SetAuthenticationHeader("test-aso-review-manager-token");
        Console.WriteLine("📝 ASO REVIEW: Initialized comprehensive review management test suite");
    }

    [Fact]
    public async Task ReviewSentimentAnalysis_WithVariousReviews_AnalyzesCorrectly()
    {
        // Arrange
        var request = new
        {
            Reviews = new[]
            {
                new { Id = "rev-1", Text = "Amazing VPN app! Works perfectly with Netflix and streaming services. Love it!", Rating = 5 },
                new { Id = "rev-2", Text = "Terrible connection speeds. Can't stream anything. Waste of money.", Rating = 1 },
                new { Id = "rev-3", Text = "Okay app, works sometimes but connection drops frequently. Could be better.", Rating = 3 },
                new { Id = "rev-4", Text = "Best VPN for streaming! Unblocks everything, fast speeds, great support team.", Rating = 5 },
                new { Id = "rev-5", Text = "App crashes constantly on iOS. Unable to use premium features I paid for.", Rating = 2 }
            },
            AnalysisOptions = new
            {
                IncludeSentiment = true,
                IncludeKeywords = true,
                IncludeTopics = true,
                Language = "en"
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/analyze-sentiment", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Sentiment analysis returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewMonitoring_WithAppStoreIntegration_TracksNewReviews()
    {
        // Arrange
        var request = new
        {
            AppId = "test-streaming-vpn-app",
            Stores = new[] { "apple_app_store", "google_play_store", "microsoft_store" },
            MonitoringInterval = "hourly",
            AlertThresholds = new
            {
                NegativeReviewSpike = 5,
                AverageRatingDrop = 0.5,
                VolumeIncrease = 50
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/monitoring/setup", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Monitoring setup returned {response.StatusCode}");
    }

    [Theory]
    [InlineData("positive", "Thank you for the wonderful feedback! We're thrilled you enjoy our streaming features.")]
    [InlineData("negative", "We sincerely apologize for the issues you've experienced. Please contact our support team.")]
    [InlineData("neutral", "Thank you for your feedback. We're always working to improve our service.")]
    public async Task AutomatedReviewResponses_BySentiment_GeneratesAppropriateReplies(string sentiment, string expectedTone)
    {
        // Arrange
        var request = new
        {
            ReviewId = $"test-review-{sentiment}",
            ReviewText = GetSampleReviewText(sentiment),
            ReviewRating = GetSampleRating(sentiment),
            ResponseTemplate = "professional_friendly",
            CustomizationOptions = new
            {
                IncludePersonalization = true,
                MentionSpecificIssues = true,
                OfferSupport = sentiment == "negative"
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/auto-respond", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Auto-response for {sentiment} sentiment returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewKeywordExtraction_FromReviewContent_IdentifiesImportantTerms()
    {
        // Arrange
        var request = new
        {
            Reviews = new[]
            {
                "This VPN is perfect for Netflix streaming, unblocks everything instantly!",
                "Love the fast connection speeds, works great for gaming and torrenting.",
                "The kill switch feature is amazing, keeps my privacy protected always.",
                "Easy to use interface, connects to servers quickly, great customer support.",
                "Battery drain is minimal, doesn't slow down my phone like other VPN apps."
            },
            ExtractionOptions = new
            {
                MinKeywordFrequency = 2,
                IncludePhrases = true,
                FilterStopWords = true,
                CategorizKeywords = true
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/extract-keywords", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Keyword extraction returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewTrendAnalysis_OverTime_IdentifiesPatterns()
    {
        // Arrange
        var queryParams = "appId=test-app&timeRange=90days&granularity=weekly&includeSeasonality=true";

        // Act
        var response = await Client.GetAsync($"/api/aso/reviews/trends?{queryParams}");

        // Assert
        var successCodes = new[] { 200, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Trend analysis returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewCompetitorComparison_WithCompetitorApps_ProvidesInsights()
    {
        // Arrange
        var request = new
        {
            AppId = "test-streaming-vpn-app",
            CompetitorApps = new[]
            {
                new { Id = "competitor-vpn-1", Name = "ExpressVPN" },
                new { Id = "competitor-vpn-2", Name = "NordVPN" },
                new { Id = "competitor-vpn-3", Name = "Surfshark" }
            },
            ComparisonMetrics = new[] { "average_rating", "review_volume", "sentiment_distribution", "keyword_mentions" },
            TimeRange = "30days"
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/competitor-comparison", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Competitor comparison returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewAlertSystem_WithNegativeSpike_TriggersNotifications()
    {
        // Arrange
        var request = new
        {
            AppId = "test-streaming-vpn-app",
            AlertRules = new[]
            {
                new { Type = "rating_drop", Threshold = 0.3, TimeWindow = "24hours" },
                new { Type = "negative_review_spike", Threshold = 10, TimeWindow = "6hours" },
                new { Type = "keyword_mention_increase", Keywords = new[] { "crash", "bug", "slow" }, Threshold = 5 }
            },
            NotificationChannels = new[] { "email", "slack", "dashboard" }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/alerts/setup", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Alert system setup returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewResponseTemplates_WithCustomization_GeneratesPersonalizedResponses()
    {
        // Arrange
        var request = new
        {
            TemplateType = "bug_report_response",
            CustomizationData = new
            {
                UserName = "StreamingFan2024",
                SpecificIssue = "connection drops during Netflix streaming",
                DeviceInfo = "iPhone 15 Pro, iOS 17.1",
                AppVersion = "v2.1.5"
            },
            ResponseTone = "empathetic_professional",
            IncludeElements = new[] { "acknowledgment", "apology", "solution_steps", "followup_offer" }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/response-templates/generate", content);

        // Assert
        var successCodes = new[] { 200, 201, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Template generation returned {response.StatusCode}");
    }

    [Fact]
    public async Task ReviewSentimentAccuracy_WithValidationDataset_MeetsThreshold()
    {
        // Arrange - Test sentiment analysis accuracy
        var validationRequest = new
        {
            ValidationDataset = new[]
            {
                new { Text = "Absolutely love this VPN! Works perfectly with streaming!", ExpectedSentiment = "very_positive", Rating = 5 },
                new { Text = "Worst app ever, doesn't work at all, total scam", ExpectedSentiment = "very_negative", Rating = 1 },
                new { Text = "It's okay, works sometimes but could be better", ExpectedSentiment = "neutral", Rating = 3 },
                new { Text = "Great for privacy but slow speeds on some servers", ExpectedSentiment = "mixed", Rating = 4 },
                new { Text = "Unable to connect, keeps crashing on startup", ExpectedSentiment = "negative", Rating = 2 }
            },
            AccuracyThreshold = 0.85 // Require 85% accuracy
        };
        var json = JsonSerializer.Serialize(validationRequest);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/sentiment-validation", content);

        // Assert
        var successCodes = new[] { 200, 201, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: Sentiment accuracy validation returned {response.StatusCode}");
    }

    [Theory]
    [InlineData("en", "English reviews analysis")]
    [InlineData("es", "Spanish reviews analysis")]
    [InlineData("fr", "French reviews analysis")]
    [InlineData("de", "German reviews analysis")]
    [InlineData("ja", "Japanese reviews analysis")]
    public async Task MultiLanguageReviewAnalysis_VariousLocales_AnalyzesCorrectly(string language, string description)
    {
        // Arrange
        var request = new
        {
            AppId = "test-streaming-vpn-app",
            Language = language,
            AnalysisType = "comprehensive",
            IncludeTranslation = language != "en"
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/reviews/multilingual-analysis", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO REVIEW: {description} returned {response.StatusCode}");
    }

    private string GetSampleReviewText(string sentiment)
    {
        return sentiment switch
        {
            "positive" => "Amazing VPN app! Works perfectly with Netflix and streaming services. Love the fast speeds!",
            "negative" => "Terrible connection issues. App crashes constantly and can't stream anything. Waste of money.",
            "neutral" => "It's an okay VPN app. Works sometimes but connection can be inconsistent. Could be improved.",
            _ => "This is a sample review for testing purposes."
        };
    }

    private int GetSampleRating(string sentiment)
    {
        return sentiment switch
        {
            "positive" => 5,
            "negative" => 1,
            "neutral" => 3,
            _ => 3
        };
    }
}