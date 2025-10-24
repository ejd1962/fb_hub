import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Hub uses game_number=0: port 10000 for dev backend, 9000 for production
const PORT = process.env.PORT || 10000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// API endpoint to serve reverse proxy configuration
app.get('/api/proxy-config', async (req, res) => {
  try {
    const configPath = join(__dirname, 'reverse_proxy.json');
    const configData = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    console.log('[HUB SERVER] Serving reverse proxy config');
    res.json(config);
  } catch (error) {
    console.error('[HUB SERVER] Error reading reverse_proxy.json:', error.message);

    // If file doesn't exist, return empty config indicating direct localhost mode
    if (error.code === 'ENOENT') {
      console.log('[HUB SERVER] No reverse_proxy.json found - running in direct localhost mode');
      res.json({
        proxy_port: null,
        base_url: null,
        routes: {},
        mode: 'direct'
      });
    } else {
      res.status(500).json({
        error: 'Failed to read proxy configuration',
        mode: 'direct'
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`[HUB SERVER] Running on http://localhost:${PORT}`);
  console.log(`[HUB SERVER] API endpoints:`);
  console.log(`  - GET /api/proxy-config`);
  console.log(`  - GET /api/health`);
});
