using GeoLeap.Api.Models;
using System.Text;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

public class FuzzyMatchingService : IFuzzyMatchingService
{
    private readonly ILogger<FuzzyMatchingService> _logger;
    
    private static readonly Dictionary<string, string> CommonTypos = new()
    {
        {"teh", "the"}, {"adn", "and"}, {"hte", "the"}, {"taht", "that"},
        {"thier", "their"}, {"recieve", "receive"}, {"seperate", "separate"},
        {"occured", "occurred"}, {"neccessary", "necessary"}, {"begining", "beginning"}
    };

    public FuzzyMatchingService(ILogger<FuzzyMatchingService> logger)
    {
        _logger = logger;
    }

    public decimal CalculateLevenshteinDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source) || string.IsNullOrEmpty(target))
            return source == target ? 1.0m : 0.0m;

        var sourceLength = source.Length;
        var targetLength = target.Length;
        
        var matrix = new int[sourceLength + 1, targetLength + 1];

        for (var i = 0; i <= sourceLength; matrix[i, 0] = i++) { }
        for (var j = 0; j <= targetLength; matrix[0, j] = j++) { }

        for (var i = 1; i <= sourceLength; i++)
        {
            for (var j = 1; j <= targetLength; j++)
            {
                var cost = target[j - 1] == source[i - 1] ? 0 : 1;
                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        var distance = matrix[sourceLength, targetLength];
        var maxLength = Math.Max(sourceLength, targetLength);
        
        return maxLength == 0 ? 1.0m : 1.0m - (decimal)distance / maxLength;
    }

    public decimal CalculateJaroWinklerSimilarity(string source, string target)
    {
        if (string.IsNullOrEmpty(source) || string.IsNullOrEmpty(target))
            return source == target ? 1.0m : 0.0m;

        var jaroSimilarity = CalculateJaroSimilarity(source, target);
        
        if (jaroSimilarity < 0.7m) return jaroSimilarity;

        var prefixLength = Math.Min(4, Math.Min(source.Length, target.Length));
        var commonPrefixLength = 0;
        
        for (var i = 0; i < prefixLength; i++)
        {
            if (source[i] == target[i])
                commonPrefixLength++;
            else
                break;
        }

        return jaroSimilarity + (0.1m * commonPrefixLength * (1 - jaroSimilarity));
    }

    private decimal CalculateJaroSimilarity(string source, string target)
    {
        var sourceLength = source.Length;
        var targetLength = target.Length;
        
        if (sourceLength == 0) return targetLength == 0 ? 1.0m : 0.0m;

        var matchDistance = Math.Max(sourceLength, targetLength) / 2 - 1;
        var sourceMatches = new bool[sourceLength];
        var targetMatches = new bool[targetLength];

        var matches = 0;
        var transpositions = 0;

        for (var i = 0; i < sourceLength; i++)
        {
            var start = Math.Max(0, i - matchDistance);
            var end = Math.Min(i + matchDistance + 1, targetLength);

            for (var j = start; j < end; j++)
            {
                if (targetMatches[j] || source[i] != target[j]) continue;
                
                sourceMatches[i] = true;
                targetMatches[j] = true;
                matches++;
                break;
            }
        }

        if (matches == 0) return 0.0m;

        var k = 0;
        for (var i = 0; i < sourceLength; i++)
        {
            if (!sourceMatches[i]) continue;
            
            while (!targetMatches[k]) k++;
            
            if (source[i] != target[k]) transpositions++;
            k++;
        }

        return ((decimal)matches / sourceLength + (decimal)matches / targetLength + 
                (decimal)(matches - transpositions / 2) / matches) / 3.0m;
    }

    public decimal CalculateNGramSimilarity(string source, string target, int n = 2)
    {
        var sourceNGrams = GenerateNGrams(source.ToLowerInvariant(), n);
        var targetNGrams = GenerateNGrams(target.ToLowerInvariant(), n);
        
        if (sourceNGrams.Count == 0 && targetNGrams.Count == 0) return 1.0m;
        if (sourceNGrams.Count == 0 || targetNGrams.Count == 0) return 0.0m;

        var intersection = sourceNGrams.Intersect(targetNGrams).Count();
        var union = sourceNGrams.Union(targetNGrams).Count();
        
        return union == 0 ? 0.0m : (decimal)intersection / union;
    }

    public bool IsPhoneticMatch(string source, string target)
    {
        var sourceCode = GeneratePhoneticCode(source);
        var targetCode = GeneratePhoneticCode(target);
        return sourceCode == targetCode;
    }

    public string GeneratePhoneticCode(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        
        var cleaned = Regex.Replace(input.ToUpperInvariant(), @"[^A-Z]", "");
        if (cleaned.Length == 0) return string.Empty;

        var result = new StringBuilder();
        result.Append(cleaned[0]);

        for (var i = 1; i < cleaned.Length; i++)
        {
            var code = GetSoundexCode(cleaned[i]);
            if (code != "0" && (result.Length == 1 || result[result.Length - 1] != code[0]))
            {
                result.Append(code);
            }
        }

        return result.ToString().PadRight(4, '0').Substring(0, 4);
    }

    private string GetSoundexCode(char c)
    {
        return c switch
        {
            'B' or 'F' or 'P' or 'V' => "1",
            'C' or 'G' or 'J' or 'K' or 'Q' or 'S' or 'X' or 'Z' => "2",
            'D' or 'T' => "3",
            'L' => "4",
            'M' or 'N' => "5",
            'R' => "6",
            _ => "0"
        };
    }

    public List<string> GenerateNGrams(string input, int n = 2)
    {
        if (string.IsNullOrEmpty(input) || n <= 0) return new List<string>();
        
        var cleaned = input.ToLowerInvariant();
        var ngrams = new List<string>();
        
        if (cleaned.Length < n)
        {
            ngrams.Add(cleaned);
            return ngrams;
        }

        for (var i = 0; i <= cleaned.Length - n; i++)
        {
            ngrams.Add(cleaned.Substring(i, n));
        }

        return ngrams;
    }

    public FuzzyMatchResult CalculateOverallSimilarity(string source, string target)
    {
        var levenshtein = CalculateLevenshteinDistance(source, target);
        var jaroWinkler = CalculateJaroWinklerSimilarity(source, target);
        var ngram = CalculateNGramSimilarity(source, target);
        var phoneticMatch = IsPhoneticMatch(source, target);

        var overallSimilarity = (levenshtein * 0.4m + jaroWinkler * 0.4m + ngram * 0.2m);
        
        if (phoneticMatch) overallSimilarity = Math.Max(overallSimilarity, 0.7m);

        return new FuzzyMatchResult
        {
            OriginalText = source,
            MatchedText = target,
            Similarity = overallSimilarity,
            LevenshteinDistance = (int)((1 - levenshtein) * Math.Max(source.Length, target.Length)),
            JaroWinklerScore = jaroWinkler,
            IsPhoneticMatch = phoneticMatch
        };
    }

    public List<FuzzyMatchResult> FindBestMatches(string query, List<string> candidates, decimal threshold = 0.8m, int maxResults = 10)
    {
        var results = new List<FuzzyMatchResult>();

        foreach (var candidate in candidates)
        {
            var matchResult = CalculateOverallSimilarity(query, candidate);
            if (matchResult.Similarity >= threshold)
            {
                results.Add(matchResult);
            }
        }

        return results
            .OrderByDescending(r => r.Similarity)
            .Take(maxResults)
            .ToList();
    }

    public TypoCorrection SuggestCorrection(string query, List<string> dictionary)
    {
        var words = query.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var correctedWords = new List<string>();
        var hasCorrection = false;
        var alternatives = new List<string>();

        foreach (var word in words)
        {
            if (CommonTypos.ContainsKey(word.ToLowerInvariant()))
            {
                correctedWords.Add(CommonTypos[word.ToLowerInvariant()]);
                hasCorrection = true;
            }
            else
            {
                var bestMatch = FindBestMatches(word, dictionary, 0.7m, 1).FirstOrDefault();
                if (bestMatch?.Similarity >= 0.8m)
                {
                    correctedWords.Add(bestMatch.MatchedText);
                    if (bestMatch.Similarity < 0.95m) hasCorrection = true;
                }
                else
                {
                    correctedWords.Add(word);
                }
            }
        }

        var correctedQuery = string.Join(" ", correctedWords);
        var confidence = hasCorrection ? 0.8m : 1.0m;

        if (hasCorrection)
        {
            alternatives = FindBestMatches(query, dictionary, 0.6m, 3)
                .Select(m => m.MatchedText)
                .ToList();
        }

        return new TypoCorrection
        {
            OriginalQuery = query,
            CorrectedQuery = correctedQuery,
            Confidence = confidence,
            SuggestedAlternatives = alternatives
        };
    }

    public bool IsLikelyTypo(string query)
    {
        var words = query.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        
        foreach (var word in words)
        {
            if (CommonTypos.ContainsKey(word.ToLowerInvariant()))
                return true;
                
            if (HasConsecutiveRepeatedChars(word) || HasUnusualCharacterPatterns(word))
                return true;
        }

        return false;
    }

    private bool HasConsecutiveRepeatedChars(string word)
    {
        for (var i = 0; i < word.Length - 2; i++)
        {
            if (word[i] == word[i + 1] && word[i + 1] == word[i + 2])
                return true;
        }
        return false;
    }

    private bool HasUnusualCharacterPatterns(string word)
    {
        var vowelCount = word.Count(c => "aeiouAEIOU".Contains(c));
        var consonantCount = word.Length - vowelCount;
        
        if (word.Length > 3 && vowelCount == 0) return true;
        if (word.Length > 6 && (double)consonantCount / word.Length > 0.8) return true;
        
        return false;
    }
}