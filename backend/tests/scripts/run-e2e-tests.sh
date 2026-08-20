#!/bin/bash
# End-to-end test execution script with full isolation
# Target: <2 minutes total execution time

set -e

echo "🌐 E2E TEST EXECUTION - Full Application Stack"
echo "=============================================="

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_PROJECT="GeoLeap.Api.Tests"
RESULTS_DIR="$PROJECT_DIR/test-results/e2e"
TIMEOUT_SECONDS=120

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}📊 E2E Test Configuration:${NC}"
echo "  • Test Filter: Category=E2E"
echo "  • Timeout: ${TIMEOUT_SECONDS} seconds (2 minutes)"
echo "  • Database: Isolated instances"
echo "  • Target: <5s per test"
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

echo -e "${BLUE}🏗️  Setting up E2E environment...${NC}"

# Clean any existing E2E test resources
rm -rf /tmp/e2e-test-resources/* 2>/dev/null || true
mkdir -p /tmp/e2e-test-resources
mkdir -p /tmp/e2e-test-resources/databases
mkdir -p /tmp/e2e-test-resources/logs

# Set up test environment variables
export ASPNETCORE_ENVIRONMENT=E2ETesting
export TEST_DATABASE_PROVIDER=InMemory
export TEST_ISOLATION_LEVEL=E2E
export TEST_EXTERNAL_SERVICES=Mock
export TEST_FILE_UPLOADS_PATH=/tmp/e2e-test-resources/uploads
export TEST_LOGS_PATH=/tmp/e2e-test-resources/logs

# Create required directories
mkdir -p "$TEST_FILE_UPLOADS_PATH"

echo -e "${BLUE}🧪 Running E2E tests...${NC}"

# Run E2E tests with full isolation and extended timeout
timeout "${TIMEOUT_SECONDS}s" dotnet test "$TEST_PROJECT" \
    --configuration Release \
    --no-build \
    --no-restore \
    --filter "Category=E2E" \
    --logger "trx;LogFileName=e2e-tests.trx" \
    --logger "console;verbosity=normal" \
    --results-directory "$RESULTS_DIR" \
    --settings "$PROJECT_DIR/tests/config/e2e-test.runsettings" \
    -- RunConfiguration.MaxCpuCount=1 \
       RunConfiguration.DisableParallelization=true \
       TestRunParameters.Parameter\(name=\"TestTimeout\",value=\"10000\"\) \
       TestRunParameters.Parameter\(name=\"E2EIsolation\",value=\"true\"\) \
       TestRunParameters.Parameter\(name=\"RetryCount\",value=\"2\"\)

exit_code=$?

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))

echo ""
echo "=============================================="

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ E2E TESTS PASSED${NC}"
    echo -e "${GREEN}   Execution Time: ${execution_time}s${NC}"
    
    if [ $execution_time -lt 120 ]; then
        echo -e "${GREEN}   Performance Target: ACHIEVED${NC}"
    else
        echo -e "${YELLOW}   Performance Target: EXCEEDED (${execution_time}s > 120s)${NC}"
    fi
    
    # Extract detailed results
    if [ -f "$RESULTS_DIR/e2e-tests.trx" ]; then
        test_count=$(grep -o 'total="[0-9]*"' "$RESULTS_DIR/e2e-tests.trx" | grep -o '[0-9]*' | head -1)
        passed_count=$(grep -o 'passed="[0-9]*"' "$RESULTS_DIR/e2e-tests.trx" | grep -o '[0-9]*' | head -1)
        failed_count=$(grep -o 'failed="[0-9]*"' "$RESULTS_DIR/e2e-tests.trx" | grep -o '[0-9]*' | head -1)
        skipped_count=$(grep -o 'skipped="[0-9]*"' "$RESULTS_DIR/e2e-tests.trx" | grep -o '[0-9]*' | head -1)
        
        if [ -n "$test_count" ] && [ -n "$passed_count" ]; then
            echo -e "${GREEN}   Tests: $passed_count/$test_count passed${NC}"
            
            if [ -n "$failed_count" ] && [ "$failed_count" -gt 0 ]; then
                echo -e "${RED}   Failed: $failed_count tests${NC}"
            fi
            
            if [ -n "$skipped_count" ] && [ "$skipped_count" -gt 0 ]; then
                echo -e "${YELLOW}   Skipped: $skipped_count tests${NC}"
            fi
            
            # Calculate average time per test
            if [ "$test_count" -gt 0 ]; then
                avg_time=$((execution_time * 1000 / test_count))
                echo -e "${GREEN}   Average: ${avg_time}ms per test${NC}"
                
                if [ "$avg_time" -lt 5000 ]; then
                    echo -e "${GREEN}   ⚡ PERFORMANCE EXCELLENT${NC}"
                elif [ "$avg_time" -lt 10000 ]; then
                    echo -e "${YELLOW}   ⚠️  PERFORMANCE ACCEPTABLE${NC}"
                else
                    echo -e "${RED}   🐌 PERFORMANCE NEEDS OPTIMIZATION${NC}"
                fi
            fi
        fi
    fi
    
elif [ $exit_code -eq 124 ]; then
    echo -e "${RED}❌ E2E TESTS TIMED OUT${NC}"
    echo -e "${RED}   Timeout Limit: ${TIMEOUT_SECONDS}s${NC}"
    echo -e "${RED}   Action Required: Optimize slow E2E scenarios${NC}"
    
else
    echo -e "${RED}❌ E2E TESTS FAILED${NC}"
    echo -e "${RED}   Exit Code: $exit_code${NC}"
fi

echo ""
echo -e "${BLUE}🧹 Cleaning up E2E resources...${NC}"

# Clean up test resources
rm -rf /tmp/e2e-test-resources/* 2>/dev/null || true

# Clean up environment variables
unset ASPNETCORE_ENVIRONMENT
unset TEST_DATABASE_PROVIDER
unset TEST_ISOLATION_LEVEL
unset TEST_EXTERNAL_SERVICES
unset TEST_FILE_UPLOADS_PATH
unset TEST_LOGS_PATH

echo -e "${BLUE}📁 Results Location: $RESULTS_DIR${NC}"
echo -e "${BLUE}📊 TRX Report: $RESULTS_DIR/e2e-tests.trx${NC}"

# Show comprehensive failure analysis
if [ $exit_code -ne 0 ] && [ -f "$RESULTS_DIR/e2e-tests.trx" ]; then
    echo ""
    echo -e "${YELLOW}📋 COMPREHENSIVE FAILURE ANALYSIS:${NC}"
    
    # Categorize failures
    auth_failures=$(grep -c -i "auth\|login\|unauthorized" "$RESULTS_DIR/e2e-tests.trx" 2>/dev/null || echo "0")
    db_failures=$(grep -c -i "database\|connection\|entity" "$RESULTS_DIR/e2e-tests.trx" 2>/dev/null || echo "0")
    api_failures=$(grep -c -i "api\|endpoint\|http" "$RESULTS_DIR/e2e-tests.trx" 2>/dev/null || echo "0")
    timeout_failures=$(grep -c -i "timeout\|cancelled" "$RESULTS_DIR/e2e-tests.trx" 2>/dev/null || echo "0")
    
    echo -e "${YELLOW}   Failure Categories:${NC}"
    [ "$auth_failures" -gt 0 ] && echo -e "${RED}     • Authentication: $auth_failures${NC}"
    [ "$db_failures" -gt 0 ] && echo -e "${RED}     • Database: $db_failures${NC}"
    [ "$api_failures" -gt 0 ] && echo -e "${RED}     • API/HTTP: $api_failures${NC}"
    [ "$timeout_failures" -gt 0 ] && echo -e "${RED}     • Timeouts: $timeout_failures${NC}"
    
    echo ""
    echo -e "${YELLOW}   Recommended Actions:${NC}"
    
    if [ "$auth_failures" -gt 0 ]; then
        echo -e "${YELLOW}     → Review authentication setup and JWT configuration${NC}"
    fi
    
    if [ "$db_failures" -gt 0 ]; then
        echo -e "${YELLOW}     → Check database seeding and migration scripts${NC}"
    fi
    
    if [ "$api_failures" -gt 0 ]; then
        echo -e "${YELLOW}     → Verify API endpoints and HTTP client configuration${NC}"
    fi
    
    if [ "$timeout_failures" -gt 0 ]; then
        echo -e "${YELLOW}     → Increase timeouts or optimize slow operations${NC}"
    fi
    
    # Show sample failures
    echo ""
    echo -e "${YELLOW}   Sample Failures:${NC}"
    grep -A 5 'outcome="Failed"' "$RESULTS_DIR/e2e-tests.trx" | head -20 || echo "    No failure details found"
fi

exit $exit_code