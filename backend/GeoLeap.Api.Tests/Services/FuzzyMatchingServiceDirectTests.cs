using GeoLeap.Api.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for FuzzyMatchingService (not via HTTP).
/// Tests fuzzy string matching algorithms: Levenshtein, Jaro-Winkler, N-Gram, Soundex.
/// </summary>
public class FuzzyMatchingServiceDirectTests : IDisposable
{
    private readonly FuzzyMatchingService _service;
    private readonly Mock<ILogger<FuzzyMatchingService>> _loggerMock;

    public FuzzyMatchingServiceDirectTests()
    {
        _loggerMock = new Mock<ILogger<FuzzyMatchingService>>();
        _service = new FuzzyMatchingService(_loggerMock.Object);
    }

    #region CalculateLevenshteinDistance Tests

    [Fact]
    public void CalculateLevenshteinDistance_IdenticalStrings_Returns100PercentSimilarity()
    {
        // Arrange
        var source = "hello";
        var target = "hello";

        // Act
        var result = _service.CalculateLevenshteinDistance(source, target);

        // Assert
        Assert.Equal(1.0m, result); // 100% similarity
    }

    [Fact]
    public void CalculateLevenshteinDistance_CompletelyDifferent_ReturnsLowSimilarity()
    {
        // Arrange
        var source = "hello";
        var target = "world";

        // Act
        var result = _service.CalculateLevenshteinDistance(source, target);

        // Assert
        Assert.True(result < 0.5m); // Low similarity
    }

    [Fact]
    public void CalculateLevenshteinDistance_OnEditDistance_ReturnsCorrectSimilarity()
    {
        // Arrange - "kitten" to "sitting" has edit distance of 3
        var source = "kitten";
        var target = "sitting";

        // Act
        var result = _service.CalculateLevenshteinDistance(source, target);

        // Assert
        // Edit distance 3, max length 7 -> similarity = 1 - (3/7) ≈ 0.571
        Assert.True(result > 0.5m && result < 0.6m);
    }

    [Fact]
    public void CalculateLevenshteinDistance_NullSource_ReturnsZero()
    {
        // Act
        var result = _service.CalculateLevenshteinDistance(null!, "target");

        // Assert
        Assert.Equal(0.0m, result);
    }

    [Fact]
    public void CalculateLevenshteinDistance_NullTarget_ReturnsZero()
    {
        // Act
        var result = _service.CalculateLevenshteinDistance("source", null!);

        // Assert
        Assert.Equal(0.0m, result);
    }

    [Fact]
    public void CalculateLevenshteinDistance_BothNullOrEmpty_ReturnsOne()
    {
        // Act
        var nullBoth = _service.CalculateLevenshteinDistance(null!, null!);
        var emptyBoth = _service.CalculateLevenshteinDistance("", "");

        // Assert
        Assert.Equal(1.0m, nullBoth);
        Assert.Equal(1.0m, emptyBoth);
    }

    [Fact]
    public void CalculateLevenshteinDistance_SingleCharDifference_ReturnsHighSimilarity()
    {
        // Arrange
        var source = "hello";
        var target = "helo"; // Missing one 'l'

        // Act
        var result = _service.CalculateLevenshteinDistance(source, target);

        // Assert
        Assert.True(result >= 0.8m); // 80% or higher similarity
    }

    #endregion

    #region CalculateJaroWinklerSimilarity Tests

    [Fact]
    public void CalculateJaroWinklerSimilarity_IdenticalStrings_Returns100Percent()
    {
        // Arrange
        var source = "martha";
        var target = "martha";

        // Act
        var result = _service.CalculateJaroWinklerSimilarity(source, target);

        // Assert
        Assert.Equal(1.0m, result);
    }

    [Fact]
    public void CalculateJaroWinklerSimilarity_ClassicExample_ReturnsExpectedScore()
    {
        // Arrange - Classic Jaro-Winkler example
        var source = "martha";
        var target = "marhta"; // Transposition

        // Act
        var result = _service.CalculateJaroWinklerSimilarity(source, target);

        // Assert - Should be very high due to common prefix
        Assert.True(result > 0.9m);
    }

    [Fact]
    public void CalculateJaroWinklerSimilarity_CommonPrefix_BoostsSimilarity()
    {
        // Arrange
        var source = "DIXON";
        var target = "DICKSONX";

        // Act
        var result = _service.CalculateJaroWinklerSimilarity(source, target);

        // Assert - Common prefix "DI" should boost score
        Assert.True(result > 0.7m);
    }

    [Fact]
    public void CalculateJaroWinklerSimilarity_NullOrEmpty_ReturnsExpected()
    {
        // Act
        var nullBoth = _service.CalculateJaroWinklerSimilarity(null!, null!);
        var emptyBoth = _service.CalculateJaroWinklerSimilarity("", "");
        var nullSource = _service.CalculateJaroWinklerSimilarity(null!, "target");

        // Assert
        Assert.Equal(1.0m, nullBoth);
        Assert.Equal(1.0m, emptyBoth);
        Assert.Equal(0.0m, nullSource);
    }

    [Fact]
    public void CalculateJaroWinklerSimilarity_NoCommonChars_ReturnsZero()
    {
        // Arrange
        var source = "abc";
        var target = "xyz";

        // Act
        var result = _service.CalculateJaroWinklerSimilarity(source, target);

        // Assert
        Assert.Equal(0.0m, result);
    }

    #endregion

    #region CalculateNGramSimilarity Tests

    [Fact]
    public void CalculateNGramSimilarity_IdenticalStrings_ReturnsOne()
    {
        // Arrange
        var source = "hello";
        var target = "hello";

        // Act
        var result = _service.CalculateNGramSimilarity(source, target, 2);

        // Assert
        Assert.Equal(1.0m, result);
    }

    [Fact]
    public void CalculateNGramSimilarity_SimilarStrings_ReturnsHighScore()
    {
        // Arrange
        var source = "hello";
        var target = "hallo"; // Similar words with actual bigram overlap

        // Act
        var result = _service.CalculateNGramSimilarity(source, target, 2);

        // Assert
        // "hello" vs "hallo": he, el, ll, lo vs ha, al, ll, lo
        // Common: ll, lo → 2/6 = 33.3%
        Assert.True(result > 0.3m); // Should have significant bigram overlap
    }

    [Fact]
    public void CalculateNGramSimilarity_DifferentN_ProducesDifferentResults()
    {
        // Arrange
        var source = "hello";
        var target = "hallo";

        // Act
        var bigram = _service.CalculateNGramSimilarity(source, target, 2);
        var trigram = _service.CalculateNGramSimilarity(source, target, 3);

        // Assert - Different n-gram sizes produce different similarities
        Assert.NotEqual(bigram, trigram);
    }

    [Fact]
    public void CalculateNGramSimilarity_BothEmpty_ReturnsOne()
    {
        // Act
        var result = _service.CalculateNGramSimilarity("", "", 2);

        // Assert
        Assert.Equal(1.0m, result);
    }

    [Fact]
    public void CalculateNGramSimilarity_OneEmpty_ReturnsZero()
    {
        // Act
        var result = _service.CalculateNGramSimilarity("hello", "", 2);

        // Assert
        Assert.Equal(0.0m, result);
    }

    [Fact]
    public void CalculateNGramSimilarity_CaseInsensitive_TreatsAsSame()
    {
        // Arrange
        var source = "HELLO";
        var target = "hello";

        // Act
        var result = _service.CalculateNGramSimilarity(source, target, 2);

        // Assert
        Assert.Equal(1.0m, result); // Should be case-insensitive
    }

    #endregion

    #region GenerateNGrams Tests

    [Fact]
    public void GenerateNGrams_ValidInput_ReturnsCorrectNGrams()
    {
        // Arrange
        var input = "hello";

        // Act
        var result = _service.GenerateNGrams(input, 2);

        // Assert
        Assert.Equal(4, result.Count); // "he", "el", "ll", "lo"
        Assert.Contains("he", result);
        Assert.Contains("el", result);
        Assert.Contains("ll", result);
        Assert.Contains("lo", result);
    }

    [Fact]
    public void GenerateNGrams_InputShorterThanN_ReturnsWholeString()
    {
        // Arrange
        var input = "hi";

        // Act
        var result = _service.GenerateNGrams(input, 3);

        // Assert
        Assert.Single(result);
        Assert.Contains("hi", result);
    }

    [Fact]
    public void GenerateNGrams_NullOrEmpty_ReturnsEmpty()
    {
        // Act
        var nullResult = _service.GenerateNGrams(null!, 2);
        var emptyResult = _service.GenerateNGrams("", 2);

        // Assert
        Assert.Empty(nullResult);
        Assert.Empty(emptyResult);
    }

    [Fact]
    public void GenerateNGrams_InvalidN_ReturnsEmpty()
    {
        // Act
        var zeroN = _service.GenerateNGrams("hello", 0);
        var negativeN = _service.GenerateNGrams("hello", -1);

        // Assert
        Assert.Empty(zeroN);
        Assert.Empty(negativeN);
    }

    #endregion

    #region IsPhoneticMatch Tests

    [Fact]
    public void IsPhoneticMatch_SameSoundingNames_ReturnsTrue()
    {
        // Arrange - "Smith" and "Smyth" sound the same
        var source = "Smith";
        var target = "Smyth";

        // Act
        var result = _service.IsPhoneticMatch(source, target);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsPhoneticMatch_IdenticalStrings_ReturnsTrue()
    {
        // Arrange
        var source = "Robert";
        var target = "Robert";

        // Act
        var result = _service.IsPhoneticMatch(source, target);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsPhoneticMatch_DifferentSounding_ReturnsFalse()
    {
        // Arrange - Use truly different sounding names (not J500 vs J500)
        // NOTE: "John" and "Jane" both map to J500 in Soundex (phonetically similar)
        var source = "Smith";
        var target = "Jones";

        // Act
        var result = _service.IsPhoneticMatch(source, target);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsPhoneticMatch_NullOrEmpty_HandlesGracefully()
    {
        // Act
        var nullBoth = _service.IsPhoneticMatch(null!, null!);
        var emptyBoth = _service.IsPhoneticMatch("", "");

        // Assert
        Assert.True(nullBoth); // Both empty, same phonetic code
        Assert.True(emptyBoth);
    }

    #endregion

    #region GeneratePhoneticCode Tests

    [Fact]
    public void GeneratePhoneticCode_ValidName_ReturnsSoundexCode()
    {
        // Arrange
        var name = "Robert";

        // Act
        var result = _service.GeneratePhoneticCode(name);

        // Assert
        Assert.Equal("R163", result); // Standard Soundex code for "Robert"
    }

    [Fact]
    public void GeneratePhoneticCode_SimilarNames_ReturnsSameCode()
    {
        // Arrange
        var name1 = "Rupert";
        var name2 = "Robert";

        // Act
        var code1 = _service.GeneratePhoneticCode(name1);
        var code2 = _service.GeneratePhoneticCode(name2);

        // Assert
        Assert.Equal(code1, code2); // Should have same Soundex code
    }

    [Fact]
    public void GeneratePhoneticCode_Always4Characters_ReturnsCorrectLength()
    {
        // Arrange
        var shortName = "Lee";
        var longName = "Washington";

        // Act
        var shortCode = _service.GeneratePhoneticCode(shortName);
        var longCode = _service.GeneratePhoneticCode(longName);

        // Assert
        Assert.Equal(4, shortCode.Length);
        Assert.Equal(4, longCode.Length);
    }

    [Fact]
    public void GeneratePhoneticCode_NullOrEmpty_ReturnsEmpty()
    {
        // Act
        var nullResult = _service.GeneratePhoneticCode(null!);
        var emptyResult = _service.GeneratePhoneticCode("");

        // Assert
        Assert.Equal(string.Empty, nullResult);
        Assert.Equal(string.Empty, emptyResult);
    }

    [Fact]
    public void GeneratePhoneticCode_NonAlphabetic_ReturnsEmpty()
    {
        // Arrange
        var numeric = "12345";
        var symbols = "!@#$%";

        // Act
        var numericResult = _service.GeneratePhoneticCode(numeric);
        var symbolsResult = _service.GeneratePhoneticCode(symbols);

        // Assert
        Assert.Equal(string.Empty, numericResult);
        Assert.Equal(string.Empty, symbolsResult);
    }

    #endregion

    #region CalculateOverallSimilarity Tests

    [Fact]
    public void CalculateOverallSimilarity_IdenticalStrings_ReturnsHighScore()
    {
        // Arrange
        var source = "hello";
        var target = "hello";

        // Act
        var result = _service.CalculateOverallSimilarity(source, target);

        // Assert
        Assert.Equal(1.0m, result.Similarity);
        Assert.Equal(source, result.OriginalText);
        Assert.Equal(target, result.MatchedText);
    }

    [Fact]
    public void CalculateOverallSimilarity_PhoneticMatch_BoostsSimilarity()
    {
        // Arrange - "Smith" and "Smyth" are phonetically identical
        var source = "Smith";
        var target = "Smyth";

        // Act
        var result = _service.CalculateOverallSimilarity(source, target);

        // Assert
        Assert.True(result.Similarity >= 0.7m); // Phonetic boost to at least 70%
        Assert.True(result.IsPhoneticMatch);
    }

    [Fact]
    public void CalculateOverallSimilarity_PopulatesAllMetrics_CorrectlyCalculated()
    {
        // Arrange
        var source = "hello";
        var target = "hallo";

        // Act
        var result = _service.CalculateOverallSimilarity(source, target);

        // Assert
        Assert.True(result.Similarity > 0); // Overall similarity calculated
        Assert.True(result.LevenshteinDistance >= 0); // Edit distance calculated
        Assert.True(result.JaroWinklerScore > 0); // Jaro-Winkler calculated
        Assert.NotNull(result.OriginalText);
        Assert.NotNull(result.MatchedText);
    }

    #endregion

    #region FindBestMatches Tests

    [Fact]
    public void FindBestMatches_WithMatchingCandidates_ReturnsMatches()
    {
        // Arrange
        var query = "hello";
        var candidates = new List<string> { "hello", "hallo", "helo", "world", "goodbye" };

        // Act
        var results = _service.FindBestMatches(query, candidates, threshold: 0.7m, maxResults: 10);

        // Assert
        Assert.NotEmpty(results);
        Assert.True(results.Count <= 5); // At most 5 candidates
        Assert.Contains(results, r => r.MatchedText == "hello");
    }

    [Fact]
    public void FindBestMatches_OrdersByDescendingSimilarity_CorrectOrder()
    {
        // Arrange
        var query = "hello";
        var candidates = new List<string> { "hallo", "helo", "hello", "hell" };

        // Act
        var results = _service.FindBestMatches(query, candidates, threshold: 0.5m, maxResults: 10);

        // Assert
        Assert.NotEmpty(results);
        // First result should be "hello" (exact match)
        Assert.Equal("hello", results[0].MatchedText);
        Assert.Equal(1.0m, results[0].Similarity);
    }

    [Fact]
    public void FindBestMatches_RespectMaxResults_LimitsOutput()
    {
        // Arrange
        var query = "test";
        var candidates = new List<string> { "test1", "test2", "test3", "test4", "test5", "test6" };

        // Act
        var results = _service.FindBestMatches(query, candidates, threshold: 0.5m, maxResults: 3);

        // Assert
        Assert.True(results.Count <= 3);
    }

    [Fact]
    public void FindBestMatches_NoMatches_ReturnsEmpty()
    {
        // Arrange
        var query = "hello";
        var candidates = new List<string> { "xyz", "abc", "123" };

        // Act
        var results = _service.FindBestMatches(query, candidates, threshold: 0.9m, maxResults: 10);

        // Assert
        Assert.Empty(results);
    }

    #endregion

    #region SuggestCorrection Tests

    [Fact]
    public void SuggestCorrection_WithCommonTypo_ReturnsCorrection()
    {
        // Arrange
        var query = "teh quick brown fox";
        var dictionary = new List<string> { "the", "quick", "brown", "fox" };

        // Act
        var result = _service.SuggestCorrection(query, dictionary);

        // Assert
        Assert.NotEqual(query, result.CorrectedQuery);
        Assert.Contains("the", result.CorrectedQuery); // "teh" corrected to "the"
        Assert.Equal(query, result.OriginalQuery);
    }

    [Fact]
    public void SuggestCorrection_NoTypos_ReturnsOriginal()
    {
        // Arrange
        var query = "the quick brown fox";
        var dictionary = new List<string> { "the", "quick", "brown", "fox" };

        // Act
        var result = _service.SuggestCorrection(query, dictionary);

        // Assert
        Assert.Equal(query, result.CorrectedQuery);
        Assert.Equal(1.0m, result.Confidence);
    }

    [Fact]
    public void SuggestCorrection_WithDictionaryMatch_SuggestsCorrection()
    {
        // Arrange
        var query = "helo world"; // Typo: "helo" instead of "hello"
        var dictionary = new List<string> { "hello", "world", "help", "hero" };

        // Act
        var result = _service.SuggestCorrection(query, dictionary);

        // Assert
        Assert.NotNull(result.CorrectedQuery);
        Assert.True(result.Confidence <= 1.0m);
    }

    #endregion

    #region IsLikelyTypo Tests

    [Fact]
    public void IsLikelyTypo_WithKnownTypo_ReturnsTrue()
    {
        // Arrange
        var query = "teh recieve message"; // Contains "teh" and "recieve"

        // Act
        var result = _service.IsLikelyTypo(query);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsLikelyTypo_WithCorrectSpelling_ReturnsFalse()
    {
        // Arrange
        var query = "the quick brown fox";

        // Act
        var result = _service.IsLikelyTypo(query);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsLikelyTypo_WithTripleConsecutiveChars_ReturnsTrue()
    {
        // Arrange
        var query = "hellooo world"; // Triple 'o'

        // Act
        var result = _service.IsLikelyTypo(query);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsLikelyTypo_WithNoVowels_ReturnsTrue()
    {
        // Arrange
        var query = "xyzw"; // No vowels in a word longer than 3 chars

        // Act
        var result = _service.IsLikelyTypo(query);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region Integration Tests

    [Fact]
    public void FuzzyMatching_FullWorkflow_AllMethodsWork()
    {
        // Arrange
        var query = "Inception";
        var candidates = new List<string>
        {
            "Inception",
            "Inseption",
            "Incepcion",
            "The Matrix",
            "Interstellar"
        };

        // Act - Full fuzzy matching workflow
        var levenshtein = _service.CalculateLevenshteinDistance(query, candidates[1]);
        var jaroWinkler = _service.CalculateJaroWinklerSimilarity(query, candidates[1]);
        var ngram = _service.CalculateNGramSimilarity(query, candidates[1], 2);
        var phoneticMatch = _service.IsPhoneticMatch(query, candidates[1]);
        var overall = _service.CalculateOverallSimilarity(query, candidates[1]);
        var bestMatches = _service.FindBestMatches(query, candidates, 0.7m, 3);
        var isTypo = _service.IsLikelyTypo("teh Inception");

        // Assert - All methods work together
        Assert.True(levenshtein > 0.7m); // "Inception" vs "Inseption" is similar
        Assert.True(jaroWinkler > 0.7m);
        Assert.True(ngram > 0.5m);
        Assert.NotNull(overall);
        Assert.NotEmpty(bestMatches);
        Assert.True(isTypo); // "teh" is a known typo
    }

    [Fact]
    public void FuzzyMatching_MovieTitleCorrection_FindsCloseMatches()
    {
        // Arrange - User searching for movie with typos
        var userQuery = "The Shawshenk Redemption"; // Typo: "Shawshenk" instead of "Shawshank"
        var movieTitles = new List<string>
        {
            "The Shawshank Redemption",
            "The Green Mile",
            "The Godfather",
            "Forrest Gump"
        };

        // Act
        var matches = _service.FindBestMatches(userQuery, movieTitles, threshold: 0.7m, maxResults: 1);

        // Assert
        Assert.Single(matches);
        Assert.Equal("The Shawshank Redemption", matches[0].MatchedText);
        Assert.True(matches[0].Similarity >= 0.7m);
    }

    #endregion

    public void Dispose()
    {
        // Cleanup if needed
    }
}
