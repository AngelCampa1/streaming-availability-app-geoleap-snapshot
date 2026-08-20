#!/bin/bash
# Fast unit test execution script
# Target: <5 seconds total execution time

set -e

echo "🚀 UNIT TEST EXECUTION - Fast & Isolated"
echo "========================================"

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_PROJECT="GeoLeap.Api.Tests"
RESULTS_DIR="$PROJECT_DIR/test-results/unit"
TIMEOUT_SECONDS=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}📊 Unit Test Configuration:${NC}"
echo "  • Test Filter: Category=Unit"
echo "  • Timeout: ${TIMEOUT_SECONDS} seconds"
echo "  • Parallelization: Disabled (MaxCpuCount=1)"
echo "  • Target: <50ms per test"
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

echo -e "${BLUE}🧪 Running unit tests...${NC}"

# Run unit tests with strict filtering and timeout
timeout "${TIMEOUT_SECONDS}s" dotnet test "$TEST_PROJECT" \
    --configuration Release \
    --no-build \
    --no-restore \
    --filter "Category=Unit" \
    --logger "trx;LogFileName=unit-tests.trx" \
    --logger "console;verbosity=minimal" \
    --results-directory "$RESULTS_DIR" \
    --settings "$PROJECT_DIR/tests/config/unit-test.runsettings" \
    -- RunConfiguration.MaxCpuCount=1 \
       TestRunParameters.Parameter\(name=\"TestTimeout\",value=\"100\"\)

exit_code=$?

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))

echo ""
echo "========================================"

if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ UNIT TESTS PASSED${NC}"
    echo -e "${GREEN}   Execution Time: ${execution_time}s${NC}"
    echo -e "${GREEN}   Performance Target: ACHIEVED${NC}"
    
    # Extract test count from results
    if [ -f "$RESULTS_DIR/unit-tests.trx" ]; then
        test_count=$(grep -o 'total="[0-9]*"' "$RESULTS_DIR/unit-tests.trx" | grep -o '[0-9]*' | head -1)
        passed_count=$(grep -o 'passed="[0-9]*"' "$RESULTS_DIR/unit-tests.trx" | grep -o '[0-9]*' | head -1)
        
        if [ -n "$test_count" ] && [ -n "$passed_count" ]; then
            echo -e "${GREEN}   Tests: $passed_count/$test_count passed${NC}"
            
            # Calculate average time per test
            if [ "$test_count" -gt 0 ]; then
                avg_time=$((execution_time * 1000 / test_count))
                echo -e "${GREEN}   Average: ${avg_time}ms per test${NC}"
                
                if [ "$avg_time" -lt 50 ]; then
                    echo -e "${GREEN}   ⚡ PERFORMANCE EXCELLENT${NC}"
                elif [ "$avg_time" -lt 100 ]; then
                    echo -e "${YELLOW}   ⚠️  PERFORMANCE ACCEPTABLE${NC}"
                else
                    echo -e "${RED}   🐌 PERFORMANCE NEEDS OPTIMIZATION${NC}"
                fi
            fi
        fi
    fi
    
elif [ $exit_code -eq 124 ]; then
    echo -e "${RED}❌ UNIT TESTS TIMED OUT${NC}"
    echo -e "${RED}   Timeout Limit: ${TIMEOUT_SECONDS}s${NC}"
    echo -e "${RED}   Action Required: Optimize slow unit tests${NC}"
    
else
    echo -e "${RED}❌ UNIT TESTS FAILED${NC}"
    echo -e "${RED}   Exit Code: $exit_code${NC}"
    echo -e "${RED}   Check test results in: $RESULTS_DIR${NC}"
fi

echo ""
echo -e "${BLUE}📁 Results Location: $RESULTS_DIR${NC}"
echo -e "${BLUE}📊 TRX Report: $RESULTS_DIR/unit-tests.trx${NC}"

# Show brief summary of any failures
if [ $exit_code -ne 0 ] && [ -f "$RESULTS_DIR/unit-tests.trx" ]; then
    echo ""
    echo -e "${YELLOW}📋 FAILURE SUMMARY:${NC}"
    grep -A 5 'outcome="Failed"' "$RESULTS_DIR/unit-tests.trx" | head -20 || echo "  No failure details found in TRX file"
fi

exit $exit_code