using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using GeoLeap.Api.ProgrammaticSeo.Services;
using System.Text.Json;

namespace GeoLeap.Api.Demo;

/// <summary>
/// Demonstration of the Content Generation System
/// Shows how the SEO system actually generates pages
/// </summary>
public class ContentGenerationDemo
{
    private readonly IServiceProvider _serviceProvider;
    
    public ContentGenerationDemo(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    
    /// <summary>
    /// Demonstrates the complete content generation pipeline
    /// </summary>
    public async Task<ContentGenerationResult> DemonstrateContentGenerationAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var templateService = scope.ServiceProvider.GetRequiredService<ISeoTemplateService>();
        var keywordService = scope.ServiceProvider.GetRequiredService<IKeywordResearchService>();
        var contentService = scope.ServiceProvider.GetRequiredService<IContentMetadataService>();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var result = new ContentGenerationResult
        {
            StartTime = DateTime.UtcNow
        };
        
        try
        {
            // Step 1: Create a template if none exists
            var templates = await templateService.GetAllTemplatesAsync(true);
            SeoTemplate template;
            
            if (!templates.Any())
            {
                template = new SeoTemplate
                {
                    Name = "Demo Movie Page Template",
                    Type = "movie",
                    Template = @"
                        <h1>{{ title }} ({{ year }}) - Stream Online in {{ country }}</h1>
                        <p>Watch {{ title }} streaming online in {{ country }}. {{ description | default: 'A great movie to watch.' }}</p>
                        <div class=""streaming-info"">
                            <h2>Where to Watch {{ title }}</h2>
                            <p>{{ title }} is available for streaming in {{ country }} on popular platforms.</p>
                            {% if genres.size > 0 %}
                            <p><strong>Genres:</strong> {{ genres | join: ', ' }}</p>
                            {% endif %}
                            {% if year %}
                            <p><strong>Release Year:</strong> {{ year }}</p>
                            {% endif %}
                        </div>
                        <div class=""movie-details"">
                            <h2>About {{ title }}</h2>
                            <p>{{ description | default: 'Experience this amazing content.' }}</p>
                            <p>Find out where to stream {{ title }} in {{ country }} and enjoy this {{ genres | first | default: 'amazing' }} content.</p>
                        </div>",
                    MetaTitle = "{{ title }} ({{ year }}) - Stream Online in {{ country }}",
                    MetaDescription = "Watch {{ title }} online. Find where to stream {{ title }} in {{ country }}. {{ description | truncate: 100 | default: 'Great streaming content.' }}",
                    H1Template = "{{ title }} ({{ year }}) - Stream Online",
                    UrlPattern = "/movie/{{ title | slugify }}-{{ year }}-{{ country | downcase }}",
                    Variables = JsonSerializer.Serialize(new Dictionary<string, TemplateVariable>
                    {
                        ["title"] = new() { Name = "title", Type = "string", Required = true },
                        ["year"] = new() { Name = "year", Type = "number", Required = true },
                        ["country"] = new() { Name = "country", Type = "string", Required = true },
                        ["description"] = new() { Name = "description", Type = "string", Required = false },
                        ["genres"] = new() { Name = "genres", Type = "array", Required = false }
                    }),
                    IsActive = true,
                    Priority = 1,
                    CreatedBy = "demo"
                };
                
                template = await templateService.CreateTemplateAsync(template);
                result.TemplateCreated = true;
            }
            else
            {
                template = templates.First();
            }
            
            result.TemplateId = template.Id;
            
            // Step 2: Generate sample pages
            var sampleData = new[]
            {
                new { title = "The Matrix", year = 1999, country = "US", description = "A computer programmer discovers reality is a simulation.", genres = new[] { "Action", "Sci-Fi" } },
                new { title = "Inception", year = 2010, country = "US", description = "A thief enters dreams to steal secrets.", genres = new[] { "Action", "Thriller" } },
                new { title = "Avatar", year = 2009, country = "CA", description = "A marine fights on an alien world.", genres = new[] { "Action", "Adventure" } },
                new { title = "Titanic", year = 1997, country = "UK", description = "A romance aboard the doomed ship.", genres = new[] { "Romance", "Drama" } },
                new { title = "Interstellar", year = 2014, country = "AU", description = "Astronauts search for humanity's new home.", genres = new[] { "Sci-Fi", "Drama" } }
            };
            
            var generatedPages = new List<SeoPage>();
            
            foreach (var data in sampleData)
            {
                var variables = new Dictionary<string, object>
                {
                    ["title"] = data.title,
                    ["year"] = data.year,
                    ["country"] = data.country,
                    ["description"] = data.description,
                    ["genres"] = data.genres
                };
                
                var request = new SeoGenerationRequest
                {
                    TemplateId = template.Id,
                    Variables = variables,
                    ForceRegenerate = true,
                    PublishImmediately = true
                };
                
                var page = await templateService.GeneratePageAsync(request);
                generatedPages.Add(page);
            }
            
            result.PagesGenerated = generatedPages.Count;
            result.GeneratedPages = generatedPages;
            
            // Step 3: Generate a batch job for additional pages
            var batchVariables = new List<Dictionary<string, object>>();
            var countries = new[] { "US", "CA", "UK", "AU", "DE" };
            var movies = new[]
            {
                new { title = "Dune", year = 2021, description = "A desert planet holds the key to humanity's future." },
                new { title = "Spider-Man", year = 2002, description = "A teenager gains spider powers." },
                new { title = "Batman Begins", year = 2005, description = "The origin story of the Dark Knight." }
            };
            
            foreach (var movie in movies)
            {
                foreach (var country in countries)
                {
                    batchVariables.Add(new Dictionary<string, object>
                    {
                        ["title"] = movie.title,
                        ["year"] = movie.year,
                        ["country"] = country,
                        ["description"] = movie.description,
                        ["genres"] = new[] { "Action", "Adventure" }
                    });
                }
            }
            
            var batchRequest = new SeoBatchGenerationRequest
            {
                TemplateId = template.Id,
                VariableSets = batchVariables,
                JobName = "Demo Batch Generation",
                BatchSize = 5,
                ConcurrencyLimit = 2,
                PublishImmediately = true,
                ForceRegenerate = true
            };
            
            var batchJob = await templateService.StartBatchJobAsync(batchRequest);
            result.BatchJobId = batchJob.Id;
            result.BatchPagesRequested = batchVariables.Count;
            
            // Wait a moment for batch processing to start
            await Task.Delay(1000);
            
            // Step 4: Get analytics and verify results
            await Task.Delay(2000); // Give batch job time to process
            
            var analytics = await templateService.GetAnalyticsAsync();
            result.AnalyticsSnapshot = analytics;
            
            var topPages = await templateService.GetTopPerformingPagesAsync(10);
            result.TopPages = topPages;
            
            // Step 5: Generate sitemap
            var sitemap = await templateService.GenerateXmlSitemapAsync(new[] { template.Id });
            result.SitemapGenerated = !string.IsNullOrEmpty(sitemap) && sitemap.Contains("<url>");
            
            result.Success = true;
            result.Message = $"Successfully demonstrated content generation: {result.PagesGenerated} pages created, batch job {result.BatchJobId} started for {result.BatchPagesRequested} additional pages";
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"Demo failed: {ex.Message}";
            result.Error = ex.ToString();
        }
        
        result.EndTime = DateTime.UtcNow;
        result.Duration = result.EndTime - result.StartTime;
        
        return result;
    }
}

/// <summary>
/// Result of content generation demonstration
/// </summary>
public class ContentGenerationResult
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public TimeSpan Duration { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Error { get; set; }
    
    public bool TemplateCreated { get; set; }
    public int TemplateId { get; set; }
    public int PagesGenerated { get; set; }
    public List<SeoPage> GeneratedPages { get; set; } = new();
    
    public long BatchJobId { get; set; }
    public int BatchPagesRequested { get; set; }
    
    public SeoAnalyticsResponse? AnalyticsSnapshot { get; set; }
    public List<TopPerformingPage> TopPages { get; set; } = new();
    public bool SitemapGenerated { get; set; }
    
    public Dictionary<string, object> GetSummary()
    {
        return new Dictionary<string, object>
        {
            ["success"] = Success,
            ["message"] = Message,
            ["duration"] = $"{Duration.TotalMilliseconds:F0}ms",
            ["templateCreated"] = TemplateCreated,
            ["pagesGenerated"] = PagesGenerated,
            ["batchJobStarted"] = BatchJobId > 0,
            ["batchPagesRequested"] = BatchPagesRequested,
            ["totalPagesInSystem"] = AnalyticsSnapshot?.TotalPages ?? 0,
            ["publishedPages"] = AnalyticsSnapshot?.PublishedPages ?? 0,
            ["sitemapGenerated"] = SitemapGenerated
        };
    }
}