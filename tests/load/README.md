# HRM Load Testing Suite

This directory contains load testing configurations using Artillery.io for the HRM platform.

## Prerequisites

1. Install dependencies:
```bash
cd tests/load
npm install
```

2. Ensure the HRM API is running:
```bash
# From project root
docker-compose up -d
# or
npm run dev
```

3. Set up test users (first time only):
```bash
npx ts-node scripts/setup-load-test-users.ts
```

## Available Test Scenarios

### 1. Main Load Test
Full load test covering all major endpoints:
```bash
npm run test:load
```

### 2. Authentication Load Test
Tests authentication endpoints:
```bash
npm run test:load:auth
```

### 3. Employee Service Load Test
Tests employee management endpoints:
```bash
npm run test:load:employee
```

### 4. Attendance Load Test
Simulates shift change with high concurrent check-ins/check-outs:
```bash
npm run test:load:attendance
```

### 5. Concurrent Users Test
Simulates realistic concurrent user scenarios (10 → 50 → 100 → 200 users):
```bash
npm run test:load:concurrent
```

### 6. Stress Test
Tests system behavior under extreme load (up to 500 req/s):
```bash
npm run test:load:stress
```

### 7. Spike Test
Simulates sudden traffic spikes (shift changes, lunch breaks):
```bash
npm run test:load:spike
```

### 8. Soak Test
Tests system stability over extended periods (~1.5 hours):
```bash
npm run test:load:soak
```

## Quick Test
Run a quick health check test:
```bash
npm run test:quick
```

## Environment Variables

- `API_BASE_URL`: Target API URL (default: `http://localhost:3000`)

Example:
```bash
API_BASE_URL=https://staging.hrm.example.com npm run test:load
```

## Test Data

Test users are defined in `data/users.csv`. By default, 50 test users are available:
- `loadtest1@hrm.test` through `loadtest50@hrm.test`
- Password: `LoadTest@123456`

## Reports

After running tests, generate an HTML report:
```bash
npm run report
```

Reports are saved to `reports/load-test-report.html`.

## Performance Thresholds

| Scenario | p95 | p99 | Max Error Rate |
|----------|-----|-----|----------------|
| Standard | 500ms | 1000ms | 1% |
| Concurrent | 1000ms | 2000ms | 5% |
| Stress | 5000ms | 10000ms | 20% |
| Spike | 3000ms | 5000ms | 10% |
| Soak | 500ms | 1000ms | 1% |

## Test Phases Explained

### Warm-up
Gradual increase in traffic to warm up caches and connection pools.

### Ramp-up
Linear increase in virtual users to reach target load.

### Sustained Load
Constant load to measure steady-state performance.

### Peak Load
Maximum expected load to test system limits.

### Cool-down
Gradual decrease to observe recovery behavior.

## Metrics Collected

- **Response time** (min, max, median, p95, p99)
- **Throughput** (requests per second)
- **Error rate**
- **Latency distribution**
- **Response codes**
- **Endpoint-specific metrics**

## Recommended Testing Order

1. **Quick test** - Verify API is accessible
2. **Auth load test** - Verify authentication handles load
3. **Employee load test** - Verify CRUD operations
4. **Attendance load test** - Verify time-sensitive operations
5. **Concurrent users test** - Verify realistic user scenarios
6. **Stress test** - Find breaking points
7. **Spike test** - Verify spike handling
8. **Soak test** - Verify long-term stability (run overnight)

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED
```
Ensure the API is running and accessible at the configured URL.

### Rate Limiting
```
statusCode: 429
```
The API is rate limiting requests. This may be expected behavior during stress tests.

### Authentication Errors
```
statusCode: 401
```
Ensure test users are created using the setup script.

### Timeout Errors
```
ETIMEDOUT
```
Increase timeout in the configuration or reduce load.

## Best Practices

1. **Warm up** the system before testing
2. **Isolate** the test environment from production
3. **Monitor** system resources during tests (CPU, memory, DB connections)
4. **Document** baseline metrics before optimization
5. **Repeat** tests multiple times for consistency
6. **Compare** results after optimizations
