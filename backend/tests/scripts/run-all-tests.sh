#!/bin/bash
# Master test execution script - runs all test categories in sequence
# Provides comprehensive test suite execution with detailed reporting

set -e

echo "🎯 COMPREHENSIVE TEST SUITE EXECUTION"
echo "====================================="

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULTS_DIR="$PROJECT_DIR/test-results/comprehensive"
SCRIPTS_DIR="$PROJECT_DIR/tests/scripts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR"

# Overall timing
overall_start=$(date +%s)

echo -e "${BLUE}📊 Test Suite Configuration:${NC}"
echo "  • Categories: Unit → Integration → E2E"
echo "  • Strategy: Fail-fast with detailed reporting"
echo "  • Results: $RESULTS_DIR"
echo ""

# Test execution results
unit_result=0
integration_result=0
e2e_result=0

echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo -e "${PURPLE}█         PHASE 1: UNIT TESTS            █${NC}"
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo ""

if [ -f "$SCRIPTS_DIR/run-unit-tests.sh" ]; then
    bash "$SCRIPTS_DIR/run-unit-tests.sh"
    unit_result=$?
else
    echo -e "${RED}❌ Unit test script not found${NC}"
    unit_result=1
fi

echo ""
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo -e "${PURPLE}█      PHASE 2: INTEGRATION TESTS        █${NC}"
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo ""

if [ $unit_result -eq 0 ]; then
    if [ -f "$SCRIPTS_DIR/run-integration-tests.sh" ]; then
        bash "$SCRIPTS_DIR/run-integration-tests.sh"
        integration_result=$?
    else
        echo -e "${RED}❌ Integration test script not found${NC}"
        integration_result=1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping integration tests due to unit test failures${NC}"
    integration_result=2  # Skipped
fi

echo ""
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo -e "${PURPLE}█         PHASE 3: E2E TESTS             █${NC}"
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo ""

if [ $integration_result -eq 0 ]; then
    if [ -f "$SCRIPTS_DIR/run-e2e-tests.sh" ]; then
        bash "$SCRIPTS_DIR/run-e2e-tests.sh"
        e2e_result=$?
    else
        echo -e "${RED}❌ E2E test script not found${NC}"
        e2e_result=1
    fi
else
    echo -e "${YELLOW}⏭️  Skipping E2E tests due to previous test failures${NC}"
    e2e_result=2  # Skipped
fi

# Calculate overall execution time
overall_end=$(date +%s)
overall_time=$((overall_end - overall_start))

echo ""
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo -e "${PURPLE}█          FINAL RESULTS SUMMARY         █${NC}"
echo -e "${PURPLE}█████████████████████████████████████████${NC}"
echo ""

# Generate comprehensive report
report_file="$RESULTS_DIR/test-execution-report.txt"

cat > "$report_file" << EOF
COMPREHENSIVE TEST EXECUTION REPORT
==================================
Generated: $(date)
Duration: ${overall_time}s
Project: GeoLeap Backend API

EXECUTION PHASES:
================

Phase 1 - Unit Tests:
$([ $unit_result -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED (Exit: $unit_result)")

Phase 2 - Integration Tests:
$([ $integration_result -eq 0 ] && echo "✅ PASSED" || [ $integration_result -eq 2 ] && echo "⏭️ SKIPPED" || echo "❌ FAILED (Exit: $integration_result)")

Phase 3 - E2E Tests:
$([ $e2e_result -eq 0 ] && echo "✅ PASSED" || [ $e2e_result -eq 2 ] && echo "⏭️ SKIPPED" || echo "❌ FAILED (Exit: $e2e_result)")

OVERALL STATUS:
==============
EOF

# Determine overall status
if [ $unit_result -eq 0 ] && [ $integration_result -eq 0 ] && [ $e2e_result -eq 0 ]; then
    overall_status="PASSED"
    overall_color="$GREEN"
    exit_code=0
    echo "🎉 ALL TESTS PASSED - DEPLOYMENT READY" >> "$report_file"
elif [ $unit_result -ne 0 ]; then
    overall_status="FAILED"
    overall_color="$RED"
    exit_code=1
    echo "❌ UNIT TESTS FAILED - FIX REQUIRED BEFORE DEPLOYMENT" >> "$report_file"
elif [ $integration_result -ne 0 ] && [ $integration_result -ne 2 ]; then
    overall_status="FAILED"
    overall_color="$RED"
    exit_code=1
    echo "❌ INTEGRATION TESTS FAILED - SERVICE INTEGRATION ISSUES" >> "$report_file"
elif [ $e2e_result -ne 0 ] && [ $e2e_result -ne 2 ]; then
    overall_status="FAILED"
    overall_color="$RED"
    exit_code=1
    echo "❌ E2E TESTS FAILED - WORKFLOW ISSUES DETECTED" >> "$report_file"
else
    overall_status="PARTIAL"
    overall_color="$YELLOW"
    exit_code=1
    echo "⚠️ PARTIAL SUCCESS - SOME TEST PHASES SKIPPED" >> "$report_file"
fi

# Console summary
echo -e "${overall_color}🎯 OVERALL STATUS: $overall_status${NC}"
echo -e "${overall_color}   Total Execution Time: ${overall_time}s${NC}"

echo ""
echo -e "${BLUE}📊 DETAILED RESULTS:${NC}"

# Unit test summary
if [ $unit_result -eq 0 ]; then
    echo -e "${GREEN}   ✅ Unit Tests: PASSED${NC}"
else
    echo -e "${RED}   ❌ Unit Tests: FAILED${NC}"
fi

# Integration test summary
if [ $integration_result -eq 0 ]; then
    echo -e "${GREEN}   ✅ Integration Tests: PASSED${NC}"
elif [ $integration_result -eq 2 ]; then
    echo -e "${YELLOW}   ⏭️  Integration Tests: SKIPPED${NC}"
else
    echo -e "${RED}   ❌ Integration Tests: FAILED${NC}"
fi

# E2E test summary
if [ $e2e_result -eq 0 ]; then
    echo -e "${GREEN}   ✅ E2E Tests: PASSED${NC}"
elif [ $e2e_result -eq 2 ]; then
    echo -e "${YELLOW}   ⏭️  E2E Tests: SKIPPED${NC}"
else
    echo -e "${RED}   ❌ E2E Tests: FAILED${NC}"
fi

echo ""
echo -e "${BLUE}📁 RESULTS LOCATIONS:${NC}"
echo "   • Unit: $PROJECT_DIR/test-results/unit/"
echo "   • Integration: $PROJECT_DIR/test-results/integration/"
echo "   • E2E: $PROJECT_DIR/test-results/e2e/"
echo "   • Summary: $report_file"

# Performance assessment
echo ""
echo -e "${BLUE}⚡ PERFORMANCE ASSESSMENT:${NC}"

if [ $overall_time -lt 60 ]; then
    echo -e "${GREEN}   🚀 EXCELLENT: Tests completed in under 1 minute${NC}"
elif [ $overall_time -lt 180 ]; then
    echo -e "${YELLOW}   ⚠️  ACCEPTABLE: Tests completed in under 3 minutes${NC}"
else
    echo -e "${RED}   🐌 SLOW: Test execution exceeds 3 minutes - optimization needed${NC}"
fi

# Add performance data to report
cat >> "$report_file" << EOF

PERFORMANCE METRICS:
===================
Total Execution Time: ${overall_time}s
Performance Rating: $([ $overall_time -lt 60 ] && echo "EXCELLENT" || [ $overall_time -lt 180 ] && echo "ACCEPTABLE" || echo "NEEDS OPTIMIZATION")

NEXT STEPS:
==========
EOF

if [ $exit_code -eq 0 ]; then
    cat >> "$report_file" << EOF
✅ All tests passed - System ready for deployment
✅ Continue with CI/CD pipeline
✅ Deploy to staging/production environment
EOF
else
    cat >> "$report_file" << EOF
❌ Test failures detected - Action required:
   1. Review failed test logs above
   2. Fix identified issues
   3. Re-run test suite
   4. Do NOT deploy until all tests pass
EOF
fi

echo ""
echo -e "${BLUE}📋 Full report saved to: $report_file${NC}"

# Final recommendations
if [ $exit_code -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🚀 DEPLOYMENT RECOMMENDATION: APPROVED${NC}"
    echo -e "${GREEN}   All test categories passed successfully${NC}"
    echo -e "${GREEN}   System is stable and ready for production${NC}"
else
    echo ""
    echo -e "${RED}🚫 DEPLOYMENT RECOMMENDATION: BLOCKED${NC}"
    echo -e "${RED}   Critical test failures detected${NC}"
    echo -e "${RED}   Fix issues before deployment${NC}"
fi

exit $exit_code