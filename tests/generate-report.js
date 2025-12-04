const fs = require('fs');
const path = require('path');

// Read test results
let testResults;
try {
  testResults = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
} catch (error) {
  console.error('Could not read test results:', error.message);
  process.exit(1);
}

// Generate report
const report = {
  summary: {
    total: testResults.numTotalTests || 0,
    passed: testResults.numPassedTests || 0,
    failed: testResults.numFailedTests || 0,
    pending: testResults.numPendingTests || 0,
    duration: testResults.testResults?.reduce((acc, r) => acc + (r.perfStats?.end - r.perfStats?.start || 0), 0) || 0,
  },
  testSuites: {
    total: testResults.numTotalTestSuites || 0,
    passed: testResults.numPassedTestSuites || 0,
    failed: testResults.numFailedTestSuites || 0,
  },
  success: testResults.success || false,
  timestamp: new Date().toISOString(),
  details: [],
};

// Process test results
if (testResults.testResults) {
  testResults.testResults.forEach((suite) => {
    const suiteResult = {
      name: path.basename(suite.name),
      status: suite.status,
      duration: (suite.perfStats?.end - suite.perfStats?.start) || 0,
      tests: [],
    };

    if (suite.assertionResults) {
      suite.assertionResults.forEach((test) => {
        suiteResult.tests.push({
          name: test.fullName || test.title,
          status: test.status,
          duration: test.duration || 0,
          failureMessages: test.failureMessages || [],
        });
      });
    }

    report.details.push(suiteResult);
  });
}

// Generate HTML report
const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HRM Integration Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 2rem; margin-bottom: 10px; }
    .header .timestamp { opacity: 0.8; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .stat-card h3 { color: #666; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 10px; }
    .stat-card .value { font-size: 2rem; font-weight: bold; }
    .stat-card.passed .value { color: #22c55e; }
    .stat-card.failed .value { color: #ef4444; }
    .stat-card.total .value { color: #3b82f6; }
    .stat-card.pending .value { color: #f59e0b; }
    .suite { background: white; border-radius: 10px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .suite-header { padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .suite-header h2 { font-size: 1.1rem; }
    .suite-status { padding: 5px 15px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
    .suite-status.passed { background: #dcfce7; color: #166534; }
    .suite-status.failed { background: #fee2e2; color: #991b1b; }
    .test-list { padding: 0; }
    .test-item { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
    .test-item:last-child { border-bottom: none; }
    .test-name { display: flex; align-items: center; gap: 10px; }
    .test-icon { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .test-icon.passed { background: #dcfce7; color: #166534; }
    .test-icon.failed { background: #fee2e2; color: #991b1b; }
    .test-icon.pending { background: #fef3c7; color: #92400e; }
    .test-duration { color: #666; font-size: 0.9rem; }
    .failure-message { background: #fee2e2; color: #991b1b; padding: 10px 20px; font-family: monospace; font-size: 0.85rem; margin: 0 20px 10px; border-radius: 5px; }
    .overall-status { text-align: center; padding: 20px; font-size: 1.5rem; font-weight: bold; border-radius: 10px; margin-bottom: 20px; }
    .overall-status.success { background: #dcfce7; color: #166534; }
    .overall-status.failure { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HRM Integration Test Report</h1>
      <p class="timestamp">Generated: ${report.timestamp}</p>
    </div>

    <div class="overall-status ${report.success ? 'success' : 'failure'}">
      ${report.success ? '✓ All Tests Passed' : '✗ Some Tests Failed'}
    </div>

    <div class="summary">
      <div class="stat-card total">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="stat-card passed">
        <h3>Passed</h3>
        <div class="value">${report.summary.passed}</div>
      </div>
      <div class="stat-card failed">
        <h3>Failed</h3>
        <div class="value">${report.summary.failed}</div>
      </div>
      <div class="stat-card pending">
        <h3>Pending</h3>
        <div class="value">${report.summary.pending}</div>
      </div>
    </div>

    <h2 style="margin-bottom: 15px; color: #333;">Test Suites</h2>

    ${report.details.map(suite => `
      <div class="suite">
        <div class="suite-header">
          <h2>${suite.name}</h2>
          <span class="suite-status ${suite.status}">${suite.status.toUpperCase()}</span>
        </div>
        <div class="test-list">
          ${suite.tests.map(test => `
            <div class="test-item">
              <div class="test-name">
                <span class="test-icon ${test.status}">${test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '○'}</span>
                <span>${test.name}</span>
              </div>
              <span class="test-duration">${test.duration}ms</span>
            </div>
            ${test.failureMessages.length > 0 ? test.failureMessages.map(msg => `
              <div class="failure-message">${msg}</div>
            `).join('') : ''}
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
`;

// Ensure reports directory exists
if (!fs.existsSync('reports')) {
  fs.mkdirSync('reports');
}

// Write HTML report
fs.writeFileSync('reports/test-report.html', htmlReport);

// Write JSON report
fs.writeFileSync('reports/test-report.json', JSON.stringify(report, null, 2));

// Print summary to console
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('                 HRM INTEGRATION TEST REPORT');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log(`  Status:     ${report.success ? '✓ PASSED' : '✗ FAILED'}`);
console.log(`  Total:      ${report.summary.total} tests`);
console.log(`  Passed:     ${report.summary.passed} tests`);
console.log(`  Failed:     ${report.summary.failed} tests`);
console.log(`  Pending:    ${report.summary.pending} tests`);
console.log(`  Duration:   ${(report.summary.duration / 1000).toFixed(2)}s`);
console.log('');
console.log('  Test Suites:');
report.details.forEach((suite) => {
  const icon = suite.status === 'passed' ? '✓' : '✗';
  console.log(`    ${icon} ${suite.name} (${suite.tests.length} tests)`);
});
console.log('');
console.log('  Reports generated:');
console.log('    - reports/test-report.html');
console.log('    - reports/test-report.json');
console.log('');
console.log('═══════════════════════════════════════════════════════════');

process.exit(report.success ? 0 : 1);
