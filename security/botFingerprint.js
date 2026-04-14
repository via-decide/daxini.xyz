/*
  /security/botFingerprint.js
  Detects automation signals and bot-like behavior.
*/

export function detectBot(req) {
    const signals = [];
    const headers = req.headers;
    const ua = headers['user-agent'] || '';

    // 1. Check for common headless browser signals
    if (ua.includes('HeadlessChrome') || ua.includes('Njs-Fetch') || ua.includes('bot')) {
        signals.push('HEADLESS_UA');
    }

    // 2. Check for missing critical browser headers
    const required = ['accept', 'accept-language', 'user-agent'];
    const missing = required.filter(h => !headers[h]);
    if (missing.length > 0) {
        signals.push(`MISSING_HEADERS_${missing.join('_').toUpperCase()}`);
    }

    // 3. Automation-specific headers
    if (headers['x-puppeteer'] || headers['x-selenium-id']) {
        signals.push('AUTOMATION_HEADER');
    }

    return signals;
}
