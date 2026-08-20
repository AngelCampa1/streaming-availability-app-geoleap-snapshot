using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Service interface for SEO template management and dynamic page generation
/// </summary>
public interface ISeoTemplateService
{
    // Template Management
    Task<SeoTemplate> CreateTemplateAsync(SeoTemplate template);
    Task<SeoTemplate?> GetTemplateAsync(int id);
    Task<List<SeoTemplate>> GetAllTemplatesAsync(bool activeOnly = true);
    Task<List<SeoTemplate>> GetTemplatesByTypeAsync(string type, bool activeOnly = true);
    Task<SeoTemplate> UpdateTemplateAsync(SeoTemplate template);
    Task<bool> DeleteTemplateAsync(int id);
    Task<SeoTemplate> CloneTemplateAsync(int id, string newName);
    
    // Template Validation
    Task<bool> ValidateTemplateAsync(SeoTemplate template);
    Task<List<string>> GetTemplateErrorsAsync(SeoTemplate template);
    Task<Dictionary<string, object>> ParseTemplateVariablesAsync(string templateContent);
    
    // Page Generation
    Task<SeoPage> GeneratePageAsync(SeoGenerationRequest request);
    Task<List<SeoPage>> GeneratePagesAsync(SeoBatchGenerationRequest request);
    Task<SeoBatchJob> StartBatchJobAsync(SeoBatchGenerationRequest request);
    Task<SeoPage?> GetPageBySlugAsync(string slug);
    Task<List<SeoPage>> GetPagesByTemplateAsync(int templateId, int page = 1, int pageSize = 50);
    
    // Content Rendering
    Task<string> RenderTemplateAsync(string templateContent, Dictionary<string, object> variables);
    Task<string> GenerateMetaTitleAsync(string metaTitleTemplate, Dictionary<string, object> variables);
    Task<string> GenerateMetaDescriptionAsync(string metaDescriptionTemplate, Dictionary<string, object> variables);
    Task<string> GenerateH1Async(string h1Template, Dictionary<string, object> variables);
    Task<string> GenerateSlugAsync(string urlPattern, Dictionary<string, object> variables);
    
    // Variable Management
    Task<List<ContentVariable>> GetAvailableVariablesAsync(string category = "all");
    Task<ContentVariable> CreateVariableAsync(ContentVariable variable);
    Task<bool> DeleteVariableAsync(int id);
    Task RefreshDynamicVariablesAsync();
    
    // A/B Testing
    Task<SeoTemplate> CreateVariantAsync(int originalId, string variantName, Dictionary<string, string> changes);
    Task<Dictionary<string, object>> GetTemplatePerformanceAsync(int templateId, DateTime? startDate = null, DateTime? endDate = null);
    Task<SeoTemplate?> GetBestPerformingVariantAsync(int baseTemplateId);
    
    // Analytics and Optimization
    Task<SeoAnalyticsResponse> GetAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<List<TopPerformingPage>> GetTopPerformingPagesAsync(int count = 10);
    Task<List<SeoPage>> GetUnderperformingPagesAsync(int count = 10);
    Task<Dictionary<string, object>> GetContentGapsAsync();
    
    // Content Updates and Refresh
    Task<int> RefreshOutdatedPagesAsync(int batchSize = 100);
    Task<bool> UpdatePageContentAsync(long pageId, Dictionary<string, object> newVariables);
    Task<int> BulkUpdatePagesAsync(int templateId, Dictionary<string, object> globalUpdates);
    
    // Sitemap Generation
    Task<List<string>> GenerateSitemapUrlsAsync(int templateId);
    Task<string> GenerateXmlSitemapAsync(List<int>? templateIds = null);
    Task<Dictionary<string, object>> GetSitemapStatsAsync();
    
    // Internal Linking System
    Task<Dictionary<long, List<InternalLink>>> GenerateInternalLinksAsync(int templateId);
    Task<string> InjectInternalLinksAsync(string content, List<InternalLink> links);
    Task<List<LinkCluster>> CreateLinkClustersAsync(int templateId);
    
    // Quality Control
    Task<List<SeoPage>> DetectDuplicateContentAsync(float similarityThreshold = 0.8f);
    Task<List<string>> ValidateGeneratedContentAsync(long pageId);
    Task<ContentCluster> CreateContentClusterAsync(string clusterName, string criteria);
    Task<bool> CheckContentUniquenessAsync(string content, int? excludePageId = null);
}