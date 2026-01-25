# HRM Load Testing Script for Windows PowerShell
# This script sets up the environment for load testing and runs Artillery tests

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "test", "report", "help")]
    [string]$Command = "help",

    [Parameter(Position=1)]
    [ValidateSet("quick", "auth", "concurrent", "stress", "spike", "soak", "all")]
    [string]$TestType = "quick"
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-Banner {
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "           HRM Load Testing Suite                       " -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Blue
}

function Start-LoadTestEnv {
    Write-Host "`nStarting load testing environment..." -ForegroundColor Yellow

    # Set environment variable
    $env:LOAD_TESTING = "true"

    # Start services with load testing configuration
    docker-compose -f docker-compose.yml -f docker-compose.loadtest.yml up -d `
        --scale api-gateway=3 `
        --scale auth-service=2 `
        --scale attendance-service=3 `
        --scale employee-service=2

    Write-Host "Load testing environment started with scaled services." -ForegroundColor Green

    # Wait for services
    Write-Host "`nWaiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30

    # Check health
    Write-Host "`nChecking service health..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
        $response | ConvertTo-Json
    } catch {
        Write-Host "API Gateway health check: $_" -ForegroundColor Yellow
    }
}

function Stop-LoadTestEnv {
    Write-Host "`nStopping load testing environment..." -ForegroundColor Yellow
    docker-compose -f docker-compose.yml -f docker-compose.loadtest.yml down
    Write-Host "Load testing environment stopped." -ForegroundColor Green
}

function Run-LoadTest {
    param([string]$Type)

    Write-Host "`nRunning $Type load test..." -ForegroundColor Yellow

    Push-Location tests/load

    switch ($Type) {
        "quick" {
            npx artillery quick --count 20 --num 10 http://localhost:3000/api/health
        }
        "auth" {
            npx artillery run scenarios/auth-load.yml --output reports/auth-load-report.json
        }
        "concurrent" {
            npx artillery run scenarios/concurrent-users.yml --output reports/concurrent-users-report.json
        }
        "stress" {
            npx artillery run scenarios/stress-test.yml --output reports/stress-test-report.json
        }
        "spike" {
            npx artillery run scenarios/spike-test.yml --output reports/spike-test-report.json
        }
        "soak" {
            npx artillery run scenarios/soak-test.yml --output reports/soak-test-report.json
        }
        "all" {
            Run-LoadTest -Type "auth"
            Run-LoadTest -Type "concurrent"
        }
    }

    Pop-Location

    Write-Host "$Type load test completed." -ForegroundColor Green
}

function Generate-Reports {
    Write-Host "`nGenerating HTML reports..." -ForegroundColor Yellow

    Push-Location tests/load

    Get-ChildItem -Path "reports/*.json" | ForEach-Object {
        $htmlReport = $_.FullName -replace '\.json$', '.html'
        npx artillery report $_.FullName --output $htmlReport 2>$null
        Write-Host "Generated: $htmlReport" -ForegroundColor Green
    }

    Pop-Location
}

function Show-Help {
    Write-Host "`nUsage:" -ForegroundColor Yellow
    Write-Host "  .\run-load-test.ps1 start              - Start load testing environment with scaled services"
    Write-Host "  .\run-load-test.ps1 stop               - Stop load testing environment"
    Write-Host "  .\run-load-test.ps1 test <type>        - Run a specific load test"
    Write-Host "  .\run-load-test.ps1 report             - Generate HTML reports from JSON results"
    Write-Host ""
    Write-Host "Test types:" -ForegroundColor Yellow
    Write-Host "  quick      - Quick health check test (10 users, 20 requests)"
    Write-Host "  auth       - Authentication load test"
    Write-Host "  concurrent - Concurrent users test (10->200 users)"
    Write-Host "  stress     - Stress test (up to 500 req/s)"
    Write-Host "  spike      - Spike test (simulates traffic spikes)"
    Write-Host "  soak       - Soak test (~1.5 hours)"
    Write-Host "  all        - Run auth and concurrent tests"
}

# Main script
Show-Banner

switch ($Command) {
    "start" { Start-LoadTestEnv }
    "stop" { Stop-LoadTestEnv }
    "test" { Run-LoadTest -Type $TestType }
    "report" { Generate-Reports }
    "help" { Show-Help }
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Blue
