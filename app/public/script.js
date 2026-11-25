/**
 * MiniOps Demo App Client Script
 * 100% Vanilla JavaScript.
 * Strict zero background polling policy (requests only on initial page load and on explicit user click).
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('app-status-badge');
  const uptimeSpan = document.getElementById('telemetry-uptime');
  const consoleTarget = document.getElementById('response-target');
  const consoleMeta = document.getElementById('response-meta');
  const consoleOutput = document.getElementById('response-output');

  // Update dynamic links with active port / origin
  const origin = window.location.origin;
  const updateLink = (id, path) => {
    const el = document.getElementById(id);
    if (el) {
      el.href = `${origin}${path}`;
      if (el.textContent.startsWith('/')) {
        el.textContent = `${origin}${path}`;
      }
    }
  };

  updateLink('link-home', '/');
  updateLink('link-health', '/health');
  updateLink('link-users', '/api/users');
  updateLink('link-metrics', '/metrics');
  updateLink('link-metrics-meta', '/metrics');

  /**
   * Updates application status badge according to live /health response
   */
  async function checkApplicationHealth() {
    try {
      const response = await fetch('/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();

      if (data.status === 'healthy') {
        statusBadge.className = 'badge badge-healthy';
        statusBadge.innerHTML = '<span class="badge-dot"></span> Running / Healthy';
        if (uptimeSpan) {
          uptimeSpan.textContent = `${data.uptime} seconds (Dynamic)`;
        }
      } else {
        statusBadge.className = 'badge badge-unhealthy';
        statusBadge.innerHTML = '<span class="badge-dot"></span> Degraded';
        if (uptimeSpan) uptimeSpan.textContent = 'Degraded';
      }
      return data;
    } catch (err) {
      statusBadge.className = 'badge badge-unhealthy';
      statusBadge.innerHTML = '<span class="badge-dot"></span> Offline / Unreachable';
      if (uptimeSpan) uptimeSpan.textContent = 'Server Offline';
      return null;
    }
  }

  /**
   * Executes API call and displays output in the console panel
   * @param {string} endpoint
   * @param {'GET'} method
   */
  async function executeRequest(endpoint, method = 'GET') {
    const startTime = performance.now();
    consoleTarget.textContent = `${method} ${endpoint}`;
    consoleMeta.textContent = 'Requesting...';
    consoleOutput.textContent = '// Sending request...';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Accept': endpoint === '/metrics' ? 'text/plain' : 'application/json'
        }
      });

      const duration = Math.round(performance.now() - startTime);
      const isJson = response.headers.get('content-type')?.includes('application/json');

      consoleMeta.textContent = `HTTP ${response.status} ${response.statusText} • ${duration}ms`;

      if (isJson) {
        const jsonData = await response.json();
        consoleOutput.textContent = JSON.stringify(jsonData, null, 2);
      } else {
        const textData = await response.text();
        // If metrics, truncate preview to first 30 lines for clean display
        if (endpoint === '/metrics') {
          const lines = textData.split('\n').slice(0, 30).join('\n');
          consoleOutput.textContent = `${lines}\n\n// ... truncated for preview (${textData.length} total bytes)`;
        } else {
          consoleOutput.textContent = textData;
        }
      }

      // If testing health endpoint, also refresh the status badge
      if (endpoint === '/health') {
        await checkApplicationHealth();
      }
    } catch (err) {
      const duration = Math.round(performance.now() - startTime);
      consoleMeta.textContent = `Connection Failed • ${duration}ms`;
      consoleOutput.textContent = `// Error connecting to ${endpoint}\n// ${err.message}\n// Ensure MiniOps server is running.`;
      statusBadge.className = 'badge badge-unhealthy';
      statusBadge.innerHTML = '<span class="badge-dot"></span> Offline / Unreachable';
    }
  }

  // Bind Button Event Listeners
  const btnHealth = document.getElementById('btn-test-health');
  if (btnHealth) {
    btnHealth.addEventListener('click', () => executeRequest('/health'));
  }

  const btnUsers = document.getElementById('btn-fetch-users');
  if (btnUsers) {
    btnUsers.addEventListener('click', () => executeRequest('/api/users'));
  }

  const btnMetrics = document.getElementById('btn-view-metrics');
  if (btnMetrics) {
    btnMetrics.addEventListener('click', () => executeRequest('/metrics'));
  }

  const btn404 = document.getElementById('btn-test-404');
  if (btn404) {
    btn404.addEventListener('click', () => executeRequest('/api/nonexistent-route'));
  }

  const btnQuickError = document.getElementById('btn-quick-error');
  if (btnQuickError) {
    btnQuickError.addEventListener('click', () => executeRequest('/api/nonexistent'));
  }

  // Initial Health Check on Page Load (Single call, zero periodic background polling)
  checkApplicationHealth();
});
