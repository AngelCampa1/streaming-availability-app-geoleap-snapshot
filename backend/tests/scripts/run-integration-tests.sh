#!/bin/bash
# Integration test execution script with database isolation
# Target: <30 seconds total execution time

set -e

echo "🔗 INTEGRATION TEST EXECUTION - Database Isolated"
echo "================================================"

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_PROJECT="GeoLeap.Api.Tests"
RESULTS_DIR="$PROJECT_DIR/test-results/integration"
TIMEOUT_SECONDS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}📊 Integration Test Configuration:${NC}"
echo "  • Test Filter: Category=Integration"
echo "  • Timeout: ${TIMEOUT_SECONDS} seconds"
echo "  • Database: In-Memory (Isolated)"
echo "  • Target: <500ms per test"
echo ""

# Change to project directory
cd "$PROJECT_DIR"

# Start timing
start_time=$(date +%s)

echo -e "${BLUE}🔧 Building test project...${NC}"
dotnet build "$TEST_PROJECT" --configuration Release --no-restore --verbosity quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${BLUE}🗄️  Setting up test environment...${NC}"

# Clean any existing test databases
rm -rf /tmp/integration-test-dbs/* 2>/dev/null || true
mkdir -p /tmp/integration-test-dbs

echo -e "${BLUE}🧪 Running integration tests...${NC}"

# Set environment variables for test isolation
export ASPNETCORE_ENVIRONMENT=Testing
export TEST_DATABASE_PROVIDER=InMemory
export TEST_ISOLATION_LEVEL=Integration

# Run integration tests with proper isolation
timeout "${TIMEOUT_SECONDS}s" dotnet test "$TEST_PROJECT" \
    --configuration Release \
    --no-build \
    --no-restore \
    --filter "Category=Integration" \
    --logger "trx;LogFileName=integration-tests.trx" \
    --logger "console;verbosity=normal" \
    --results-directory "$RESULTS_DIR" \
    --settings "$PROJECT_DIR/tests/config/integration-test.runsettings" \
    -- RunConfiguration.MaxCpuCount=1 \
       RunConfiguration.DisableParallelization=true \
       TestRunParameters.Parameter\(name=\"TestTimeout\",value=\"2000\"\) \
       TestRunParameters.Parameter\(name=\"DatabaseIsolation\",value=\"true\"\)

exit_code=$?

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))

echo ""
echo "================================================"

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ INTEGRATION TESTS PASSED${NC}"
    echo -e "${GREEN}   Execution Time: ${execution_time}s${NC}"
    
    if [ $execution_time -lt 30 ]; then
        echo -e "${GREEN}   Performance Target: ACHIEVED${NC}"
    else
        echo -e "${YELLOW}   Performance Target: EXCEEDED (${execution_time}s > 30s)${NC}"
    fi
    
    # Extract detailed results
    if [ -f "$RESULTS_DIR/integration-tests.trx" ]; then
        test_count=$(grep -o 'total="[0-9]*"' "$RESULTS_DIR/integration-tests.trx" | grep -o '[0-9]*' | head -1)
        passed_count=$(grep -o 'passed="[0-9]*"' "$RESULTS_DIR/integration-tests.trx" | grep -o '[0-9]*' | head -1)
        failed_count=$(grep -o 'failed="[0-9]*"' "$RESULTS_DIR/integration-tests.trx" | grep -o '[0-9]*' | head -1)
        
        if [ -n "$test_count" ] && [ -n "$passed_count" ]; then
            echo -e "${GREEN}   Tests: $passed_count/$test_count passed${NC}"
            
            if [ -n "$failed_count" ] && [ "$failed_count" -gt 0 ]; then
                echo -e "${RED}   Failed: $failed_count tests${NC}"
            fi
            
            # Calculate average time per test
            if [ "$test_count" -gt 0 ]; then
                avg_time=$((execution_time * 1000 / test_count))
                echo -e "${GREEN}   Average: ${avg_time}ms per test${NC}"
                
                if [ "$avg_time" -lt 500 ]; then
                    echo -e "${GREEN}   ⚡ PERFORMANCE EXCELLENT${NC}"
                elif [ "$avg_time" -lt 1000 ]; then
                    echo -e "${YELLOW}   ⚠️  PERFORMANCE ACCEPTABLE${NC}"
                else
                    echo -e "${RED}   🐌 PERFORMANCE NEEDS OPTIMIZATION${NC}"
                fi
            fi
        fi
    fi
    
elif [ $exit_code -eq 124 ]; then
    echo -e "${RED}❌ INTEGRATION TESTS TIMED OUT${NC}"
    echo -e "${RED}   Timeout Limit: ${TIMEOUT_SECONDS}s${NC}"
    echo -e "${RED}   Action Required: Optimize database operations${NC}"
    
else
    echo -e "${RED}❌ INTEGRATION TESTS FAILED${NC}"
    echo -e "${RED}   Exit Code: $exit_code${NC}"
fi

echo ""
echo -e "${BLUE}🧹 Cleaning up test resources...${NC}"

# Clean up test databases
rm -rf /tmp/integration-test-dbs/* 2>/dev/null || true

# Unset environment variables
unset ASPNETCORE_ENVIRONMENT
unset TEST_DATABASE_PROVIDER
unset TEST_ISOLATION_LEVEL

echo -e "${BLUE}📁 Results Location: $RESULTS_DIR${NC}"
echo -e "${BLUE}📊 TRX Report: $RESULTS_DIR/integration-tests.trx${NC}"

# Show detailed failure analysis
if [ $exit_code -ne 0 ] && [ -f "$RESULTS_DIR/integration-tests.trx" ]; then
    echo ""
    echo -e "${YELLOW}📋 FAILURE ANALYSIS:${NC}"
    
    # Count different types of failures
    db_failures=$(grep -c "database\|connection\|DbContext" "$RESULTS_DIR/integration-tests.trx" 2>/dev/null || echo "0")
    service_failures=$(grep -c "service\|dependency" "$RESULTS_DIR/integration-tests.trx" 2>/dev/null || echo "0")
    
    if [ "$db_failures" -gt 0 ]; then
        echo -e "${RED}   Database-related failures: $db_failures${NC}"
        echo -e "${YELLOW}   Suggestion: Check database setup and connection logic${NC}"
    fi
    
    if [ "$service_failures" -gt 0 ]; then
        echo -e "${RED}   Service-related failures: $service_failures${NC}"
        echo -e "${YELLOW}   Suggestion: Verify service registration and mocking${NC}"
    fi
    
    # Show first few failure messages
    echo -e "${YELLOW}   First few failures:${NC}"
    grep -A 3 'outcome="Failed"' "$RESULTS_DIR/integration-tests.trx" | head -15 || echo "    No failure details found"
fi

exit $exit_code