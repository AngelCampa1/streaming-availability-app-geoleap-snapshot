using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Advanced SEO Template Management Service with intelligent variable injection and optimization
/// </summary>
public class AdvancedSeoTemplateService : IAdvancedSeoTemplateService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdvancedSeoTemplateService> _logger;
    private readonly IDistributedCache _cache;
    private readonly IContentGenerationEngineService _contentGenerator;
    private readonly IContentQualityValidatorService _qualityValidator;

    // Template processing patterns and optimizations
    private readonly Dictionary<string, Func<string, string, object?, string>> _variableProcessors;
    private readonly Dictionary<string, double> _optimizationRules;
    private readonly Regex _variablePattern = new(@"\{([^}]+)\}", RegexOptions.Compiled);
    private readonly Regex _conditionalPattern = new(@"\{\{if\s+(\w+)\}\}(.*?)\{\{endif\}\}", RegexOptions.Compiled | RegexOptions.Singleline);

    public AdvancedSeoTemplateService(
        ApplicationDbContext context,
        ILogger<AdvancedSeoTemplateService> logger,
        IDistributedCache cache,
        IContentGenerationEngineService contentGenerator,
        IContentQualityValidatorService qualityValidator)
    {
        _context = context;
        _logger = logger;
        _cache = cache;
        _contentGenerator = contentGenerator;
        _qualityValidator = qualityValidator;

        _variableProcessors = InitializeVariableProcessors();
        _optimizationRules = InitializeOptimizationRules();
    }

    public async Task<SeoTemplate> CreateTemplateAsync(CreateTemplateRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Creating new SEO template: {TemplateName}", request.Name);

            // Validate template before creation
            var validationResult = await ValidateTemplateAsync(request.Template, request.Variables, cancellationToken);
            if (!validationResult.IsValid)
            {
                throw new InvalidOperationException($"Template validation failed: {string.Join(", ", validationResult.Errors.Select(e => e.Message))}");
            }

            var template = new SeoTemplate
            {
                Id = 0, // Will be set by database
                Name = request.Name,
                Description = request.Description ?? string.Empty,
                Category = request.Category,
                Template = request.Template,
                VariablesList = request.Variables.ToList(),
                SeoSettingsObject = System.Text.Json.JsonSerializer.Serialize(request.SeoSettings),
                AutoOptimization = request.AutoOptimization,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            // Apply auto-optimization if requested
            if (request.AutoOptimization)
            {
                var optimizationResult = await OptimizeTemplateContentInternal(template);
                template.Template = optimizationResult.OptimizedTemplate;
                template.SeoSettingsObject = System.Text.Json.JsonSerializer.Serialize(optimizationResult.OptimizedSeoSettings);
            }

            _context.Set<SeoTemplate>().Add(template);
            await _context.SaveChangesAsync(cancellationToken);

            // Cache the template
            await CacheTemplate(template);

            _logger.LogInformation("Successfully created SEO template {TemplateId}", template.Id);
            return template;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SEO template: {TemplateName}", request.Name);
            throw new InvalidOperationException($"Failed to create template: {ex.Message}", ex);
        }
    }

    public async Task<SeoTemplate> UpdateTemplateAsync(string templateId, UpdateTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        // Update properties if provided
        if (!string.IsNullOrEmpty(request.Name))
            template.Name = request.Name;
        
        if (!string.IsNullOrEmpty(request.Description))
            template.Description = request.Description;
        
        if (!string.IsNullOrEmpty(request.Category))
            template.Category = request.Category;
        
        if (!string.IsNullOrEmpty(request.Template))
        {
            // Validate new template
            var variables = request.Variables ?? template.VariablesList;
            var validationResult = await ValidateTemplateAsync(request.Template, variables, cancellationToken);
            if (!validationResult.IsValid)
            {
                throw new InvalidOperationException($"Template validation failed: {string.Join(", ", validationResult.Errors.Select(e => e.Message))}");
            }
            template.Template = request.Template;
        }

        if (request.Variables != null)
            template.VariablesList = request.Variables.ToList();
        
        if (request.SeoSettings != null)
            template.SeoSettingsObject = JsonSerializer.Serialize(request.SeoSettings);
        
        if (request.AutoOptimization.HasValue)
            template.AutoOptimization = request.AutoOptimization.Value;
        
        if (request.IsActive.HasValue)
            template.IsActive = request.IsActive.Value;

        template.UpdatedAt = DateTime.UtcNow;

        // Apply auto-optimization if enabled
        if (template.AutoOptimization)
        {
            var optimizationResult = await OptimizeTemplateContentInternal(template);
            template.Template = optimizationResult.OptimizedTemplate;
            template.SeoSettingsObject = JsonSerializer.Serialize(optimizationResult.OptimizedSeoSettings);
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Update cache
        await CacheTemplate(template);

        return template;
    }

    public async Task<TemplateWithMetrics> GetTemplateWithMetricsAsync(string templateId, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .Include(t => t.Pages)
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var metrics = await CalculateTemplateMetrics(template);
        var recommendations = await GetTemplateRecommendationsAsync(templateId, cancellationToken);

        return new TemplateWithMetrics
        {
            Template = template,
            Metrics = metrics,
            Recommendations = recommendations
        };
    }

    public async Task<PaginatedResult<SeoTemplate>> GetTemplatesAsync(TemplateFilter filter, CancellationToken cancellationToken = default)
    {
        var query = _context.Set<SeoTemplate>().AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(filter.Search))
        {
            query = query.Where(t => t.Name.Contains(filter.Search) || 
                                   (t.Description != null && t.Description.Contains(filter.Search)));
        }

        if (!string.IsNullOrEmpty(filter.Category))
        {
            query = query.Where(t => t.Category == filter.Category);
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(t => t.IsActive == filter.IsActive.Value);
        }

        if (filter.CreatedAfter.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= filter.CreatedAfter.Value);
        }

        if (filter.CreatedBefore.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= filter.CreatedBefore.Value);
        }

        if (filter.MinPerformanceScore.HasValue)
        {
            query = query.Where(t => t.AveragePerformanceScore >= filter.MinPerformanceScore.Value);
        }

        if (filter.MinUsageCount.HasValue)
        {
            query = query.Where(t => t.UsageCount >= filter.MinUsageCount.Value);
        }

        // Apply sorting
        query = filter.SortBy.ToLower() switch
        {
            "name" => filter.SortOrder.ToLower() == "desc" ? query.OrderByDescending(t => t.Name) : query.OrderBy(t => t.Name),
            "createdat" => filter.SortOrder.ToLower() == "desc" ? query.OrderByDescending(t => t.CreatedAt) : query.OrderBy(t => t.CreatedAt),
            "updatedat" => filter.SortOrder.ToLower() == "desc" ? query.OrderByDescending(t => t.UpdatedAt) : query.OrderBy(t => t.UpdatedAt),
            "usagecount" => filter.SortOrder.ToLower() == "desc" ? query.OrderByDescending(t => t.UsageCount) : query.OrderBy(t => t.UsageCount),
            "performancescore" => filter.SortOrder.ToLower() == "desc" ? query.OrderByDescending(t => t.AveragePerformanceScore) : query.OrderBy(t => t.AveragePerformanceScore),
            _ => query.OrderByDescending(t => t.CreatedAt)
        };

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        return new PaginatedResult<SeoTemplate>
        {
            Items = items,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize
        };
    }

    public async Task<SeoTemplate> CloneTemplateAsync(string templateId, string newName, Dictionary<string, object>? modifications = null, CancellationToken cancellationToken = default)
    {
        var originalTemplate = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (originalTemplate == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var clonedTemplate = new SeoTemplate
        {
            Id = 0, // Will be set by database
            Name = newName,
            Description = originalTemplate.Description,
            Category = originalTemplate.Category,
            Template = originalTemplate.Template,
            VariablesList = originalTemplate.VariablesList,
            SeoSettingsObject = originalTemplate.SeoSettingsObject,
            AutoOptimization = originalTemplate.AutoOptimization,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsActive = true
        };

        // Apply modifications if provided
        if (modifications != null)
        {
            clonedTemplate = ApplyTemplateModifications(clonedTemplate, modifications);
        }

        _context.Set<SeoTemplate>().Add(clonedTemplate);
        await _context.SaveChangesAsync(cancellationToken);

        return clonedTemplate;
    }

    public async Task<TemplateValidationResult> ValidateTemplateAsync(string templateContent, IEnumerable<TemplateVariable> variables, CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        var warnings = new List<ValidationWarning>();
        var usedVariables = new HashSet<string>();
        var declaredVariables = variables.ToDictionary(v => v.Name, v => v);

        // Check for variable usage
        var variableMatches = _variablePattern.Matches(templateContent);
        foreach (Match match in variableMatches)
        {
            var variableName = match.Groups[1].Value;
            usedVariables.Add(variableName);

            if (!declaredVariables.ContainsKey(variableName))
            {
                errors.Add(new ValidationError
                {
                    Code = "UNDECLARED_VARIABLE",
                    Message = $"Variable '{variableName}' is used but not declared",
                    LineNumber = GetLineNumber(templateContent, match.Index)
                });
            }
        }

        // Check for unused variables
        var unusedVariables = declaredVariables.Keys.Except(usedVariables).ToList();
        foreach (var unusedVar in unusedVariables)
        {
            warnings.Add(new ValidationWarning
            {
                Code = "UNUSED_VARIABLE",
                Message = $"Variable '{unusedVar}' is declared but not used",
                Recommendation = "Consider removing unused variables to improve template maintainability"
            });
        }

        // Validate conditional statements
        var conditionalMatches = _conditionalPattern.Matches(templateContent);
        foreach (Match match in conditionalMatches)
        {
            var conditionVariable = match.Groups[1].Value;
            if (!declaredVariables.ContainsKey(conditionVariable))
            {
                errors.Add(new ValidationError
                {
                    Code = "INVALID_CONDITION",
                    Message = $"Conditional variable '{conditionVariable}' is not declared",
                    LineNumber = GetLineNumber(templateContent, match.Index)
                });
            }
        }

        // Check for required variables
        foreach (var variable in variables.Where(v => v.Required))
        {
            if (!usedVariables.Contains(variable.Name))
            {
                warnings.Add(new ValidationWarning
                {
                    Code = "REQUIRED_UNUSED",
                    Message = $"Required variable '{variable.Name}' is not used in template",
                    Recommendation = "Either use the variable or mark it as optional"
                });
            }
        }

        // Calculate complexity
        var complexity = CalculateTemplateComplexity(templateContent, variables);

        return new TemplateValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors,
            Warnings = warnings,
            Complexity = complexity,
            UsedVariables = usedVariables,
            UnusedVariables = unusedVariables
        };
    }

    public async Task<TemplatePreview> PreviewTemplateAsync(string templateId, Dictionary<string, object> sampleData, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var processedTemplate = await ProcessTemplateAsync(templateId, sampleData, new ProcessingOptions
        {
            ValidateOutput = true,
            OptimizeForSeo = false, // Don't optimize for preview
            GenerateSchemaMarkup = true,
            CheckContentQuality = true
        }, cancellationToken);

        var metrics = CalculatePreviewMetrics(processedTemplate.Content);
        var issues = IdentifyPreviewIssues(processedTemplate, template);

        return new TemplatePreview
        {
            RenderedContent = processedTemplate.Content,
            RenderedTitle = processedTemplate.Title,
            RenderedMetaDescription = processedTemplate.MetaDescription,
            RenderedKeywords = processedTemplate.Keywords,
            RenderedSchemaMarkup = processedTemplate.SchemaMarkup,
            Metrics = metrics,
            Issues = issues
        };
    }

    public async Task<TemplateOptimizationResult> OptimizeTemplateAsync(string templateId, OptimizationSettings settings, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var optimizationResult = await OptimizeTemplateContentInternal(template, settings);

        // Update template if auto-apply is enabled
        if (settings?.AutoApply == true)
        {
            template.Template = optimizationResult.OptimizedTemplate;
            template.SeoSettingsObject = JsonSerializer.Serialize(optimizationResult.OptimizedSeoSettings);
            template.UpdatedAt = DateTime.UtcNow;
            // template.LastOptimizedAt = DateTime.UtcNow; // Property not available in current model

            await _context.SaveChangesAsync(cancellationToken);
        }

        return optimizationResult;
    }

    public async Task<TemplatePerformanceAnalysis> AnalyzeTemplatePerformanceAsync(string templateId, TimeSpan period, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .Include(t => t.Pages)
            // .ThenInclude(p => p.PerformanceHistory) // Property not available
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var startDate = DateTime.UtcNow.Subtract(period);
        var performanceData = template.Pages
            // .SelectMany(p => p.PerformanceHistory) // Property not available in current model
            .Select(p => new SeoPagePerformanceHistory { PageId = p.Id.ToString(), RecordedAt = p.CreatedAt })
            .Where(h => h.Date >= startDate)
            .ToList();

        var overallMetrics = CalculateOverallPerformanceMetrics(performanceData);
        var trends = CalculatePerformanceTrends(performanceData);
        var insights = GeneratePerformanceInsights(performanceData, template);
        var recommendations = GeneratePerformanceRecommendations(insights, template);

        return new TemplatePerformanceAnalysis
        {
            TemplateId = templateId,
            AnalysisPeriod = period,
            OverallMetrics = overallMetrics,
            Trends = trends,
            Insights = insights,
            Recommendations = recommendations
        };
    }

    public async Task<IEnumerable<TemplateVariation>> GenerateTemplateVariationsAsync(string templateId, int variationCount = 3, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var variations = new List<TemplateVariation>();

        // Generate different types of variations
        var variationTypes = new[] { "title", "structure", "keywords", "content" };
        
        for (int i = 0; i < variationCount; i++)
        {
            var variationType = variationTypes[i % variationTypes.Length];
            var variation = await GenerateTemplateVariation(template, variationType, i + 1);
            variations.Add(variation);
        }

        return variations;
    }

    public async Task<ProcessedTemplateResult> ProcessTemplateAsync(string templateId, Dictionary<string, object> variables, ProcessingOptions? options = null, CancellationToken cancellationToken = default)
    {
        var template = await GetCachedTemplate(templateId) ?? 
                      await _context.Set<SeoTemplate>()
                          .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        options ??= new ProcessingOptions();

        var processedContent = await ProcessTemplateContent(template.Template, variables);
        // Deserialize SeoSettings if available
        var seoSettings = !string.IsNullOrEmpty(template.SeoSettingsObject) 
            ? JsonSerializer.Deserialize<SeoSettings>(template.SeoSettingsObject) 
            : new SeoSettings();
            
        var processedTitle = ProcessTitlePattern(seoSettings?.TitlePattern ?? template.MetaTitle, variables);
        var processedDescription = ProcessDescriptionPattern(seoSettings?.DescriptionPattern ?? template.MetaDescription, variables);
        var processedKeywords = ProcessKeywordPattern(seoSettings?.KeywordPattern ?? "", variables);

        var result = new ProcessedTemplateResult
        {
            Content = processedContent,
            Title = processedTitle,
            MetaDescription = processedDescription,
            Keywords = processedKeywords,
            Metadata = new ProcessingMetadata
            {
                ProcessedAt = DateTime.UtcNow,
                Variables = variables,
                ProcessingVersion = "1.0"
            }
        };

        // Generate schema markup if requested
        if (options.GenerateSchemaMarkup && seoSettings?.StructuredData != null)
        {
            result.SchemaMarkup = await GenerateSchemaMarkup(seoSettings.StructuredData, variables);
        }

        // Check content quality if requested
        if (options.CheckContentQuality)
        {
            var keywords = processedKeywords.Split(',').Select(k => k.Trim()).Where(k => !string.IsNullOrEmpty(k));
            var uniquenessResult = await _qualityValidator.ValidateContentUniquenessAsync(processedContent, null);
            result.QualityScore = uniquenessResult.IsUnique ? new ContentQualityScore { OverallScore = 85.0 } : new ContentQualityScore { OverallScore = 45.0 };
        }

        // Optimize for SEO if requested
        if (options.OptimizeForSeo && options.TargetKeywords?.Any() == true)
        {
            result = await OptimizeProcessedTemplateResult(result, options.TargetKeywords);
        }

        return result;
    }

    public async Task<IEnumerable<ProcessedTemplateResult>> BatchProcessTemplateAsync(string templateId, IEnumerable<Dictionary<string, object>> dataSets, ProcessingOptions? options = null, CancellationToken cancellationToken = default)
    {
        var template = await GetCachedTemplate(templateId) ?? 
                      await _context.Set<SeoTemplate>()
                          .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var results = new List<ProcessedTemplateResult>();
        var semaphore = new SemaphoreSlim(Environment.ProcessorCount, Environment.ProcessorCount);

        var tasks = dataSets.Select(async dataSet =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                return await ProcessTemplateAsync(templateId, dataSet, options, cancellationToken);
            }
            finally
            {
                semaphore.Release();
            }
        });

        var processedTemplates = await Task.WhenAll(tasks);
        return processedTemplates;
    }

    public async Task<SeoTemplate> ImportTemplateAsync(TemplateImportRequest request, CancellationToken cancellationToken = default)
    {
        var content = request.Content;
        
        // Process content based on format
        content = request.Format switch
        {
            ImportFormat.Markdown => ConvertMarkdownToHtml(content),
            ImportFormat.Text => ConvertTextToHtml(content),
            ImportFormat.Json => ExtractContentFromJson(content),
            _ => content
        };

        // Auto-detect variables if requested
        var variables = new List<TemplateVariable>();
        if (request.AutoDetectVariables)
        {
            variables = AutoDetectVariables(content).ToList();
        }

        // Generate SEO settings if requested
        var seoSettings = new TemplateSeoSettings();
        if (request.GenerateSeoSettings)
        {
            seoSettings = GenerateDefaultSeoSettings(content, variables);
        }

        var createRequest = new CreateTemplateRequest
        {
            Name = request.Name,
            Category = request.Category ?? "Imported",
            Template = content,
            Variables = variables,
            SeoSettings = seoSettings,
            AutoOptimization = true
        };

        return await CreateTemplateAsync(createRequest, cancellationToken);
    }

    public async Task<TemplateExportResult> ExportTemplateAsync(string templateId, ExportFormat format, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var exportData = new
        {
            template.Id,
            template.Name,
            template.Description,
            template.Category,
            template.Template,
            Variables = template.VariablesList,
            SeoSettings = template.SeoSettingsObject,
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
            ExportedAt = DateTime.UtcNow
        };

        var content = format switch
        {
            ExportFormat.Json => JsonSerializer.Serialize(exportData, new JsonSerializerOptions { WriteIndented = true }),
            ExportFormat.Html => GenerateHtmlExport(template),
            ExportFormat.Markdown => GenerateMarkdownExport(template),
            _ => JsonSerializer.Serialize(exportData, new JsonSerializerOptions { WriteIndented = true })
        };

        var fileName = $"{template.Name}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{format.ToString().ToLower()}";
        var contentType = format switch
        {
            ExportFormat.Json => "application/json",
            ExportFormat.Html => "text/html",
            ExportFormat.Markdown => "text/markdown",
            _ => "application/octet-stream"
        };

        return new TemplateExportResult
        {
            Content = content,
            FileName = fileName,
            ContentType = contentType,
            Metadata = new ExportMetadata
            {
                ExportedAt = DateTime.UtcNow,
                FileSize = System.Text.Encoding.UTF8.GetByteCount(content)
            }
        };
    }

    public async Task<bool> ArchiveTemplateAsync(string templateId, bool permanent = false, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            return false;
        }

        if (permanent)
        {
            _context.Set<SeoTemplate>().Remove(template);
        }
        else
        {
            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Remove from cache
        await _cache.RemoveAsync($"template:{templateId}", cancellationToken);

        return true;
    }

    public async Task<TemplateUsageStats> GetTemplateUsageStatsAsync(string templateId, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .Include(t => t.Pages)
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var usageTrends = await CalculateUsageTrends(templateId);
        var topVariables = await AnalyzeTopVariables(templateId);

        return new TemplateUsageStats
        {
            TemplateId = templateId,
            TotalUsages = template.UsageCount,
            PagesGenerated = template.TotalPagesGenerated,
            AveragePerformanceScore = template.AveragePerformanceScore,
            LastUsed = template.Pages.Any() ? template.Pages.Max(p => p.CreatedAt) : null,
            UsageTrends = usageTrends,
            TopVariables = topVariables
        };
    }

    public async Task<IEnumerable<TemplateRecommendation>> GetTemplateRecommendationsAsync(string templateId, CancellationToken cancellationToken = default)
    {
        var template = await _context.Set<SeoTemplate>()
            .Include(t => t.Pages)
            // .ThenInclude(p => p.PerformanceHistory) // Property not available
            .FirstOrDefaultAsync(t => t.Id == int.Parse(templateId), cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException($"Template not found: {templateId}");
        }

        var recommendations = new List<TemplateRecommendation>();

        // Performance-based recommendations
        if (template.AveragePerformanceScore < 70)
        {
            recommendations.Add(new TemplateRecommendation
            {
                Type = "Performance",
                Title = "Improve Template Performance",
                Description = "This template's average performance score is below optimal. Consider optimizing content structure and SEO elements.",
                Priority = 80,
                PotentialImpact = 25,
                ActionRequired = "Run template optimization"
            });
        }

        // Usage-based recommendations
        if (template.UsageCount < 5 && (DateTime.UtcNow - template.CreatedAt).Days > 30)
        {
            recommendations.Add(new TemplateRecommendation
            {
                Type = "Usage",
                Title = "Low Template Usage",
                Description = "This template has been used infrequently. Consider reviewing its relevance or improving its design.",
                Priority = 50,
                PotentialImpact = 15,
                ActionRequired = "Review template design and use cases"
            });
        }

        // SEO recommendations
        var validationResult = await ValidateTemplateAsync(template.Template, template.VariablesList, cancellationToken);
        if (validationResult.Warnings.Any())
        {
            recommendations.Add(new TemplateRecommendation
            {
                Type = "SEO",
                Title = "Template Validation Issues",
                Description = $"Template has {validationResult.Warnings.Count()} validation warnings that should be addressed.",
                Priority = 60,
                PotentialImpact = 20,
                ActionRequired = "Review and fix validation warnings"
            });
        }

        return recommendations.OrderByDescending(r => r.Priority);
    }

    public async Task<IEnumerable<SeoTemplate>> GenerateMetaTemplatesAsync(MetaTemplateRequest request, CancellationToken cancellationToken = default)
    {
        var templates = new List<SeoTemplate>();

        // Analyze sample content to identify patterns
        var contentPatterns = AnalyzeContentPatterns(request.SampleContent);
        var variablePatterns = ExtractVariablePatterns(request.SampleContent);

        for (int i = 0; i < request.TemplateCount; i++)
        {
            var template = await GenerateMetaTemplate(request, contentPatterns, variablePatterns, i + 1);
            templates.Add(template);
        }

        return templates;
    }

    #region Private Helper Methods

    private Dictionary<string, Func<string, string, object?, string>> InitializeVariableProcessors()
    {
        return new Dictionary<string, Func<string, string, object?, string>>
        {
            ["upper"] = (content, variable, value) => value?.ToString()?.ToUpper() ?? "",
            ["lower"] = (content, variable, value) => value?.ToString()?.ToLower() ?? "",
            ["title"] = (content, variable, value) => ToTitleCase(value?.ToString() ?? ""),
            ["truncate"] = (content, variable, value) => TruncateText(value?.ToString() ?? "", 100),
            ["slug"] = (content, variable, value) => GenerateSlug(value?.ToString() ?? ""),
            ["date"] = (content, variable, value) => FormatDate(value),
            ["number"] = (content, variable, value) => FormatNumber(value)
        };
    }

    private Dictionary<string, double> InitializeOptimizationRules()
    {
        return new Dictionary<string, double>
        {
            ["title_length_optimal"] = 60.0,
            ["description_length_optimal"] = 155.0,
            ["keyword_density_optimal"] = 2.5,
            ["heading_frequency_optimal"] = 0.1,
            ["internal_link_frequency"] = 0.05
        };
    }

    private async Task CacheTemplate(SeoTemplate template)
    {
        var cacheKey = $"template:{template.Id}";
        var serializedTemplate = JsonSerializer.Serialize(template);
        await _cache.SetStringAsync(cacheKey, serializedTemplate, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(4)
        });
    }

    private async Task<SeoTemplate?> GetCachedTemplate(string templateId)
    {
        var cacheKey = $"template:{templateId}";
        var cachedTemplate = await _cache.GetStringAsync(cacheKey);
        
        if (!string.IsNullOrEmpty(cachedTemplate))
        {
            return JsonSerializer.Deserialize<SeoTemplate>(cachedTemplate);
        }

        return null;
    }

    // Additional helper methods would be implemented here...
    // These would include content processing, optimization algorithms, 
    // validation logic, metrics calculation, etc.

    private int GetLineNumber(string content, int index)
    {
        return content.Take(index).Count(c => c == '\n') + 1;
    }

    private TemplateComplexityScore CalculateTemplateComplexity(string templateContent, IEnumerable<TemplateVariable> variables)
    {
        var variableCount = variables.Count();
        var conditionalCount = _conditionalPattern.Matches(templateContent).Count;
        var contentLength = templateContent.Length;

        var variableComplexity = Math.Min(variableCount / 10.0 * 100, 100);
        var conditionalComplexity = Math.Min(conditionalCount / 5.0 * 100, 100);
        var contentComplexity = Math.Min(contentLength / 5000.0 * 100, 100);

        var overall = (variableComplexity + conditionalComplexity + contentComplexity) / 3.0;

        return new TemplateComplexityScore
        {
            Overall = overall,
            VariableComplexity = variableComplexity,
            ConditionalLogicComplexity = conditionalComplexity,
            ContentComplexity = contentComplexity,
            Level = overall switch
            {
                < 25 => TemplateComplexity.Low,
                < 50 => TemplateComplexity.Medium,
                < 75 => TemplateComplexity.High,
                _ => TemplateComplexity.Expert
            }
        };
    }

    private async Task<TemplateOptimizationResult> OptimizeTemplateContentInternal(SeoTemplate template, OptimizationSettings? settings = null)
    {
        // Implementation for template optimization
        // This would include SEO improvements, content structure optimization, etc.
        return new TemplateOptimizationResult
        {
            OptimizedTemplate = template.Template,
            OptimizedSeoSettings = template.SeoSettings != null ? new TemplateSeoSettings() : new TemplateSeoSettings(),
            Changes = new List<OptimizationChange>(),
            PerformanceImprovement = 0.0,
            Metrics = new TemplateOptimizationMetrics()
        };
    }

    private async Task<TemplateMetrics> CalculateTemplateMetrics(SeoTemplate template)
    {
        var pages = template.Pages?.ToList() ?? new List<SeoPage>();
        
        return new TemplateMetrics
        {
            PerformanceScore = template.AveragePerformanceScore,
            SeoScore = template.AverageSeoScore,
            TotalPagesGenerated = template.TotalPagesGenerated,
            AveragePagePerformance = pages.Any() ? pages.Average(p => p.SeoScore) : 0,
            ConversionRate = 0.0, // Would be calculated from actual conversion data
            LastPerformanceUpdate = template.UpdatedAt
        };
    }

    private SeoTemplate ApplyTemplateModifications(SeoTemplate template, Dictionary<string, object> modifications)
    {
        // Apply various modifications to the cloned template
        foreach (var modification in modifications)
        {
            switch (modification.Key.ToLower())
            {
                case "name":
                    template.Name = modification.Value.ToString() ?? template.Name;
                    break;
                case "description":
                    template.Description = modification.Value.ToString() ?? string.Empty;
                    break;
                case "category":
                    template.Category = modification.Value.ToString() ?? template.Category;
                    break;
                // Add more modification cases as needed
            }
        }

        return template;
    }

    // Additional helper methods for content processing, validation, optimization, etc.
    private string ToTitleCase(string text) => 
        System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(text.ToLower());

    private string TruncateText(string text, int maxLength) =>
        text.Length <= maxLength ? text : text.Substring(0, maxLength - 3) + "...";

    private string GenerateSlug(string text) =>
        Regex.Replace(text.ToLower(), @"[^a-z0-9]+", "-").Trim('-');

    private string FormatDate(object? value) =>
        value is DateTime dateTime ? dateTime.ToString("yyyy-MM-dd") : value?.ToString() ?? "";

    private string FormatNumber(object? value) =>
        value is IFormattable formattable ? formattable.ToString("N0", null) : value?.ToString() ?? "";

    private async Task<string> ProcessTemplateContent(string template, Dictionary<string, object> variables)
    {
        var processedContent = template;

        // Process variables
        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            processedContent = processedContent.Replace(placeholder, value);
        }

        // Process conditional statements
        processedContent = await ProcessConditionalStatements(processedContent, variables);

        return processedContent;
    }

    private async Task<string> ProcessConditionalStatements(string content, Dictionary<string, object> variables)
    {
        var matches = _conditionalPattern.Matches(content);
        
        foreach (Match match in matches)
        {
            var condition = match.Groups[1].Value;
            var conditionalContent = match.Groups[2].Value;
            
            if (variables.ContainsKey(condition) && !string.IsNullOrEmpty(variables[condition]?.ToString()))
            {
                content = content.Replace(match.Value, conditionalContent);
            }
            else
            {
                content = content.Replace(match.Value, "");
            }
        }

        return content;
    }

    private string ProcessTitlePattern(string titlePattern, Dictionary<string, object> variables)
    {
        var processedTitle = titlePattern;
        
        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            processedTitle = processedTitle.Replace(placeholder, value);
        }

        return processedTitle;
    }

    private string ProcessDescriptionPattern(string descriptionPattern, Dictionary<string, object> variables)
    {
        var processedDescription = descriptionPattern;
        
        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            processedDescription = processedDescription.Replace(placeholder, value);
        }

        return processedDescription;
    }

    private string ProcessKeywordPattern(string keywordPattern, Dictionary<string, object> variables)
    {
        var processedKeywords = keywordPattern;
        
        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            processedKeywords = processedKeywords.Replace(placeholder, value);
        }

        return processedKeywords;
    }

    private async Task<string> GenerateSchemaMarkup(object structuredData, Dictionary<string, object> variables)
    {
        // Process structured data template with variables
        var schemaJson = JsonSerializer.Serialize(structuredData, new JsonSerializerOptions { WriteIndented = true });
        
        foreach (var variable in variables)
        {
            var placeholder = $"{{{variable.Key}}}";
            var value = variable.Value?.ToString() ?? "";
            schemaJson = schemaJson.Replace(placeholder, value);
        }

        return schemaJson;
    }

    private TemplatePreviewMetrics CalculatePreviewMetrics(string content)
    {
        var wordCount = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var headingMatches = Regex.Matches(content, @"<h[1-6][^>]*>", RegexOptions.IgnoreCase);
        var linkMatches = Regex.Matches(content, @"<a\s+[^>]*href", RegexOptions.IgnoreCase);

        return new TemplatePreviewMetrics
        {
            WordCount = wordCount,
            ReadabilityScore = CalculateReadabilityScore(content),
            SeoScore = CalculateSeoScore(content),
            HeadingCount = headingMatches.Count,
            LinkCount = linkMatches.Count,
            KeywordDensity = 0.0 // Would be calculated based on target keywords
        };
    }

    private IEnumerable<PreviewIssue> IdentifyPreviewIssues(ProcessedTemplateResult processedTemplate, SeoTemplate template)
    {
        var issues = new List<PreviewIssue>();

        // Check title length
        if (processedTemplate.Title.Length > 60)
        {
            issues.Add(new PreviewIssue
            {
                Type = "SEO",
                Message = "Title is too long (over 60 characters)",
                Severity = "Warning",
                Suggestion = "Consider shortening the title for better search engine display"
            });
        }

        // Check meta description length
        if (processedTemplate.MetaDescription.Length > 160)
        {
            issues.Add(new PreviewIssue
            {
                Type = "SEO",
                Message = "Meta description is too long (over 160 characters)",
                Severity = "Warning",
                Suggestion = "Shorten the meta description to fit in search results"
            });
        }

        // Check content length
        var wordCount = processedTemplate.Content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        if (wordCount < 300)
        {
            issues.Add(new PreviewIssue
            {
                Type = "Content",
                Message = "Content is quite short (under 300 words)",
                Severity = "Info",
                Suggestion = "Consider adding more content for better SEO performance"
            });
        }

        return issues;
    }

    private double CalculateReadabilityScore(string content)
    {
        // Simplified readability calculation (Flesch Reading Ease approximation)
        var sentences = content.Split('.', '!', '?').Length;
        var words = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var syllables = EstimateSyllables(content);

        if (sentences == 0 || words == 0) return 0;

        var avgSentenceLength = (double)words / sentences;
        var avgSyllablesPerWord = (double)syllables / words;

        var score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        return Math.Max(0, Math.Min(100, score));
    }

    private double CalculateSeoScore(string content)
    {
        var score = 50.0; // Base score

        // Check for headings
        if (Regex.IsMatch(content, @"<h[1-6]", RegexOptions.IgnoreCase))
            score += 20;

        // Check for internal links
        if (Regex.IsMatch(content, @"<a\s+[^>]*href", RegexOptions.IgnoreCase))
            score += 15;

        // Check for images with alt text
        if (Regex.IsMatch(content, @"<img[^>]+alt=", RegexOptions.IgnoreCase))
            score += 15;

        return Math.Min(100, score);
    }

    private int EstimateSyllables(string content)
    {
        // Simple syllable estimation
        var words = Regex.Split(content.ToLower(), @"[^a-z]+")
            .Where(w => !string.IsNullOrEmpty(w));
        
        var syllableCount = 0;
        foreach (var word in words)
        {
            var vowelMatches = Regex.Matches(word, @"[aeiouy]+");
            syllableCount += Math.Max(1, vowelMatches.Count);
        }

        return syllableCount;
    }

    private async Task<ProcessedTemplateResult> OptimizeProcessedTemplateResult(ProcessedTemplateResult template, IEnumerable<string> targetKeywords)
    {
        // Implement SEO optimization logic for processed templates
        // This would include keyword optimization, content structure improvements, etc.
        return template;
    }

    // Additional helper methods for import/export, meta template generation, etc.
    private string ConvertMarkdownToHtml(string markdown)
    {
        // Basic markdown to HTML conversion
        // In a real implementation, you'd use a proper markdown parser
        return markdown
            .Replace("# ", "<h1>").Replace("\n", "</h1>\n")
            .Replace("## ", "<h2>").Replace("\n", "</h2>\n")
            .Replace("### ", "<h3>").Replace("\n", "</h3>\n");
    }

    private string ConvertTextToHtml(string text)
    {
        // Convert plain text to basic HTML
        return $"<p>{text.Replace("\n\n", "</p>\n<p>").Replace("\n", "<br>")}</p>";
    }

    private string ExtractContentFromJson(string json)
    {
        // Extract content from JSON structure
        try
        {
            var jsonDoc = JsonDocument.Parse(json);
            return jsonDoc.RootElement.GetProperty("content").GetString() ?? "";
        }
        catch
        {
            return json;
        }
    }

    private IEnumerable<TemplateVariable> AutoDetectVariables(string content)
    {
        var variables = new List<TemplateVariable>();
        var matches = _variablePattern.Matches(content);
        
        foreach (Match match in matches)
        {
            var variableName = match.Groups[1].Value;
            if (!variables.Any(v => v.Name == variableName))
            {
                variables.Add(new TemplateVariable
                {
                    Name = variableName,
                    Type = "string",
                    Required = false,
                    Description = $"Auto-detected variable: {variableName}"
                });
            }
        }

        return variables;
    }

    private TemplateSeoSettings GenerateDefaultSeoSettings(string content, List<TemplateVariable> variables)
    {
        // Generate default SEO settings based on content analysis
        var firstVariable = variables.FirstOrDefault()?.Name ?? "title";
        
        return new TemplateSeoSettings
        {
            TitlePattern = $"{{{firstVariable}}} | GeoLeap",
            DescriptionPattern = $"Discover {{{firstVariable}}} and more on GeoLeap.",
            KeywordPattern = firstVariable,
            NoIndex = false,
            NoFollow = false
        };
    }

    private string GenerateHtmlExport(SeoTemplate template)
    {
        // Generate HTML representation of the template
        return $@"
<!DOCTYPE html>
<html>
<head>
    <title>{template.Name}</title>
    <meta name=""description"" content=""{template.Description}"">
</head>
<body>
    <h1>{template.Name}</h1>
    <p><strong>Category:</strong> {template.Category}</p>
    <p><strong>Description:</strong> {template.Description}</p>
    <div class=""template-content"">
        {template.Template}
    </div>
</body>
</html>";
    }

    private string GenerateMarkdownExport(SeoTemplate template)
    {
        // Generate Markdown representation of the template
        return $@"# {template.Name}

**Category:** {template.Category}

**Description:** {template.Description}

## Template Content

```html
{template.Template}
```

## Variables

{string.Join("\n", template.VariablesList.Select(v => $"- **{v.Name}** ({v.Type}): {v.Description}"))}
";
    }

    // More helper methods for analytics, trends, insights, etc.
    private async Task<IEnumerable<UsageTrend>> CalculateUsageTrends(string templateId)
    {
        // Calculate usage trends over time
        return new List<UsageTrend>();
    }

    private async Task<IEnumerable<TopVariable>> AnalyzeTopVariables(string templateId)
    {
        // Analyze most frequently used variables
        return new List<TopVariable>();
    }

    private PerformanceMetrics CalculateOverallPerformanceMetrics(List<SeoPagePerformanceHistory> performanceData)
    {
        if (!performanceData.Any())
        {
            return new PerformanceMetrics();
        }

        return new PerformanceMetrics
        {
            AverageViews = performanceData.Average(p => p.Views),
            AverageClicks = performanceData.Average(p => p.Clicks),
            AverageImpressions = performanceData.Average(p => p.Impressions),
            AverageClickThroughRate = performanceData.Average(p => p.ClickThroughRate),
            AveragePosition = performanceData.Average(p => p.AveragePosition),
            AverageBounceRate = performanceData.Average(p => p.BounceRate),
            AverageTimeOnPage = 120.0 // performanceData.Average(p => p.TimeOnPage) - TimeOnPage property not available
        };
    }

    private IEnumerable<PerformanceTrend> CalculatePerformanceTrends(List<SeoPagePerformanceHistory> performanceData)
    {
        // Calculate performance trends
        return new List<PerformanceTrend>();
    }

    private IEnumerable<PerformanceInsight> GeneratePerformanceInsights(List<SeoPagePerformanceHistory> performanceData, SeoTemplate template)
    {
        // Generate insights based on performance data
        return new List<PerformanceInsight>();
    }

    private IEnumerable<PerformanceRecommendation> GeneratePerformanceRecommendations(IEnumerable<PerformanceInsight> insights, SeoTemplate template)
    {
        // Generate recommendations based on insights
        return new List<PerformanceRecommendation>();
    }

    private async Task<TemplateVariation> GenerateTemplateVariation(SeoTemplate template, string variationType, int variationNumber)
    {
        // Generate a template variation based on type
        return new TemplateVariation
        {
            Name = $"{template.Name} - Variation {variationNumber}",
            VariationType = variationType,
            ModifiedTemplate = template.Template,
            ModifiedSeoSettings = template.SeoSettings != null ? new TemplateSeoSettings() : new TemplateSeoSettings(),
            Changes = new List<VariationChange>(),
            PredictedPerformanceImprovement = 0.0
        };
    }

    private Dictionary<string, object> AnalyzeContentPatterns(IEnumerable<string> sampleContent)
    {
        // Analyze patterns in sample content
        return new Dictionary<string, object>();
    }

    private Dictionary<string, object> ExtractVariablePatterns(IEnumerable<string> sampleContent)
    {
        // Extract variable patterns from content
        return new Dictionary<string, object>();
    }

    private async Task<SeoTemplate> GenerateMetaTemplate(MetaTemplateRequest request, Dictionary<string, object> contentPatterns, Dictionary<string, object> variablePatterns, int templateNumber)
    {
        // Generate a meta template based on analysis
        return new SeoTemplate
        {
            Name = $"Generated Template {templateNumber}",
            Category = request.Category ?? "Generated",
            Template = "<h1>{title}</h1><p>{description}</p>",
            VariablesList = new List<TemplateVariable>
            {
                new() { Name = "title", Type = "string", Required = true },
                new() { Name = "description", Type = "string", Required = true }
            }
        };
    }

    #endregion
}

// Additional supporting classes
public class OptimizationSettings
{
    public bool AutoApply { get; set; } = false;
    public IEnumerable<string> OptimizationTypes { get; set; } = new List<string>();
    public double TargetPerformanceScore { get; set; } = 80.0;
    public bool PreserveUserModifications { get; set; } = true;
}