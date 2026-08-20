using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.ProgrammaticSeo.Models;
using System.Text.Json;

namespace GeoLeap.Api.ProgrammaticSeo.Data;

/// <summary>
/// Database context for programmatic SEO entities
/// Extends the main ApplicationDbContext with SEO-specific tables
/// </summary>
public class SeoDbContext : DbContext
{
    public SeoDbContext(DbContextOptions<SeoDbContext> options) : base(options)
    {
    }

    // SEO Template Management
    public DbSet<SeoTemplate> SeoTemplates { get; set; }
    public DbSet<SeoPage> SeoPages { get; set; }
    public DbSet<SeoBatchJob> SeoBatchJobs { get; set; }
    
    // Keyword Research
    public DbSet<SeoKeyword> SeoKeywords { get; set; }
    public DbSet<ContentVariable> ContentVariables { get; set; }
    
    // Content Clustering
    public DbSet<ContentCluster> ContentClusters { get; set; }
    
    // Performance Metrics
    public DbSet<SeoMetrics> SeoMetrics { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        ConfigureSeoTemplate(modelBuilder);
        ConfigureSeoPage(modelBuilder);
        ConfigureSeoBatchJob(modelBuilder);
        ConfigureSeoKeyword(modelBuilder);
        ConfigureContentVariable(modelBuilder);
        ConfigureContentCluster(modelBuilder);
        ConfigureSeoMetrics(modelBuilder);
        
        // Add indexes for performance
        AddIndexes(modelBuilder);
        
        // Seed default data
        SeedDefaultData(modelBuilder);
    }

    private void ConfigureSeoTemplate(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SeoTemplate>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(100);
                
            entity.Property(e => e.Type)
                .IsRequired()
                .HasMaxLength(50);
                
            entity.Property(e => e.Template)
                .IsRequired();
                
            entity.Property(e => e.MetaTitle)
                .HasMaxLength(200);
                
            entity.Property(e => e.MetaDescription)
                .HasMaxLength(500);
                
            entity.Property(e => e.H1Template)
                .HasMaxLength(200);
                
            entity.Property(e => e.UrlPattern)
                .HasMaxLength(500);
                
            entity.Property(e => e.Variables)
                .HasDefaultValue("{}");
                
            entity.Property(e => e.CreatedBy)
                .HasMaxLength(100);
                
            entity.Property(e => e.CanonicalPattern)
                .HasMaxLength(500);
                
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.IsActive);
            entity.HasIndex(e => e.CreatedAt);
        });
    }

    private void ConfigureSeoPage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SeoPage>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Slug)
                .IsRequired()
                .HasMaxLength(500);
                
            entity.Property(e => e.Content)
                .IsRequired();
                
            entity.Property(e => e.MetaTitle)
                .HasMaxLength(200);
                
            entity.Property(e => e.MetaDescription)
                .HasMaxLength(500);
                
            entity.Property(e => e.H1)
                .HasMaxLength(200);
                
            entity.Property(e => e.CanonicalUrl)
                .HasMaxLength(500);
                
            entity.Property(e => e.VariableValues)
                .HasDefaultValue("{}");
                
            entity.Property(e => e.PrimaryKeyword)
                .HasMaxLength(200);
                
            entity.Property(e => e.GenerationLog);
            
            // Relationships
            entity.HasOne(e => e.Template)
                .WithMany()
                .HasForeignKey(e => e.TemplateId)
                .OnDelete(DeleteBehavior.Cascade);
            
            // Unique constraint on slug
            entity.HasIndex(e => e.Slug)
                .IsUnique();
                
            entity.HasIndex(e => e.TemplateId);
            entity.HasIndex(e => e.IsPublished);
            entity.HasIndex(e => e.GeneratedAt);
            entity.HasIndex(e => e.ViewCount);
        });
    }

    private void ConfigureSeoBatchJob(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SeoBatchJob>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.JobName)
                .IsRequired()
                .HasMaxLength(200);
                
            entity.Property(e => e.Status)
                .HasConversion<string>();
                
            entity.Property(e => e.Configuration)
                .HasDefaultValue("{}");
                
            entity.Property(e => e.CreatedBy)
                .HasMaxLength(100);
            
            // Relationships
            entity.HasOne(e => e.Template)
                .WithMany()
                .HasForeignKey(e => e.TemplateId)
                .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasIndex(e => e.TemplateId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });
    }

    private void ConfigureSeoKeyword(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SeoKeyword>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Keyword)
                .IsRequired()
                .HasMaxLength(200);
                
            entity.Property(e => e.ContentType)
                .HasMaxLength(50);
                
            entity.Property(e => e.ContentId)
                .HasMaxLength(50);
                
            entity.Property(e => e.Category)
                .HasMaxLength(50);
                
            entity.Property(e => e.TrendingReason)
                .HasMaxLength(100);
                
            entity.Property(e => e.RelatedKeywords)
                .HasDefaultValue("[]");
            
            entity.Property(e => e.CostPerClick)
                .HasPrecision(10, 4);
            
            // Unique constraint on keyword
            entity.HasIndex(e => e.Keyword)
                .IsUnique();
                
            entity.HasIndex(e => e.SearchVolume);
            entity.HasIndex(e => e.CompetitionScore);
            entity.HasIndex(e => e.KeywordDifficulty);
            entity.HasIndex(e => e.TrendingScore);
            entity.HasIndex(e => e.ContentType);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.LastUpdated);
        });
    }

    private void ConfigureContentVariable(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContentVariable>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(50);
                
            entity.Property(e => e.Value)
                .IsRequired();
                
            entity.Property(e => e.VariableType)
                .HasMaxLength(20);
                
            entity.Property(e => e.Category)
                .HasMaxLength(50);
                
            entity.Property(e => e.DataSource)
                .HasMaxLength(200);
            
            entity.HasIndex(e => e.Name);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.IsActive);
        });
    }

    private void ConfigureContentCluster(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContentCluster>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            entity.Property(e => e.ClusterName)
                .IsRequired()
                .HasMaxLength(100);
                
            entity.Property(e => e.ContentType)
                .HasMaxLength(50);
                
            entity.Property(e => e.ClusteringCriteria)
                .HasMaxLength(200);
            
            // Many-to-many relationship with pages
            entity.HasMany(e => e.Pages)
                .WithMany()
                .UsingEntity<Dictionary<string, object>>(
                    "ContentClusterPages",
                    j => j.HasOne<SeoPage>().WithMany().HasForeignKey("PageId"),
                    j => j.HasOne<ContentCluster>().WithMany().HasForeignKey("ClusterId"));
            
            entity.HasIndex(e => e.ClusterName);
            entity.HasIndex(e => e.IsActive);
        });
    }

    private void ConfigureSeoMetrics(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SeoMetrics>(entity =>
        {
            entity.HasKey(e => e.Id);
            
            // Relationships
            entity.HasOne(e => e.Page)
                .WithMany()
                .HasForeignKey(e => e.PageId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => e.PageId);
            entity.HasIndex(e => e.MetricDate);
            entity.HasIndex(e => new { e.PageId, e.MetricDate })
                .IsUnique();
        });
    }

    private void AddIndexes(ModelBuilder modelBuilder)
    {
        // Composite indexes for common queries
        modelBuilder.Entity<SeoPage>()
            .HasIndex(e => new { e.TemplateId, e.IsPublished });
            
        modelBuilder.Entity<SeoPage>()
            .HasIndex(e => new { e.IsPublished, e.ViewCount });
            
        modelBuilder.Entity<SeoKeyword>()
            .HasIndex(e => new { e.ContentType, e.SearchVolume });
            
        modelBuilder.Entity<SeoKeyword>()
            .HasIndex(e => new { e.Category, e.CompetitionScore });
            
        modelBuilder.Entity<SeoMetrics>()
            .HasIndex(e => new { e.MetricDate, e.DailyViews });
    }

    private void SeedDefaultData(ModelBuilder modelBuilder)
    {
        // Seed default SEO templates
        modelBuilder.Entity<SeoTemplate>().HasData(
            new SeoTemplate
            {
                Id = 1,
                Name = "Movie Detail Page",
                Type = "movie",
                Template = @"<h1>{{ title }} ({{ year }}) - Stream Online</h1>
                <p>Watch {{ title }} streaming online in {{ country }}. {{ description }}</p>
                <div class=""streaming-info"">
                    <h2>Where to Watch {{ title }}</h2>
                    <p>{{ title }} is available for streaming on the following platforms in {{ country }}:</p>
                    <ul>
                    {% for provider in providers %}
                        <li>{{ provider.name }} - {{ provider.type }}</li>
                    {% endfor %}
                    </ul>
                </div>
                <div class=""movie-details"">
                    <h2>About {{ title }}</h2>
                    <p><strong>Release Year:</strong> {{ year }}</p>
                    <p><strong>Genre:</strong> {{ genres | join: ', ' }}</p>
                    <p><strong>Runtime:</strong> {{ runtime }} minutes</p>
                    <p>{{ description }}</p>
                </div>",
                MetaTitle = "{{ title }} ({{ year }}) - Stream Online in {{ country }}",
                MetaDescription = "Watch {{ title }} online. Find where to stream {{ title }} in {{ country }}. {{ description | truncate: 100 }}",
                H1Template = "{{ title }} ({{ year }}) - Stream Online",
                UrlPattern = "/movie/{{ title | slugify }}-{{ year }}-{{ country | downcase }}",
                Variables = JsonSerializer.Serialize(new Dictionary<string, TemplateVariable>
                {
                    ["title"] = new() { Name = "title", Type = "string", Required = true },
                    ["year"] = new() { Name = "year", Type = "number", Required = true },
                    ["country"] = new() { Name = "country", Type = "string", Required = true },
                    ["description"] = new() { Name = "description", Type = "string", Required = true },
                    ["genres"] = new() { Name = "genres", Type = "array", Required = false },
                    ["runtime"] = new() { Name = "runtime", Type = "number", Required = false },
                    ["providers"] = new() { Name = "providers", Type = "array", Required = false }
                }),
                IsActive = true,
                Priority = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system"
            },
            new SeoTemplate
            {
                Id = 2,
                Name = "Genre Landing Page",
                Type = "genre",
                Template = @"<h1>Best {{ genre }} Movies and TV Shows in {{ country }}</h1>
                <p>Discover the top {{ genre | downcase }} content available for streaming in {{ country }}.</p>
                <div class=""genre-content"">
                    <h2>Popular {{ genre }} Movies</h2>
                    <p>Find the most popular {{ genre | downcase }} movies currently streaming in {{ country }}.</p>
                    <h2>Top {{ genre }} TV Series</h2>
                    <p>Explore acclaimed {{ genre | downcase }} TV series available in {{ country }}.</p>
                    <h2>Where to Stream {{ genre }} Content</h2>
                    <p>{{ genre }} movies and shows are available on various streaming platforms in {{ country }}.</p>
                </div>",
                MetaTitle = "Best {{ genre }} Movies & TV Shows in {{ country }} - Stream Online",
                MetaDescription = "Find the best {{ genre | downcase }} movies and TV shows streaming in {{ country }}. Discover where to watch top {{ genre | downcase }} content online.",
                H1Template = "Best {{ genre }} Movies and TV Shows in {{ country }}",
                UrlPattern = "/{{ genre | slugify }}-movies-tv-shows-{{ country | downcase }}",
                Variables = JsonSerializer.Serialize(new Dictionary<string, TemplateVariable>
                {
                    ["genre"] = new() { Name = "genre", Type = "string", Required = true },
                    ["country"] = new() { Name = "country", Type = "string", Required = true }
                }),
                IsActive = true,
                Priority = 2,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = "system"
            }
        );

        // Seed sample content variables
        modelBuilder.Entity<ContentVariable>().HasData(
            new ContentVariable
            {
                Id = 1,
                Name = "streaming_countries",
                Value = JsonSerializer.Serialize(new[] { "US", "CA", "UK", "AU", "DE", "FR", "IT", "ES", "BR", "MX" }),
                VariableType = "array",
                Category = "location",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new ContentVariable
            {
                Id = 2,
                Name = "movie_genres",
                Value = JsonSerializer.Serialize(new[] { "Action", "Adventure", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Documentary", "Animation" }),
                VariableType = "array",
                Category = "content",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new ContentVariable
            {
                Id = 3,
                Name = "current_year",
                Value = DateTime.Now.Year.ToString(),
                VariableType = "number",
                Category = "time",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                RefreshIntervalHours = 24
            }
        );
    }
}

/// <summary>
/// Extension methods for adding SEO database context
/// </summary>
public static class SeoDbContextExtensions
{
    public static void AddSeoDbContext(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SeoDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorNumbersToAdd: null);
            });
            
            // Enable query tracking for better performance monitoring
            options.EnableSensitiveDataLogging(false);
            options.EnableServiceProviderCaching(true);
            options.EnableDetailedErrors(false);
        });
    }
    
    public static async Task InitializeSeoDbAsync(this IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SeoDbContext>();
        
        // Ensure database is created and migrated
        await context.Database.EnsureCreatedAsync();
        
        // Run any pending migrations
        if (context.Database.GetPendingMigrations().Any())
        {
            await context.Database.MigrateAsync();
        }
    }
}