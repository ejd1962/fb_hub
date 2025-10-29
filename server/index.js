import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import { displayServerUrls } from '@transverse/shared-components/server/display-server-urls';
import { displayServerEnvironment } from '@transverse/shared-components/server/display-server-environment';
import { BACKEND_PUBLIC_DIR } from './constants.js';
import JSON5 from 'json5';

// Display server name and environment FIRST
displayServerEnvironment('Hub Backend');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Hub uses game_number=0: port 10000 for dev backend, 9000 for production
const PORT = process.env.PORT || 10000;

// BACKEND_PUBLIC_DIR is available for serving static files with proxy path prefix
// Example usage: app.use(`${BACKEND_PUBLIC_DIR}/static`, express.static(...))
console.log(`BACKEND_PUBLIC_DIR: '${BACKEND_PUBLIC_DIR}'`);

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
  console.log(`[HUB SERVER] Running on http://localhost:${PORT}`);
});
