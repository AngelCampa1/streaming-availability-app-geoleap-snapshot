using FluentAssertions;
using GeoLeap.Api.Tests.Framework;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace GeoLeap.Api.Tests.Examples
{
    /// <summary>
    /// Example unit test demonstrating the new test framework
    /// Shows best practices for fast, isolated unit testing
    /// </summary>
    [Trait("Category", TestCategories.Unit)]
    [Trait("Priority", TestPriority.High)]
    public class ExampleUnitTest : UnitTestBase
    {
        private readonly ITestOutputHelper _output;
        private readonly MockServiceFactory _mockFactory;

        public ExampleUnitTest(ITestOutputHelper output)
        {
            _output = output;
            _mockFactory = new MockServiceFactory();
        }

        protected override void ConfigureServices(IServiceCollection services)
        {
            // Configure minimal services for unit testing
            services.AddSingleton<IExampleService, ExampleService>();
            
            // Add mock external dependencies
            _mockFactory.ConfigureExternalServiceMocks(services);
        }

        [Fact]
        public async Task ExampleBusinessLogic_WithValidInput_ReturnsExpectedResult()
        {
            // Arrange
            var service = GetService<IExampleService>();
            var input = "test-input";
            var expectedOutput = "processed-test-input";

            // Act & Assert with timeout validation
            await AssertCompletesWithinTimeout(async () =>
            {
                var result = await service.ProcessAsync(input);
                
                // Assert
                result.Should().Be(expectedOutput);
                result.Should().NotBeNullOrEmpty();
            });

            _output.WriteLine($"✅ Unit test completed successfully in under {TestTimeouts.Unit.TotalMilliseconds}ms");
        }

        [Fact]
        public void ExampleValidation_WithInvalidInput_ThrowsExpectedException()
        {
            // Arrange
            var service = GetService<IExampleService>();
            var invalidInput = "";

            // Act & Assert
            var action = () => service.ValidateInput(invalidInput);
            
            action.Should().Throw<ArgumentException>()
                .WithMessage("*cannot be empty*");

            _output.WriteLine("✅ Validation test completed - exception handling verified");
        }

        [Theory]
        [InlineData("input1", "processed-input1")]
        [InlineData("input2", "processed-input2")]
        [InlineData("special@chars!", "processed-special@chars!")]
        public async Task ExampleParameterizedTest_WithVariousInputs_ProducesCorrectOutputs(
            string input, 
            string expectedOutput)
        {
            // Arrange
            var service = GetService<IExampleService>();

            // Act
            var result = await service.ProcessAsync(input);

            // Assert
            result.Should().Be(expectedOutput);
            
            _output.WriteLine($"✅ Parameterized test passed for input: {input}");
        }

        [Fact]
        public async Task ExampleMockingTest_WithMockedDependency_VerifiesInteractions()
        {
            // Arrange
            var mockLogger = _mockFactory.CreateLoggerMock<IExampleService>();
            var service = new ExampleService(mockLogger.Object);

            // Act
            await service.ProcessAsync("test-input");

            // Assert
            mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Processing input")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);

            _output.WriteLine("✅ Mock verification completed - dependency interactions verified");
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _mockFactory?.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    // Example service interfaces and implementations for testing
    public interface IExampleService
    {
        Task<string> ProcessAsync(string input);
        void ValidateInput(string input);
    }

    public class ExampleService : IExampleService
    {
        private readonly ILogger<IExampleService> _logger;

        public ExampleService(ILogger<IExampleService>? logger = null)
        {
            _logger = logger ?? Mock.Of<ILogger<IExampleService>>();
        }

        public async Task<string> ProcessAsync(string input)
        {
            ValidateInput(input);
            
            _logger.LogInformation("Processing input: {Input}", input);
            
            // Simulate async processing (but keep it fast for unit tests)
            await Task.Delay(1); // Minimal delay for async pattern
            
            return $"processed-{input}";
        }

        public void ValidateInput(string input)
        {
            if (string.IsNullOrEmpty(input))
                throw new ArgumentException("Input cannot be empty", nameof(input));
        }
    }
}