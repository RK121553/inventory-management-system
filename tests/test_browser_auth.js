// ============================================================================
// Real Headless Edge Browser Test for Single-Admin Authentication Flow
// Launches headless Edge with an isolated profile, navigates to http://localhost:3000,
// tests invalid password attempt, tests valid login transition,
// tests page refresh (session persistence), and tests logout.
// ============================================================================

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = 9225; // Use dedicated debug port

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const ws = new globalThis.WebSocket(this.wsUrl);
      this.ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(e);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const args = msg.params.args.map(a => a.value || a.description || '').join(' ');
          console.log(`    [Browser Console ${msg.params.type}]`, args);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error(`    [Browser JS Exception]`, msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
        } else if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runBrowserTest() {
  console.log('================================================================');
  console.log(' RUNNING REAL HEADLESS BROWSER AUTHENTICATION TEST');
  console.log('================================================================\n');

  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-test-profile-'));
  console.log('1. Launching Headless Microsoft Edge on port', DEBUG_PORT);
  console.log('   Temp Profile Dir:', tempProfileDir);

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:3000'
  ], { stdio: 'ignore' });

  let cdp = null;

  try {
    // Wait for Edge CDP to become available
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        targets = await getJson(`http://localhost:${DEBUG_PORT}/json`);
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Could not connect to Headless Edge remote debugging port.');
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    console.log('2. Connected to Edge target page:', pageTarget.title || pageTarget.url);

    cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    // Wait for page to initialize
    await sleep(2000);

    // Initial check: is login-container visible and app-container hidden?
    const initialLoginDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('login-container')).display
    `);
    const initialAppDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('app-container')).display
    `);

    console.log('\n--- Initial Unauthenticated State ---');
    console.log('  login-container computed display:', initialLoginDisplay);
    console.log('  app-container computed display:  ', initialAppDisplay);

    if (initialLoginDisplay === 'flex' && initialAppDisplay === 'none') {
      console.log('  [PASS] Login card is visible, App container is hidden.');
    } else {
      console.error('  [FAIL] Expected login-container: flex, app-container: none');
    }

    // Step 2: Try invalid password
    console.log('\n--- Testing Invalid Password Attempt ---');
    await cdp.eval(`
      (function() {
        document.getElementById('login-username').value = 'admin';
        document.getElementById('login-password').value = 'WrongPassword999!';
        document.getElementById('login-submit-btn').click();
      })()
    `);

    await sleep(1500);

    const errorAlertVisible = await cdp.eval(`
      !document.getElementById('login-error-alert').classList.contains('d-none')
    `);
    const errorText = await cdp.eval(`
      document.getElementById('login-error-text').innerText
    `);
    const loginStillVisible = await cdp.eval(`
      window.getComputedStyle(document.getElementById('login-container')).display === 'flex'
    `);

    console.log('  Error alert displayed:', errorAlertVisible);
    console.log('  Error message:        ', errorText);
    console.log('  Login still visible:  ', loginStillVisible);

    if (errorAlertVisible && loginStillVisible && errorText.includes('Invalid')) {
      console.log('  [PASS] Invalid password rejected with error alert, remains on login screen.');
    } else {
      console.error('  [FAIL] Invalid password handling failed.');
    }

    // Step 3: Enter correct credentials and sign in
    console.log('\n--- Testing Successful Login & Dashboard Transition ---');
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD;

    await cdp.eval(`
      (function() {
        document.getElementById('login-username').value = ${JSON.stringify(adminUser)};
        document.getElementById('login-password').value = ${JSON.stringify(adminPass)};
        document.getElementById('login-submit-btn').click();
      })()
    `);

    // Wait for async login, toast, and showAppInterface to execute
    await sleep(2500);

    const postLoginDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('login-container')).display
    `);
    const postAppDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('app-container')).display
    `);
    const currentSection = await cdp.eval(`
      state.activeSection
    `);
    const dashProducts = await cdp.eval(`
      document.getElementById('dash-total-products').innerText
    `);
    const dashRevenue = await cdp.eval(`
      document.getElementById('dash-sales-revenue').innerText
    `);
    const topAdminBadge = await cdp.eval(`
      document.getElementById('top-admin-user').innerText
    `);

    console.log('  login-container computed display:', postLoginDisplay);
    console.log('  app-container computed display:  ', postAppDisplay);
    console.log('  Active section:                  ', currentSection);
    console.log('  Dashboard Total Products:        ', dashProducts);
    console.log('  Dashboard Sales Revenue:         ', dashRevenue);
    console.log('  Top Navbar Admin Badge:          ', topAdminBadge);

    const isLoginHidden = postLoginDisplay === 'none';
    const isAppVisible = postAppDisplay === 'block';
    const isDashboardActive = currentSection === 'dashboard';
    const isDashboardLoaded = dashProducts === '14';

    if (isLoginHidden && isAppVisible && isDashboardActive && isDashboardLoaded) {
      console.log('  [PASS] Browser SUCCESSFULLY LEFT login page and is now viewing the Dashboard!');
    } else {
      console.error('  [FAIL] Dashboard did not appear as expected.');
    }

    // Step 4: Test Page Refresh (Session Persistence)
    console.log('\n--- Testing Page Reload (Session Persistence) ---');
    await cdp.send('Page.reload');
    await sleep(2500);

    const reloadLoginDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('login-container')).display
    `);
    const reloadAppDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('app-container')).display
    `);
    const reloadProducts = await cdp.eval(`
      document.getElementById('dash-total-products').innerText
    `);

    console.log('  Reload login-container computed display:', reloadLoginDisplay);
    console.log('  Reload app-container computed display:  ', reloadAppDisplay);
    console.log('  Reload Dashboard Total Products:        ', reloadProducts);

    if (reloadLoginDisplay === 'none' && reloadAppDisplay === 'block' && reloadProducts === '14') {
      console.log('  [PASS] Session persisted on reload: Dashboard restored automatically!');
    } else {
      console.error('  [FAIL] Session was not properly restored on page reload.');
    }

    // Step 5: Test Logout
    console.log('\n--- Testing Logout Flow ---');
    await cdp.eval(`
      handleLogout();
    `);
    await sleep(1500);

    const logoutLoginDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('login-container')).display
    `);
    const logoutAppDisplay = await cdp.eval(`
      window.getComputedStyle(document.getElementById('app-container')).display
    `);
    const tokenCleared = await cdp.eval(`
      API.getToken() === null
    `);

    console.log('  Post-logout login-container display:', logoutLoginDisplay);
    console.log('  Post-logout app-container display:  ', logoutAppDisplay);
    console.log('  Session token cleared:              ', tokenCleared);

    if (logoutLoginDisplay === 'flex' && logoutAppDisplay === 'none' && tokenCleared) {
      console.log('  [PASS] Logout successful: returned to Login screen and cleared token!');
    } else {
      console.error('  [FAIL] Logout failed.');
    }

  } catch (err) {
    console.error('[BROWSER TEST ERROR]', err);
  } finally {
    if (cdp) cdp.close();
    edgeProc.kill();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch (e) {}
    console.log('\n[INFO] Edge browser closed.');
  }
}

runBrowserTest();
