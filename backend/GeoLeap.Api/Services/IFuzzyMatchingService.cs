using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IFuzzyMatchingService
{
    decimal CalculateLevenshteinDistance(string source, string target);
    
    decimal CalculateJaroWinklerSimilarity(string source, string target);
    
    decimal CalculateNGramSimilarity(string source, string target, int n = 2);
    
    bool IsPhoneticMatch(string source, string target);
    
    FuzzyMatchResult CalculateOverallSimilarity(string source, string target);
    
    List<FuzzyMatchResult> FindBestMatches(string query, List<string> candidates, decimal threshold = 0.8m, int maxResults = 10);
    
    string GeneratePhoneticCode(string input);
    
    List<string> GenerateNGrams(string input, int n = 2);
    
    TypoCorrection SuggestCorrection(string query, List<string> dictionary);
    
    bool IsLikelyTypo(string query);
}