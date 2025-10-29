import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, readFileSync } from 'fs/promises';
import { displayServerUrls, waitForProxyInfo } from '@transverse/shared-components/server/display-server-urls';
import { displayServerEnvironment } from '@transverse/shared-components/server/display-server-environment';
import { BACKEND_PUBLIC_DIR } from './constants.js';
import JSON5 from 'json5';

// Display server name and environment FIRST
displayServerEnvironment('Hub Backend');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for server name
const packageJson = JSON5.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const SERVER_NAME = packageJson.name;

// Load TransVerse platform configuration
const configPath = join(__dirname, '..', 'transverse_configs.json');
const transverseConfig = JSON5.parse(readFileSync(configPath, 'utf-8'));
const STATUS_CHECK_INTERVAL_MINUTES = transverseConfig.status_check_interval_minutes;

// Status check interval in seconds (0 = only on startup)
// Convert minutes from config to seconds
const STATUS_CHECK_INTERVAL_SECONDS = STATUS_CHECK_INTERVAL_MINUTES * 60;

const app = express();
// Hub uses game_number=0: port 10000 for dev backend, 9000 for production
const PORT = process.env.PORT || 10000;

// BACKEND_PUBLIC_DIR is available for serving static files with proxy path prefix
// Example usage: app.use(`${BACKEND_PUBLIC_DIR}/static`, express.static(...))

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// API endpoint to serve reverse proxy configuration
app.get(`${BACKEND_PUBLIC_DIR}/api/proxy-config`, async (req, res) => {
  try {
    // Use PROXY_INFO_PATH environment variable for absolute path to proxy config file
    const configPath = process.env.PROXY_INFO_PATH;

    if (!configPath) {
      throw new Error('PROXY_INFO_PATH environment variable is not set');
    }

    console.log(`[HUB SERVER] Reading proxy config from: ${configPath}`);
    const configData = await readFile(configPath, 'utf-8');
    const config = JSON5.parse(configData);

    console.log('[HUB SERVER] Serving reverse proxy config');
    res.json(config);
  } catch (error) {
    console.error('[HUB SERVER] FATAL: Error reading reverse_proxy.json:', error.message);
    console.error('[HUB SERVER] PROXY_INFO_PATH:', process.env.PROXY_INFO_PATH);

    // HARD FAIL - no fallback
    res.status(500).json({
      error: 'Failed to read proxy configuration file',
      message: error.message,
      proxyInfoPath: process.env.PROXY_INFO_PATH,
      fatal: true
    });
  }
});

// Health check endpoint
app.get(`${BACKEND_PUBLIC_DIR}/api/health`, (req, res) => {
  res.json({
    status: 'ok',
    service: 'fb_hub',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from the dist directory (for production)
app.use(express.static(join(__dirname, 'dist')));

// For all other routes, serve the index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, async () => {
  const startTime = Date.now();

  console.log('');
  console.log(`   [T+0.0s | ${new Date(startTime).toISOString()}] Starting URL check`);

  // Direct access URL
  const directUrl = `http://localhost:${PORT}`;
  const proxyEnabled = process.env.PROXY_ENABLED !== 'false';

  if (proxyEnabled) {
    console.log(`\n📍 DIRECT ACCESS: (PROHIBITED in proxy mode)`);
    console.log(`   ${directUrl}`);
  } else {
    console.log(`\n📍 DIRECT ACCESS:`);
    console.log(`   ${directUrl}`);
  }

  // Check for proxy information
  if (!proxyEnabled) {
    console.log(`\n📌 Reverse proxy is disabled (PROXY_ENABLED=false)`);
  } else {
    console.log(`\n🔍 Checking for reverse proxy configuration...`);
  }

  // Load proxy configuration NOW (after port is bound and listening)
  const MAX_PROXY_SETUP_SECONDS = parseInt(process.env.MAX_PROXY_SETUP_SECONDS || '25', 10);
  const PROXY_INFO = proxyEnabled ? await waitForProxyInfo(MAX_PROXY_SETUP_SECONDS * 1000) : null;

  // Compute final server URL
  let serverUrl;
  if (PROXY_INFO && PROXY_INFO.base_url) {
    serverUrl = `${PROXY_INFO.base_url}/localhost_${PORT}`;

    console.log(`\n🌐 REVERSE PROXY ACCESS:`);
    console.log(`   ${serverUrl}`);

    if (PROXY_INFO.base_url.includes('ngrok')) {
      console.log(`\n✨ This is an ngrok public URL - accessible from anywhere on the internet!`);
    } else if (PROXY_INFO.base_url.includes('localhost')) {
      console.log(`\n🏠 Local proxy running on ${PROXY_INFO.base_url}`);
    }
  } else {
    serverUrl = process.env.TRUE_URL || directUrl;
    if (proxyEnabled) {
      console.log(`\n📌 No reverse proxy detected (direct access only)`);
    }
  }

  // Display Active Endpoints
  console.log(`\n📍 ACTIVE ENDPOINTS:`);
  console.log('  HTTP:');
  console.log(`    - GET  ${BACKEND_PUBLIC_DIR}/api/proxy-config`);
  console.log(`    - GET  ${BACKEND_PUBLIC_DIR}/api/health`);

  const endTime = Date.now();
  const elapsed = ((endTime - startTime) / 1000).toFixed(3);

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Hub Backend is ready for traffic!`);
  console.log(`   [T+${elapsed}s | ${new Date(endTime).toISOString()}] URL check complete`);
  console.log('='.repeat(80) + '\n');
});
