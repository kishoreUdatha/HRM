#!/bin/bash

# HRM Load Testing Script
# This script sets up the environment for load testing and runs Artillery tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}           HRM Load Testing Suite                       ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Function to start load testing environment
start_loadtest_env() {
    echo -e "\n${YELLOW}Starting load testing environment...${NC}"

    # Set load testing environment variable
    export LOAD_TESTING=true

    # Start services with load testing configuration
    docker-compose -f docker-compose.yml -f docker-compose.loadtest.yml up -d \
        --scale api-gateway=3 \
        --scale auth-service=2 \
        --scale attendance-service=3 \
        --scale employee-service=2

    echo -e "${GREEN}Load testing environment started with scaled services.${NC}"

    # Wait for services to be healthy
    echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
    sleep 30

    # Check health
    echo -e "\n${YELLOW}Checking service health...${NC}"
    curl -s http://localhost:3000/health | jq . || echo "API Gateway health check"
}

# Function to stop load testing environment
stop_loadtest_env() {
    echo -e "\n${YELLOW}Stopping load testing environment...${NC}"
    docker-compose -f docker-compose.yml -f docker-compose.loadtest.yml down
    echo -e "${GREEN}Load testing environment stopped.${NC}"
}

# Function to run load tests
run_load_tests() {
    local test_type=$1

    echo -e "\n${YELLOW}Running $test_type load test...${NC}"

    cd tests/load

    case $test_type in
        "quick")
            npx artillery quick --count 20 --num 10 http://localhost:3000/api/health
            ;;
        "auth")
            npx artillery run scenarios/auth-load.yml --output reports/auth-load-report.json
            ;;
        "concurrent")
            npx artillery run scenarios/concurrent-users.yml --output reports/concurrent-users-report.json
            ;;
        "stress")
            npx artillery run scenarios/stress-test.yml --output reports/stress-test-report.json
            ;;
        "spike")
            npx artillery run scenarios/spike-test.yml --output reports/spike-test-report.json
            ;;
        "soak")
            npx artillery run scenarios/soak-test.yml --output reports/soak-test-report.json
            ;;
        "all")
            run_load_tests "auth"
            run_load_tests "concurrent"
            ;;
        *)
            echo -e "${RED}Unknown test type: $test_type${NC}"
            echo "Available types: quick, auth, concurrent, stress, spike, soak, all"
            exit 1
            ;;
    esac

    cd ../..

    echo -e "${GREEN}$test_type load test completed.${NC}"
}

# Function to generate reports
generate_reports() {
    echo -e "\n${YELLOW}Generating HTML reports...${NC}"

    cd tests/load

    for report in reports/*.json; do
        if [ -f "$report" ]; then
            html_report="${report%.json}.html"
            npx artillery report "$report" --output "$html_report" 2>/dev/null || true
            echo -e "${GREEN}Generated: $html_report${NC}"
        fi
    done

    cd ../..
}

# Function to show usage
show_usage() {
    echo -e "\n${YELLOW}Usage:${NC}"
    echo "  $0 start              - Start load testing environment with scaled services"
    echo "  $0 stop               - Stop load testing environment"
    echo "  $0 test <type>        - Run a specific load test"
    echo "  $0 report             - Generate HTML reports from JSON results"
    echo ""
    echo -e "${YELLOW}Test types:${NC}"
    echo "  quick      - Quick health check test (10 users, 20 requests)"
    echo "  auth       - Authentication load test"
    echo "  concurrent - Concurrent users test (10→200 users)"
    echo "  stress     - Stress test (up to 500 req/s)"
    echo "  spike      - Spike test (simulates traffic spikes)"
    echo "  soak       - Soak test (~1.5 hours)"
    echo "  all        - Run auth and concurrent tests"
}

# Main script logic
case "$1" in
    "start")
        start_loadtest_env
        ;;
    "stop")
        stop_loadtest_env
        ;;
    "test")
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify a test type${NC}"
            show_usage
            exit 1
        fi
        run_load_tests "$2"
        ;;
    "report")
        generate_reports
        ;;
    *)
        show_usage
        ;;
esac

echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
