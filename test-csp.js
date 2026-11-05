// CSP Violation Test Script
// Run: node test-csp.js
// Requires: puppeteer (npm install puppeteer)
// This script navigates to the app and checks for CSP violations.
//
// If any Content-Security-Policy violations occur (e.g., blocked
// Turnstile iframe, blocked videos, disallowed inline scripts),
// the test will fail.

const puppeteer = require('puppeteer');

(async () => {
  console.log(' launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const violations = [];

  // Collect console messages (errors, warnings)
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('CSP') || text.includes('Content-Security')) {
      console.log(`[Console] ${msg.type()}: ${text}`);
      violations.push({ type: 'console', message: text });
    }
  });

  // Collect CSP violations from response headers or content
  page.on('response', async response => {
    const url = response.url();

    // Check for blocked resources (403/404 that might be CSP-related)
    if (response.status() >= 400) {
      try {
        const responseText = await response.text();
        // Look for CSP-related error messages in response body
        if (responseText.toLowerCase().includes('csp') || responseText.toLowerCase().includes('content-security-policy')) {
          console.log(`[CSP Response] ${url} - ${response.status()}`);
          violations.push({ type: 'response', url, status: response.status() });
        }
      } catch (e) {
        // Ignore errors reading response body
      }
    }
  });

  // Intercept page errors
  page.on('pageerror', err => {
    console.log(`[Page Error] ${err.message}`);
    violations.push({ type: 'pageerror', message: err.message });
  });

  console.log('Navigating to http://localhost:3000...');
  try {
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    await page.waitForTimeout(3000); // Allow time for dynamic content (Turnstile, etc.)

    // Check if the page loaded without uncaught errors
    const hasViolations = violations.length > 0;

    if (hasViolations) {
      console.error(`\n❌ CSP TEST FAILED: ${violations.length} violation(s) detected:`);
      violations.forEach((v, i) => {
        console.error(`  ${i + 1}. [${v.type}] ${v.message || v.url}${v.status ? ` (${v.status})` : ''}`);
      });
      process.exit(1); // Fail the test
    } else {
      console.log('\n✅ CSP TEST PASSED: No CSP violations detected');
      process.exit(0); // Success
    }
  } catch (navErr) {
    console.error('Navigation error:', navErr.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();