# Testing Guide - GeoLeap (GeoLeap)

## 🚫 Testing Anti-Patterns & Over-Mocking Prevention

### 🚨 THE FUNDAMENTAL PROBLEM

**This codebase has HIGH TEST COUNTS but LOW COVERAGE because tests mock everything.**

A test that passes by mocking all dependencies is **WORTHLESS** - it tests the mock, not the code.

### ⚡ COVERAGE OVER PASSING (MOST IMPORTANT RULE)

```
🚨 PRIORITY ORDER FOR ALL TESTING WORK:

1. CODE COVERAGE (Does test execute REAL code?) ← HIGHEST PRIORITY
2. TEST QUALITY (Does test verify actual behavior?)
3. PASS RATE (Does test pass?) ← LOWEST PRIORITY

A passing test that mocks everything = USELESS
A failing test that hits real code = VALUABLE FEEDBACK
```

**ABSOLUTE RULES:**
- **NEVER** optimize for "all tests passing" at the expense of coverage
- **NEVER** add mocks just to make a test pass
- **ALWAYS** prefer fewer tests with higher coverage over more tests with low coverage
- **ALWAYS** verify coverage INCREASED after adding tests

### 🎯 The Mock Boundary Rule

**MUST MOCK (External I/O Boundaries):**
| What to Mock | Why |
|--------------|-----|
| External APIs (TMDB, Stripe, Azure) | Network dependency, rate limits, costs |
| Email/SMS services | Side effects |
| Redis/Cache | Infrastructure dependency |
| Native modules (React Native) | Platform dependency |
| Third-party SDKs | External dependency |
| File system | Environment variability |

**MUST NOT MOCK (Internal Business Logic):**
| What to Keep Real | Why |
|-------------------|-----|
| Service classes | This IS the code under test |
| Utility functions | Pure, deterministic |
| Validators | Pure, deterministic |
| State management (hooks, context) | Core application logic |
| Data transformations | Business rules |
| UI component logic | User-facing behavior |

### 🚫 Forbidden Anti-Patterns

#### Anti-Pattern 1: Accept Any Status Code (FORBIDDEN)
```csharp
// ❌ FORBIDDEN - Tests nothing, gives false confidence
var validCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
Assert.Contains((int)response.StatusCode, validCodes);

// ✅ REQUIRED - Test specific expected behavior
Assert.Equal(HttpStatusCode.OK, response.StatusCode);
var result = await response.Content.ReadFromJsonAsync<ContentDto>();
Assert.NotNull(result);
Assert.Equal("Expected Title", result.Title);
```

#### Anti-Pattern 2: Mock Everything in Factory (FORBIDDEN)
```csharp
// ❌ FORBIDDEN - Creates useless tests
services.AddTransient<ISearchService>(_ => Substitute.For<ISearchService>());
services.AddTransient<IContentService>(_ => Substitute.For<IContentService>());
// 60+ services all mocked...

// ✅ REQUIRED - Use real services, mock only external I/O
services.AddTransient<ISearchService, SearchService>(); // REAL
services.AddTransient<IContentService, ContentService>(); // REAL
services.AddTransient<ITmdbClient>(_ => new FakeTmdbClient()); // FAKE for external API
```

#### Anti-Pattern 3: Mock the Thing You're Testing (FORBIDDEN)
```typescript
// ❌ FORBIDDEN - You're testing your mock, not the hook
jest.mock('@/hooks/useSearch');
test('useSearch works', () => {
  // Testing the mock, not real code!
});

// ✅ REQUIRED - Test real hook with mocked API
test('useSearch returns filtered results', async () => {
  server.use(rest.get('/api/search', (req, res, ctx) => res(ctx.json(mockData))));
  const { result } = renderHook(() => useSearch('action'));
  await waitFor(() => expect(result.current.results).toHaveLength(3));
});
```

#### Anti-Pattern 4: Mock UI Components (FORBIDDEN)
```typescript
// ❌ FORBIDDEN - Defeats purpose of component testing
jest.mock('@/components/SearchResults', () => ({ SearchResults: () => <div/> }));

// ✅ REQUIRED - Render real components
render(<SearchResults results={mockData} />);
expect(screen.getByText('Movie Title')).toBeInTheDocument();
```

### 📊 Mock-to-Test Ratio Tracking

| Ratio | Status | Action |
|-------|--------|--------|
| < 0.3 | ✅ Good | Maintain |
| 0.3-0.5 | ⚠️ Warning | Review mocks |
| > 0.5 | 🚨 Critical | Reduce mocking |

**Formula**: Mock calls per test file / Number of tests in file

### ✅ Correct Testing Patterns

#### Backend: Real Services with Fake External Dependencies
```csharp
public class RealServicesTestFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // REAL services (from Program.cs) - don't replace them!

            // FAKE only external I/O
            services.Replace(ServiceDescriptor.Singleton<IEmailService>(new FakeEmailService()));
            services.Replace(ServiceDescriptor.Singleton<ITmdbClient>(new FakeTmdbClient()));
            services.Replace(ServiceDescriptor.Singleton<IStripeClient>(new FakeStripeClient()));

            // In-memory database is OK
            services.AddDbContext<ApplicationDbContext>(opt => opt.UseInMemoryDatabase("TestDb"));
        });
    }
}
```

#### Frontend/Mobile: MSW for Network-Level Mocking
```typescript
// Use MSW (Mock Service Worker) for API mocking
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/search', (req, res, ctx) => {
    return res(ctx.json({ results: mockSearchResults }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Tests use REAL components, hooks, services - only network is mocked
test('SearchPage displays results', async () => {
  render(<SearchPage />);
  await waitFor(() => {
    expect(screen.getByText('Movie Title')).toBeInTheDocument();
  });
});
```

## 🧪 MinimalTestBase Pattern for .NET Testing

### ✅ PROVEN 100% SUCCESS RATE PATTERN

**ABSOLUTE REQUIREMENT**: All .NET backend tests MUST use the MinimalTestBase pattern for guaranteed reliability.

### Core Test Base Class
See `backend/GeoLeap.Api.Tests/Infrastructure/MinimalTestBase.cs` for the standard implementation.

### Pattern Migration Status
- **OLD**: MinimalTestBase with 60+ mocked services → Being phased out
- **NEW**: RealServicesTestBase with real services + fake external I/O → Target pattern
- **Goal**: 80% coverage with tests that exercise REAL code paths

### Naming Conventions
- **V3 Pattern**: `MinimalControllerNameTestsV3.cs`
- **V2 Pattern**: `MinimalServiceNameTestsV2.cs`
- **US82 Pattern**: `US82_ServiceNameTests.cs` (for notification systems)
- **Simple Pattern**: `SimpleControllerNameTest.cs`
- **Working Pattern**: `WORKING_CONTROLLER_NAME_TEST.cs`

### Legacy Test Management
- **NEVER DELETE**: Move problematic tests to `/legacy/` directory
- **Rename to .txt**: Exclude from compilation (e.g., `LegacyTest.cs.txt`)
- **Preserve Structure**: Maintain organized legacy folders for future reference
- **Clean Build**: Only working patterns remain in active build
