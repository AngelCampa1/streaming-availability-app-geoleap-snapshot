using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;
using DotLiquid;
using System.Collections.Concurrent;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Service for SEO template management and dynamic page generation
/// Implements high-performance batch processing for 50,000+ pages
/// </summary>
public class SeoTemplateService : ISeoTemplateService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SeoTemplateService> _logger;
    // DotLiquid doesn't need parser initialization like Fluid
    private readonly SemaphoreSlim _batchSemaphore;
    
    // Performance optimization
    private readonly ConcurrentDictionary<int, SeoTemplate> _templateCache;
    private readonly ConcurrentDictionary<string, string> _renderedContentCache;
    
    public SeoTemplateService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<SeoTemplateService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        // DotLiquid initialization handled in ConfigureDotLiquidTemplates()
        _batchSemaphore = new SemaphoreSlim(Environment.ProcessorCount, Environment.ProcessorCount);
        _templateCache = new ConcurrentDictionary<int, SeoTemplate>();
        _renderedContentCache = new ConcurrentDictionary<string, string>();
        
        ConfigureDotLiquidTemplates();
    }
    
    #region Template Management
    
    public async Task<SeoTemplate> CreateTemplateAsync(SeoTemplate template)
    {
        try
        {
            // Validate template before creation
            var validationErrors = await GetTemplateErrorsAsync(template);
            if (validationErrors.Any())
            {
                throw new ArgumentException($"Template validation failed: {string.Join(", ", validationErrors)}");
            }
            
            template.CreatedAt = DateTime.UtcNow;
            template.UpdatedAt = DateTime.UtcNow;
            
            _context.SeoTemplates.Add(template);
            await _context.SaveChangesAsync();
            
            // Cache the template
            _templateCache.TryAdd(template.Id, template);
            
            _logger.LogInformation("SEO template created: {TemplateId} - {TemplateName}", template.Id, template.Name);
            
            return template;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create SEO template: {TemplateName}", template.Name);
            throw;
        }
    }
    
    public async Task<SeoTemplate?> GetTemplateAsync(int id)
    {
        // Try cache first
        if (_templateCache.TryGetValue(id, out var cachedTemplate))
        {
            return cachedTemplate;
        }
        
        var template = await _context.SeoTemplates
            .FirstOrDefaultAsync(t => t.Id == id);
        
        if (template != null)
        {
            _templateCache.TryAdd(id, template);
        }
        
        return template;
    }
    
    public async Task<List<SeoTemplate>> GetAllTemplatesAsync(bool activeOnly = true)
    {
        var query = _context.SeoTemplates.AsQueryable();
        
        if (activeOnly)
        {
            query = query.Where(t => t.IsActive);
        }
        
        return await query.OrderBy(t => t.Name).ToListAsync();
    }
    
    public async Task<List<SeoTemplate>> GetTemplatesByTypeAsync(string type, bool activeOnly = true)
    {
        var query = _context.SeoTemplates
            .Where(t => t.Type == type);
        
        if (activeOnly)
        {
            query = query.Where(t => t.IsActive);
        }
        
        return await query.OrderBy(t => t.Priority).ToListAsync();
    }
    
    public async Task<SeoTemplate> UpdateTemplateAsync(SeoTemplate template)
    {
        try
        {
            template.UpdatedAt = DateTime.UtcNow;
            
            _context.SeoTemplates.Update(template);
            await _context.SaveChangesAsync();
            
            // Update cache
            _templateCache.AddOrUpdate(template.Id, template, (key, oldValue) => template);
            
            // Clear rendered content cache for this template
            ClearTemplateCache(template.Id);
            
            _logger.LogInformation("SEO template updated: {TemplateId}", template.Id);
            
            return template;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update SEO template: {TemplateId}", template.Id);
            throw;
        }
    }
    
    public async Task<bool> DeleteTemplateAsync(int id)
    {
        try
        {
            var template = await _context.SeoTemplates.FindAsync(id);
            if (template == null) return false;
            
            // Check if template has generated pages
            var hasPages = await _context.SeoPages.AnyAsync(p => p.TemplateId == id);
            if (hasPages)
            {
                // Soft delete - mark as inactive
                template.IsActive = false;
                await _context.SaveChangesAsync();
            }
            else
            {
                // Hard delete if no pages generated
                _context.SeoTemplates.Remove(template);
                await _context.SaveChangesAsync();
            }
            
            // Remove from cache
            _templateCache.TryRemove(id, out _);
            ClearTemplateCache(id);
            
            _logger.LogInformation("SEO template deleted: {TemplateId}", id);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete SEO template: {TemplateId}", id);
            throw;
        }
    }
    
    public async Task<SeoTemplate> CloneTemplateAsync(int id, string newName)
    {
        var originalTemplate = await GetTemplateAsync(id);
        if (originalTemplate == null)
        {
            throw new ArgumentException($"Template with ID {id} not found");
        }
        
        var clonedTemplate = new SeoTemplate
        {
            Name = newName,
            Type = originalTemplate.Type,
            Template = originalTemplate.Template,
            MetaTitle = originalTemplate.MetaTitle,
            MetaDescription = originalTemplate.MetaDescription,
            H1Template = originalTemplate.H1Template,
            UrlPattern = originalTemplate.UrlPattern,
            Variables = originalTemplate.Variables,
            IndexPage = originalTemplate.IndexPage,
            FollowLinks = originalTemplate.FollowLinks,
            CanonicalPattern = originalTemplate.CanonicalPattern,
            RefreshIntervalHours = originalTemplate.RefreshIntervalHours,
            IsActive = true,
            Priority = originalTemplate.Priority,
            CreatedBy = originalTemplate.CreatedBy
        };
        
        return await CreateTemplateAsync(clonedTemplate);
    }
    
    #endregion
    
    #region Template Validation
    
    public async Task<bool> ValidateTemplateAsync(SeoTemplate template)
    {
        var errors = await GetTemplateErrorsAsync(template);
        return !errors.Any();
    }
    
    public async Task<List<string>> GetTemplateErrorsAsync(SeoTemplate template)
    {
        var errors = new List<string>();
        
        try
        {
            // Validate DotLiquid template syntax
            try
            {
                Template.Parse(template.Template);
            }
            catch (Exception ex)
            {
                errors.Add($"Template syntax error: {ex.Message}");
            }
            
            // Validate meta title template
            if (!string.IsNullOrEmpty(template.MetaTitle))
            {
                try
                {
                    Template.Parse(template.MetaTitle);
                }
                catch (Exception ex)
                {
                    errors.Add($"Meta title error: {ex.Message}");
                }
            }
            
            // Validate meta description template
            if (!string.IsNullOrEmpty(template.MetaDescription))
            {
                try
                {
                    Template.Parse(template.MetaDescription);
                }
                catch (Exception ex)
                {
                    errors.Add($"Meta description error: {ex.Message}");
                }
            }
            
            // Validate H1 template
            if (!string.IsNullOrEmpty(template.H1Template))
            {
                try
                {
                    Template.Parse(template.H1Template);
                }
                catch (Exception ex)
                {
                    errors.Add($"H1 template error: {ex.Message}");
                }
            }
            
            // Validate URL pattern
            if (!string.IsNullOrEmpty(template.UrlPattern))
            {
                var urlVariables = ExtractVariablesFromPattern(template.UrlPattern);
                var templateVariables = await ParseTemplateVariablesAsync(template.Template);
                
                foreach (var urlVar in urlVariables)
                {
                    if (!templateVariables.ContainsKey(urlVar))
                    {
                        errors.Add($"URL pattern variable '{urlVar}' not found in template");
                    }
                }
            }
            
            // Validate JSON variables
            if (!string.IsNullOrEmpty(template.Variables))
            {
                try
                {
                    JsonSerializer.Deserialize<Dictionary<string, TemplateVariable>>(template.Variables);
                }
                catch (JsonException ex)
                {
                    errors.Add($"Invalid variables JSON: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            errors.Add($"Validation error: {ex.Message}");
        }
        
        return errors;
    }
    
    public Task<Dictionary<string, object>> ParseTemplateVariablesAsync(string templateContent)
    {
        var variables = new Dictionary<string, object>();

        // Parse DotLiquid template to extract variables
        var variablePattern = @"\{\{\s*([^}]+)\s*\}\}";
        var matches = Regex.Matches(templateContent, variablePattern);

        foreach (Match match in matches)
        {
            var variableExpression = match.Groups[1].Value.Trim();
            var variableName = variableExpression.Split('.')[0].Split(' ')[0];

            if (!variables.ContainsKey(variableName))
            {
                variables[variableName] = "string"; // Default type
            }
        }

        return Task.FromResult(variables);
    }
    
    #endregion
    
    #region Page Generation
    
    public async Task<SeoPage> GeneratePageAsync(SeoGenerationRequest request)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var template = await GetTemplateAsync(request.TemplateId);
            if (template == null)
            {
                throw new ArgumentException($"Template with ID {request.TemplateId} not found");
            }
            
            // Generate slug
            var slug = !string.IsNullOrEmpty(request.CustomSlug) 
                ? request.CustomSlug 
                : await GenerateSlugAsync(template.UrlPattern, request.Variables);
            
            // Check if page already exists
            var existingPage = await _context.SeoPages
                .FirstOrDefaultAsync(p => p.Slug == slug);
            
            if (existingPage != null && !request.ForceRegenerate)
            {
                return existingPage;
            }
            
            // Generate content
            var content = await RenderTemplateAsync(template.Template, request.Variables);
            var metaTitle = await GenerateMetaTitleAsync(template.MetaTitle, request.Variables);
            var metaDescription = await GenerateMetaDescriptionAsync(template.MetaDescription, request.Variables);
            var h1 = await GenerateH1Async(template.H1Template, request.Variables);
            
            // Calculate content metrics
            var wordCount = CountWords(content);
            var readingTime = CalculateReadingTime(wordCount);
            
            var seoPage = new SeoPage
            {
                TemplateId = request.TemplateId,
                Slug = slug,
                Content = content,
                MetaTitle = metaTitle,
                MetaDescription = metaDescription,
                H1 = h1,
                VariableValues = JsonSerializer.Serialize(request.Variables),
                WordCount = wordCount,
                ReadingTimeMinutes = readingTime,
                GenerationTime = stopwatch.Elapsed,
                IsPublished = request.PublishImmediately,
                GeneratedAt = DateTime.UtcNow
            };
            
            // Handle canonical URL
            if (!string.IsNullOrEmpty(template.CanonicalPattern))
            {
                seoPage.CanonicalUrl = await GenerateSlugAsync(template.CanonicalPattern, request.Variables);
            }
            
            if (existingPage != null)
            {
                // Update existing page
                existingPage.Content = content;
                existingPage.MetaTitle = metaTitle;
                existingPage.MetaDescription = metaDescription;
                existingPage.H1 = h1;
                existingPage.VariableValues = seoPage.VariableValues;
                existingPage.WordCount = wordCount;
                existingPage.ReadingTimeMinutes = readingTime;
                existingPage.GenerationTime = stopwatch.Elapsed;
                existingPage.LastUpdated = DateTime.UtcNow;
                existingPage.IsPublished = request.PublishImmediately;
                
                _context.SeoPages.Update(existingPage);
                await _context.SaveChangesAsync();
                
                return existingPage;
            }
            else
            {
                // Create new page
                _context.SeoPages.Add(seoPage);
                await _context.SaveChangesAsync();
                
                return seoPage;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate SEO page for template {TemplateId}", request.TemplateId);
            throw;
        }
        finally
        {
            stopwatch.Stop();
        }
    }
    
    public async Task<List<SeoPage>> GeneratePagesAsync(SeoBatchGenerationRequest request)
    {
        var pages = new List<SeoPage>();
        var semaphore = new SemaphoreSlim(request.ConcurrencyLimit, request.ConcurrencyLimit);
        var tasks = new List<Task<SeoPage>>();
        
        foreach (var variableSet in request.VariableSets)
        {
            tasks.Add(GeneratePageWithSemaphoreAsync(semaphore, new SeoGenerationRequest
            {
                TemplateId = request.TemplateId,
                Variables = variableSet,
                ForceRegenerate = request.ForceRegenerate,
                PublishImmediately = request.PublishImmediately
            }));
        }
        
        try
        {
            var results = await Task.WhenAll(tasks);
            pages.AddRange(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Batch page generation failed for template {TemplateId}", request.TemplateId);
            throw;
        }
        
        return pages;
    }
    
    private async Task<SeoPage> GeneratePageWithSemaphoreAsync(SemaphoreSlim semaphore, SeoGenerationRequest request)
    {
        await semaphore.WaitAsync();
        try
        {
            return await GeneratePageAsync(request);
        }
        finally
        {
            semaphore.Release();
        }
    }
    
    public async Task<SeoBatchJob> StartBatchJobAsync(SeoBatchGenerationRequest request)
    {
        var job = new SeoBatchJob
        {
            JobName = request.JobName,
            TemplateId = request.TemplateId,
            TotalPages = request.VariableSets.Count,
            BatchSize = request.BatchSize,
            ConcurrencyLimit = request.ConcurrencyLimit,
            Configuration = JsonSerializer.Serialize(request),
            Status = BatchJobStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.SeoBatchJobs.Add(job);
        await _context.SaveChangesAsync();

        // BUG FIX: Added proper error handling for fire-and-forget task
        // Start background processing (in a real implementation, use a queue system)
        _ = Task.Run(async () =>
        {
            try
            {
                await ProcessBatchJobAsync(job.Id, request);
                _logger.LogInformation("Batch job {JobId} completed successfully", job.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Batch job {JobId} failed with unhandled exception", job.Id);

                // Attempt to update job status to failed
                try
                {
                    var failedJob = await _context.SeoBatchJobs.FindAsync(job.Id);
                    if (failedJob != null)
                    {
                        failedJob.Status = BatchJobStatus.Failed;
                        failedJob.ErrorLog = $"Unhandled exception: {ex.Message}";
                        failedJob.CompletedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }
                catch (Exception dbEx)
                {
                    _logger.LogError(dbEx, "Failed to update job {JobId} status after failure", job.Id);
                }
            }
        });

        return job;
    }
    
    private async Task ProcessBatchJobAsync(long jobId, SeoBatchGenerationRequest request)
    {
        var job = await _context.SeoBatchJobs.FindAsync(jobId);
        if (job == null) return;
        
        try
        {
            job.Status = BatchJobStatus.Running;
            job.StartedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            var batches = request.VariableSets
                .Select((item, index) => new { item, index })
                .GroupBy(x => x.index / request.BatchSize)
                .Select(g => g.Select(x => x.item).ToList());
            
            foreach (var batch in batches)
            {
                var batchRequest = new SeoBatchGenerationRequest
                {
                    TemplateId = request.TemplateId,
                    VariableSets = batch,
                    ConcurrencyLimit = request.ConcurrencyLimit,
                    ForceRegenerate = request.ForceRegenerate,
                    PublishImmediately = request.PublishImmediately
                };
                
                try
                {
                    await GeneratePagesAsync(batchRequest);
                    job.CompletedPages += batch.Count;
                }
                catch (Exception ex)
                {
                    job.FailedPages += batch.Count;
                    job.ErrorLog += $"Batch error: {ex.Message}\n";
                }
                
                await _context.SaveChangesAsync();
            }
            
            job.Status = BatchJobStatus.Completed;
            job.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            job.Status = BatchJobStatus.Failed;
            job.ErrorLog = ex.Message;
            _logger.LogError(ex, "Batch job {JobId} failed", jobId);
        }
        
        await _context.SaveChangesAsync();
    }
    
    public async Task<SeoPage?> GetPageBySlugAsync(string slug)
    {
        return await _context.SeoPages
            .Include(p => p.Template)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);
    }
    
    public async Task<List<SeoPage>> GetPagesByTemplateAsync(int templateId, int page = 1, int pageSize = 50)
    {
        return await _context.SeoPages
            .Where(p => p.TemplateId == templateId)
            .OrderByDescending(p => p.GeneratedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }
    
    #endregion
    
    #region Content Rendering
    
    public Task<string> RenderTemplateAsync(string templateContent, Dictionary<string, object> variables)
    {
        try
        {
            // Create cache key
            var variablesJson = JsonSerializer.Serialize(variables, new JsonSerializerOptions { WriteIndented = false });
            var cacheKey = GenerateContentHash(templateContent + variablesJson);

            // Check cache
            if (_renderedContentCache.TryGetValue(cacheKey, out var cachedContent))
            {
                return Task.FromResult(cachedContent);
            }

            // Parse and render DotLiquid template
            var template = Template.Parse(templateContent);

            // Create render parameters
            var renderParameters = Hash.FromDictionary(variables.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value
            ));

            // Render template
            var result = template.Render(renderParameters);

            // Cache result
            _renderedContentCache.TryAdd(cacheKey, result);

            return Task.FromResult(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to render template");
            throw;
        }
    }
    
    public async Task<string> GenerateMetaTitleAsync(string metaTitleTemplate, Dictionary<string, object> variables)
    {
        if (string.IsNullOrEmpty(metaTitleTemplate))
            return string.Empty;
            
        var result = await RenderTemplateAsync(metaTitleTemplate, variables);
        return TruncateText(result, 60); // SEO best practice: 50-60 characters
    }
    
    public async Task<string> GenerateMetaDescriptionAsync(string metaDescriptionTemplate, Dictionary<string, object> variables)
    {
        if (string.IsNullOrEmpty(metaDescriptionTemplate))
            return string.Empty;
            
        var result = await RenderTemplateAsync(metaDescriptionTemplate, variables);
        return TruncateText(result, 160); // SEO best practice: 150-160 characters
    }
    
    public async Task<string> GenerateH1Async(string h1Template, Dictionary<string, object> variables)
    {
        if (string.IsNullOrEmpty(h1Template))
            return string.Empty;
            
        return await RenderTemplateAsync(h1Template, variables);
    }
    
    public async Task<string> GenerateSlugAsync(string urlPattern, Dictionary<string, object> variables)
    {
        if (string.IsNullOrEmpty(urlPattern))
            return Guid.NewGuid().ToString("N")[..8];
            
        var slug = await RenderTemplateAsync(urlPattern, variables);
        return SlugifyUrl(slug);
    }
    
    #endregion
    
    #region Helper Methods
    
    private void ConfigureDotLiquidTemplates()
    {
        // Register custom filters for SEO with DotLiquid
        Template.RegisterFilter(typeof(SeoFilters));
    }
    
    private string SlugifyUrl(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;
            
        // Convert to lowercase and replace invalid characters
        var slug = input.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("_", "-");
            
        // Remove invalid characters
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        
        // Remove duplicate hyphens
        slug = Regex.Replace(slug, @"-+", "-");
        
        // Trim hyphens from start and end
        slug = slug.Trim('-');
        
        return slug;
    }
    
    private string TruncateText(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            return text;
            
        return text.Substring(0, maxLength - 3) + "...";
    }
    
    private string CapitalizeEachWord(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;
            
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower());
    }
    
    private int CountWords(string content)
    {
        if (string.IsNullOrEmpty(content))
            return 0;
            
        // Remove HTML tags and count words
        var plainText = Regex.Replace(content, @"<[^>]*>", " ");
        var words = plainText.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        return words.Length;
    }
    
    private int CalculateReadingTime(int wordCount)
    {
        // Average reading speed: 200-250 words per minute
        return Math.Max(1, (int)Math.Ceiling(wordCount / 225.0));
    }
    
    private string GenerateContentHash(string content)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(hashBytes)[..16]; // Use first 16 characters
    }
    
    private List<string> ExtractVariablesFromPattern(string pattern)
    {
        var variables = new List<string>();
        var matches = Regex.Matches(pattern, @"\{([^}]+)\}");
        
        foreach (Match match in matches)
        {
            variables.Add(match.Groups[1].Value);
        }
        
        return variables;
    }
    
    private void ClearTemplateCache(int templateId)
    {
        var keysToRemove = _renderedContentCache.Keys
            .Where(key => key.Contains($"template_{templateId}_"))
            .ToList();
            
        foreach (var key in keysToRemove)
        {
            _renderedContentCache.TryRemove(key, out _);
        }
    }
    
    #endregion
    
    #region Internal Linking System
    
    /// <summary>
    /// Generate comprehensive internal linking between SEO pages
    /// </summary>
    public async Task<Dictionary<long, List<InternalLink>>> GenerateInternalLinksAsync(int templateId)
    {
        var internalLinks = new Dictionary<long, List<InternalLink>>();
        
        var pages = await _context.SeoPages
            .Where(p => p.TemplateId == templateId && p.IsPublished)
            .Include(p => p.Template)
            .ToListAsync();
        
        foreach (var page in pages)
        {
            var links = new List<InternalLink>();
            
            // Parse page variables for linking opportunities
            var pageVariables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
            
            // Find related pages by similar variables
            var relatedPages = await FindRelatedPagesAsync(page, pageVariables);
            
            foreach (var relatedPage in relatedPages.Take(10)) // Limit to 10 internal links per page
            {
                var linkText = await GenerateLinkTextAsync(page, relatedPage, pageVariables);
                var link = new InternalLink
                {
                    TargetPageId = relatedPage.Id,
                    TargetSlug = relatedPage.Slug,
                    TargetTitle = relatedPage.MetaTitle,
                    LinkText = linkText,
                    RelevanceScore = CalculateRelevanceScore(page, relatedPage),
                    LinkType = DetermineLinkType(page, relatedPage),
                    CreatedAt = DateTime.UtcNow
                };
                
                links.Add(link);
            }
            
            // Add contextual links based on content analysis
            var contextualLinks = await GenerateContextualLinksAsync(page);
            links.AddRange(contextualLinks);
            
            internalLinks[page.Id] = links;
        }
        
        return internalLinks;
    }
    
    /// <summary>
    /// Update page content with internal links
    /// </summary>
    public Task<string> InjectInternalLinksAsync(string content, List<InternalLink> links)
    {
        var updatedContent = content;

        foreach (var link in links.OrderByDescending(l => l.RelevanceScore))
        {
            // Find appropriate locations to inject links
            var injectionPoints = FindLinkInjectionPoints(updatedContent, link.LinkText);

            if (injectionPoints.Any())
            {
                var injectionPoint = injectionPoints.First();
                var linkHtml = $"<a href=\"/seo/pages/{link.TargetSlug}\" title=\"{link.TargetTitle}\">{link.LinkText}</a>";
                updatedContent = updatedContent.Insert(injectionPoint.Position, linkHtml);
            }
        }

        return Task.FromResult(updatedContent);
    }
    
    /// <summary>
    /// Create link clusters for better SEO architecture
    /// </summary>
    public async Task<List<LinkCluster>> CreateLinkClustersAsync(int templateId)
    {
        var pages = await _context.SeoPages
            .Where(p => p.TemplateId == templateId && p.IsPublished)
            .ToListAsync();
        
        var clusters = new List<LinkCluster>();
        var used = new HashSet<long>();
        
        foreach (var page in pages)
        {
            if (used.Contains(page.Id)) continue;
            
            var cluster = new LinkCluster
            {
                Name = ExtractClusterName(page),
                Pages = new List<SeoPage> { page },
                CreatedAt = DateTime.UtcNow
            };
            
            used.Add(page.Id);
            
            // Find similar pages for the cluster
            var pageVariables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
            
            foreach (var otherPage in pages)
            {
                if (used.Contains(otherPage.Id)) continue;
                
                var similarity = CalculatePageSimilarity(page, otherPage);
                if (similarity > 0.6f) // 60% similarity threshold
                {
                    cluster.Pages.Add(otherPage);
                    used.Add(otherPage.Id);
                }
            }
            
            if (cluster.Pages.Count > 1)
            {
                clusters.Add(cluster);
            }
        }
        
        return clusters;
    }
    
    private async Task<List<SeoPage>> FindRelatedPagesAsync(SeoPage sourcePage, Dictionary<string, object> variables)
    {
        var relatedPages = new List<SeoPage>();
        
        // Find pages with similar variables
        var allPages = await _context.SeoPages
            .Where(p => p.Id != sourcePage.Id && p.IsPublished)
            .ToListAsync();
        
        foreach (var page in allPages)
        {
            var pageVars = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
            var similarity = CalculateVariableSimilarity(variables, pageVars);
            
            if (similarity > 0.3f) // 30% variable similarity threshold
            {
                relatedPages.Add(page);
            }
        }
        
        return relatedPages.OrderByDescending(p => CalculateVariableSimilarity(variables, 
            JsonSerializer.Deserialize<Dictionary<string, object>>(p.VariableValues) ?? new()))
            .ToList();
    }
    
    private Task<string> GenerateLinkTextAsync(SeoPage sourcePage, SeoPage targetPage, Dictionary<string, object> variables)
    {
        var targetVariables = JsonSerializer.Deserialize<Dictionary<string, object>>(targetPage.VariableValues) ?? new();

        // Generate contextual link text based on target page variables
        if (targetVariables.ContainsKey("title") && targetVariables.ContainsKey("year"))
        {
            return Task.FromResult($"{targetVariables["title"]} ({targetVariables["year"]})");
        }

        if (targetVariables.ContainsKey("genre") && targetVariables.ContainsKey("country"))
        {
            return Task.FromResult($"{targetVariables["genre"]} movies in {targetVariables["country"]}");
        }

        // Fallback to meta title
        return Task.FromResult(targetPage.MetaTitle ?? targetPage.H1 ?? "Related content");
    }
    
    private float CalculateRelevanceScore(SeoPage sourcePage, SeoPage targetPage)
    {
        var sourceVars = JsonSerializer.Deserialize<Dictionary<string, object>>(sourcePage.VariableValues) ?? new();
        var targetVars = JsonSerializer.Deserialize<Dictionary<string, object>>(targetPage.VariableValues) ?? new();
        
        float score = 0f;
        
        // Template type similarity
        if (sourcePage.Template?.Type == targetPage.Template?.Type)
        {
            score += 0.3f;
        }
        
        // Variable overlap
        var variableSimilarity = CalculateVariableSimilarity(sourceVars, targetVars);
        score += variableSimilarity * 0.5f;
        
        // View count factor (popular pages get higher scores)
        if (targetPage.ViewCount > 100)
        {
            score += 0.2f;
        }
        
        return Math.Min(1.0f, score);
    }
    
    private string DetermineLinkType(SeoPage sourcePage, SeoPage targetPage)
    {
        if (sourcePage.Template?.Type == targetPage.Template?.Type)
        {
            return "related_content";
        }
        
        if (sourcePage.Template?.Type == "movie" && targetPage.Template?.Type == "genre")
        {
            return "genre_link";
        }
        
        if (sourcePage.Template?.Type == "genre" && targetPage.Template?.Type == "movie")
        {
            return "content_example";
        }
        
        return "cross_reference";
    }
    
    private async Task<List<InternalLink>> GenerateContextualLinksAsync(SeoPage page)
    {
        var contextualLinks = new List<InternalLink>();
        var pageVariables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
        
        // Generate links based on content context
        if (pageVariables.ContainsKey("genre"))
        {
            var genrePages = await _context.SeoPages
                .Where(p => p.Template.Type == "genre" && p.IsPublished)
                .Take(3)
                .ToListAsync();
                
            foreach (var genrePage in genrePages)
            {
                contextualLinks.Add(new InternalLink
                {
                    TargetPageId = genrePage.Id,
                    TargetSlug = genrePage.Slug,
                    TargetTitle = genrePage.MetaTitle,
                    LinkText = $"More {pageVariables["genre"]} content",
                    RelevanceScore = 0.7f,
                    LinkType = "contextual",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        
        return contextualLinks;
    }
    
    private List<LinkInjectionPoint> FindLinkInjectionPoints(string content, string linkText)
    {
        var injectionPoints = new List<LinkInjectionPoint>();
        
        // Find paragraph breaks as potential injection points
        var paragraphPattern = @"</p>\s*<p>";
        var matches = Regex.Matches(content, paragraphPattern);
        
        foreach (Match match in matches)
        {
            injectionPoints.Add(new LinkInjectionPoint
            {
                Position = match.Index + match.Length,
                Context = "paragraph_break",
                Score = 0.8f
            });
        }
        
        return injectionPoints.OrderByDescending(p => p.Score).ToList();
    }
    
    private float CalculateVariableSimilarity(Dictionary<string, object> vars1, Dictionary<string, object> vars2)
    {
        if (!vars1.Any() || !vars2.Any()) return 0f;
        
        var commonKeys = vars1.Keys.Intersect(vars2.Keys);
        var totalKeys = vars1.Keys.Union(vars2.Keys).Count();
        
        float similarity = 0f;
        
        foreach (var key in commonKeys)
        {
            if (vars1[key]?.ToString() == vars2[key]?.ToString())
            {
                similarity += 1f;
            }
        }
        
        return totalKeys > 0 ? similarity / totalKeys : 0f;
    }
    
    private float CalculatePageSimilarity(SeoPage page1, SeoPage page2)
    {
        var vars1 = JsonSerializer.Deserialize<Dictionary<string, object>>(page1.VariableValues) ?? new();
        var vars2 = JsonSerializer.Deserialize<Dictionary<string, object>>(page2.VariableValues) ?? new();
        
        return CalculateVariableSimilarity(vars1, vars2);
    }
    
    private string ExtractClusterName(SeoPage page)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object>>(page.VariableValues) ?? new();
        
        if (variables.ContainsKey("genre"))
        {
            return $"{variables["genre"]} Content Cluster";
        }
        
        if (variables.ContainsKey("country"))
        {
            return $"{variables["country"]} Content Cluster";
        }
        
        return page.Template?.Type ?? "General Cluster";
    }
    
    #endregion
    
    #region Placeholder Implementations (to be completed)
    
    public async Task<List<ContentVariable>> GetAvailableVariablesAsync(string category = "all")
    {
        var query = _context.ContentVariables.Where(v => v.IsActive);
        
        if (category != "all")
        {
            query = query.Where(v => v.Category == category);
        }
        
        return await query.ToListAsync();
    }
    
    public async Task<ContentVariable> CreateVariableAsync(ContentVariable variable)
    {
        variable.CreatedAt = DateTime.UtcNow;
        _context.ContentVariables.Add(variable);
        await _context.SaveChangesAsync();
        return variable;
    }
    
    public async Task<bool> DeleteVariableAsync(int id)
    {
        var variable = await _context.ContentVariables.FindAsync(id);
        if (variable == null) return false;
        
        _context.ContentVariables.Remove(variable);
        await _context.SaveChangesAsync();
        return true;
    }
    
    public async Task RefreshDynamicVariablesAsync()
    {
        // Implementation for refreshing dynamic variables from APIs
        await Task.CompletedTask;
    }
    
    public async Task<SeoTemplate> CreateVariantAsync(int originalId, string variantName, Dictionary<string, string> changes)
    {
        var original = await GetTemplateAsync(originalId);
        if (original == null) throw new ArgumentException("Original template not found");
        
        var variant = await CloneTemplateAsync(originalId, variantName);
        // Apply changes to variant
        return variant;
    }
    
    public Task<Dictionary<string, object>> GetTemplatePerformanceAsync(int templateId, DateTime? startDate = null, DateTime? endDate = null)
    {
        // Implementation for template performance analytics
        return Task.FromResult(new Dictionary<string, object>());
    }
    
    public async Task<SeoTemplate?> GetBestPerformingVariantAsync(int baseTemplateId)
    {
        // Implementation for finding best performing variant
        return await GetTemplateAsync(baseTemplateId);
    }
    
    public Task<SeoAnalyticsResponse> GetAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        // Implementation for comprehensive analytics
        return Task.FromResult(new SeoAnalyticsResponse());
    }
    
    public Task<List<TopPerformingPage>> GetTopPerformingPagesAsync(int count = 10)
    {
        // Implementation for top performing pages
        return Task.FromResult(new List<TopPerformingPage>());
    }
    
    public Task<List<SeoPage>> GetUnderperformingPagesAsync(int count = 10)
    {
        // Implementation for underperforming pages
        return Task.FromResult(new List<SeoPage>());
    }
    
    public Task<Dictionary<string, object>> GetContentGapsAsync()
    {
        // Implementation for content gap analysis
        return Task.FromResult(new Dictionary<string, object>());
    }
    
    public Task<int> RefreshOutdatedPagesAsync(int batchSize = 100)
    {
        // Implementation for refreshing outdated pages
        return Task.FromResult(0);
    }
    
    public async Task<bool> UpdatePageContentAsync(long pageId, Dictionary<string, object> newVariables)
    {
        var page = await _context.SeoPages.FindAsync(pageId);
        if (page == null) return false;
        
        var template = await GetTemplateAsync(page.TemplateId);
        if (template == null) return false;
        
        // Regenerate content with new variables
        var content = await RenderTemplateAsync(template.Template, newVariables);
        page.Content = content;
        page.VariableValues = JsonSerializer.Serialize(newVariables);
        page.LastUpdated = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return true;
    }
    
    public Task<int> BulkUpdatePagesAsync(int templateId, Dictionary<string, object> globalUpdates)
    {
        // Implementation for bulk updates
        return Task.FromResult(0);
    }
    
    public async Task<List<string>> GenerateSitemapUrlsAsync(int templateId)
    {
        var pages = await _context.SeoPages
            .Where(p => p.TemplateId == templateId && p.IsPublished)
            .Select(p => p.Slug)
            .ToListAsync();
            
        return pages;
    }
    
    public Task<string> GenerateXmlSitemapAsync(List<int>? templateIds = null)
    {
        // Implementation for XML sitemap generation
        return Task.FromResult("<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset></urlset>");
    }
    
    public Task<Dictionary<string, object>> GetSitemapStatsAsync()
    {
        // Implementation for sitemap statistics
        return Task.FromResult(new Dictionary<string, object>());
    }
    
    public Task<List<SeoPage>> DetectDuplicateContentAsync(float similarityThreshold = 0.8f)
    {
        // Implementation for duplicate content detection
        return Task.FromResult(new List<SeoPage>());
    }
    
    public Task<List<string>> ValidateGeneratedContentAsync(long pageId)
    {
        // Implementation for content validation
        return Task.FromResult(new List<string>());
    }
    
    public async Task<ContentCluster> CreateContentClusterAsync(string clusterName, string criteria)
    {
        var cluster = new ContentCluster
        {
            ClusterName = clusterName,
            ClusteringCriteria = criteria,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.ContentClusters.Add(cluster);
        await _context.SaveChangesAsync();
        return cluster;
    }
    
    public Task<bool> CheckContentUniquenessAsync(string content, int? excludePageId = null)
    {
        // Implementation for content uniqueness checking
        return Task.FromResult(true);
    }
    
    #endregion
}

/// <summary>
/// Custom DotLiquid filters for SEO functionality
/// </summary>
public static class SeoFilters
{
    public static string Slugify(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;
            
        // Convert to lowercase and replace invalid characters
        var slug = input.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("_", "-");
            
        // Remove invalid characters
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        
        // Remove duplicate hyphens
        slug = Regex.Replace(slug, @"-+", "-");
        
        // Trim hyphens from start and end
        slug = slug.Trim('-');
        
        return slug;
    }
    
    public static string Truncate(string input, int length)
    {
        if (string.IsNullOrEmpty(input) || input.Length <= length)
            return input;
            
        return input.Substring(0, length - 3) + "...";
    }
    
    public static string CapitalizeEach(string input)
    {
        if (string.IsNullOrEmpty(input))
            return input;
            
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower());
    }
}