import http from 'http';
import httpProxy from 'http-proxy';
import net from 'net';
import { promises as fs, existsSync, unlinkSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import JSON5 from 'json5';

const num_ports = 5;  // number of ports in each range that might need proxies

// Define your port ranges
// Hub uses game_number=0: 9000 (prod), 10000 (dev), 11000 (dev-vite)
// Games use game_number=1-5: 9001-9005 (prod), 10001-10005 (dev), 11001-11005 (dev-vite)
const PORT_RANGES = {
  hub: [9000, 10000, 11000], // Hub only on these three ports
  production: Array.from({length: num_ports}, (_, i) => 9001 + i), // 9001-9005
  dev: Array.from({length: num_ports}, (_, i) => 10001 + i),        // 10001-10005
  devVite: Array.from({length: num_ports}, (_, i) => 11001 + i)     // 11001-11005
};

const PROXY_PORT = 8999; // The single port we'll expose via ngrok

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const deployment = args.find(arg => arg.startsWith('--deployment='))?.split('=')[1] || 'local';
  const proxy = args.find(arg => arg.startsWith('--proxy='))?.split('=')[1] || 'no';

  if (!['local', 'ngrok'].includes(deployment)) {
    console.error('Error: --deployment must be "local" or "ngrok"');
    console.error('Usage: node setup-reverse-proxy.js --proxy=yes|no --deployment=local|ngrok');
    process.exit(1);
  }

  if (!['yes', 'no'].includes(proxy)) {
    console.error('Error: --proxy must be "yes" or "no"');
    console.error('Usage: node setup-reverse-proxy.js --proxy=yes|no --deployment=local|ngrok');
    process.exit(1);
  }

  return { deployment, proxy };
}

// Spawn ngrok and extract the public URL
async function startNgrok(port) {
  console.log(`\nStarting ngrok on port ${port}...`);

  return new Promise((resolve, reject) => {
    // Spawn ngrok process
    const ngrok = spawn('ngrok', ['http', port.toString(), '--log=stdout']);

    let ngrokUrl = null;
    let timeout = setTimeout(() => {
      if (!ngrokUrl) {
        ngrok.kill();
        reject(new Error('Timeout waiting for ngrok URL'));
      }
    }, 10000); // 10 second timeout

    // Parse ngrok output to find the public URL
    ngrok.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[NGROK]', output.trim());

      // Look for the forwarding URL in ngrok output
      // Example: "Forwarding https://abc123.ngrok.io -> http://localhost:8080"
      const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.ngrok\.io/);
      if (urlMatch && !ngrokUrl) {
        ngrokUrl = urlMatch[0];
        clearTimeout(timeout);
        console.log(`\n✓ ngrok URL obtained: ${ngrokUrl}\n`);
        resolve({ url: ngrokUrl, process: ngrok });
      }
    });

    ngrok.stderr.on('data', (data) => {
      console.error('[NGROK ERROR]', data.toString());
    });

    ngrok.on('close', (code) => {
      console.log(`ngrok process exited with code ${code}`);
    });

    ngrok.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Check if a port is active (tries both IPv4 and IPv6)
async function isPortActive(port) {
  // Try IPv4 first
  const ipv4Result = await tryConnect(port, '127.0.0.1');
  if (ipv4Result) {
    return true;
  }

  // If IPv4 fails, try IPv6
  const ipv6Result = await tryConnect(port, '::1');
  return ipv6Result;
}

// Helper function to try connecting to a specific host:port
function tryConnect(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

// Scan all ports and categorize
async function scanAllPorts() {
  console.log('Scanning ports...\n');
  const activeServices = {
    hub: [],  // Changed from null to array - hub can have multiple ports (backend + frontend)
    production: [],
    dev: [],
    devVite: []
  };

  // Check hub (can be on 9000, 10000, or 11000 depending on mode)
  // In dev-vite mode, hub will have TWO ports: backend (10000) + frontend (11000)
  for (const port of PORT_RANGES.hub) {
    if (await isPortActive(port)) {
      console.log(`✓ Hub on port ${port}`);
      activeServices.hub.push(port);
      // Don't break - keep checking for other hub ports
    }
  }
  
  // Check production ports
  for (const port of PORT_RANGES.production) {
    if (await isPortActive(port)) {
      console.log(`✓ Production game on port ${port}`);
      activeServices.production.push(port);
    }
  }
  
  // Check dev ports
  for (const port of PORT_RANGES.dev) {
    if (await isPortActive(port)) {
      console.log(`✓ Dev game on port ${port}`);
      activeServices.dev.push(port);
    }
  }
  
  // Check dev-vite ports
  for (const port of PORT_RANGES.devVite) {
    if (await isPortActive(port)) {
      console.log(`✓ Dev-Vite game on port ${port}`);
      activeServices.devVite.push(port);
    }
  }
  
  return activeServices;
}

// Generate path mappings
function generateMappings(activeServices, baseUrl) {
  const mappings = {
    proxy_port: PROXY_PORT,
    base_url: baseUrl,
    mode: 'proxy',
    created_at: new Date().toISOString(),
    created_by_pid: process.pid,
    routes: {}
  };

  // Hub can have multiple ports (backend: 10000, frontend: 11000)
  activeServices.hub.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: port === 10000 ? 'backend' : 'frontend'
    };
  });

  // Production games (backend only)
  activeServices.production.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: 'backend'
    };
  });

  // Dev games (backend only: 10001+)
  activeServices.dev.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: 'backend'
    };
  });

  // Dev-Vite games (frontend only: 11001+)
  activeServices.devVite.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: 'frontend'
    };
  });

  return mappings;
}

// Create and start the reverse proxy server
function createReverseProxy(mappings) {
  // Helper function to get timestamp with millisecond resolution
  const getTimestamp = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const proxy = httpProxy.createProxyServer({});
  
  // Handle proxy errors
  proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err.message);
    // Check if res is an HTTP response (not a Socket for WebSocket upgrades)
    if (res && typeof res.writeHead === 'function' && !res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Could not connect to upstream server');
    } else if (res && typeof res.destroy === 'function') {
      // For WebSocket upgrades, just destroy the socket
      res.destroy();
    }
  });
  
  const server = http.createServer((req, res) => {
    const url = req.url;
    
    // Find matching route
    let targetPort = null;
    let matchedPath = null;
    
    // Sort routes by length (longest first) to match most specific paths
    const sortedPaths = Object.keys(mappings.routes).sort((a, b) => b.length - a.length);
    
    for (const path of sortedPaths) {
      if (path === '/' && url === '/') {
        targetPort = mappings.routes[path].local_port;
        matchedPath = path;
        break;
      } else if (path !== '/' && url.startsWith(path)) {
        targetPort = mappings.routes[path].local_port;
        matchedPath = path;

        // DO NOT rewrite the URL - pass it through as-is so Vite sees the full path
        // Vite will handle the base path via VITE_BASE_PATH environment variable
        break;
      }
    }
    
    if (targetPort) {
      console.log(`[${getTimestamp()}] ${req.method} ${url} → localhost:${targetPort}${req.url !== url ? ` (rewritten to ${req.url})` : ''}`);
      proxy.web(req, res, {
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      });
    } else {
      console.log(`[${getTimestamp()}] ${req.method} ${url} → 404 (no route found)`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: No route configured for this path');
    }
  });
  
  // Handle WebSocket upgrades (important for Vite HMR and game connections)
  server.on('upgrade', (req, socket, head) => {
    const url = req.url;
    let targetPort = null;
    
    const sortedPaths = Object.keys(mappings.routes).sort((a, b) => b.length - a.length);
    
    for (const path of sortedPaths) {
      if (path === '/' && url === '/') {
        targetPort = mappings.routes[path].local_port;
        break;
      } else if (path !== '/' && url.startsWith(path)) {
        targetPort = mappings.routes[path].local_port;
        // DO NOT rewrite WebSocket URLs - pass through as-is
        break;
      }
    }
    
    if (targetPort) {
      console.log(`[${getTimestamp()}] WebSocket upgrade ${url} → localhost:${targetPort}`);
      proxy.ws(req, socket, head, {
        target: `http://localhost:${targetPort}`,
        ws: true
      });
    } else {
      socket.destroy();
    }
  });
  
  return server;
}

// Save mappings to file
async function saveMappings(mappings) {
  // Write to temporary file first, then atomically rename to prevent partial reads
  const tempFile = './reverse_proxy.json.tmp';
  const finalFile = './reverse_proxy.json';

  await fs.writeFile(tempFile, JSON5.stringify(mappings, null, 2));
  await fs.rename(tempFile, finalFile);
  console.log('\n✓ Mappings saved to reverse_proxy.json');

  // Create human-readable report
  let report = 'REVERSE PROXY MAPPINGS\n';
  report += '=====================\n\n';
  report += `Proxy Port: ${mappings.proxy_port}\n`;
  report += `Base URL: ${mappings.base_url}\n\n`;
  report += 'Routes:\n';
  report += '-------\n';

  for (const [path, config] of Object.entries(mappings.routes)) {
    report += `[PROXY ] ${config.public_url.padEnd(50)} → localhost:${config.local_port} (${config.type})\n`;
  }

  await fs.writeFile('./reverse_proxy_report.txt', report);
  console.log('✓ Report saved to reverse_proxy_report.txt\n');

  // Display the report to console
  console.log(report);
}

// Main execution
async function main() {
  const scriptStartTime = Date.now();

  console.log('=================================');
  console.log('Reverse Proxy Setup');
  console.log(`[T+0.0s | ${new Date(scriptStartTime).toISOString()}] Script launched`);
  console.log('=================================\n');

  // Parse command-line arguments
  const { deployment, proxy } = parseArgs();
  console.log(`Proxy mode: ${proxy}`);
  console.log(`Deployment mode: ${deployment}\n`);

  // If proxy=no, scan ports and create direct mode config file
  if (proxy === 'no') {
    console.log('Proxy disabled - scanning ports and creating direct mode configuration...\n');

    // Step 1: Scan ports (same as proxy mode)
    console.log(`[T+${((Date.now() - scriptStartTime) / 1000).toFixed(3)}s] Starting port scan...`);
    const scanStartTime = Date.now();
    const activeServices = await scanAllPorts();
    const scanEndTime = Date.now();
    const scanElapsed = ((scanEndTime - scanStartTime) / 1000).toFixed(3);

    const totalActive = activeServices.hub.length +
                       activeServices.production.length +
                       activeServices.dev.length +
                       activeServices.devVite.length;

    console.log(`[T+${((Date.now() - scriptStartTime) / 1000).toFixed(3)}s | ${new Date(scanEndTime).toISOString()}] Port scan complete (took ${scanElapsed}s)`);
    console.log(`\nFound ${totalActive} active services in direct mode\n`);

    if (totalActive === 0) {
      console.log('No active services found. Start your servers first!');
      return;
    }

    // Build direct mode config with all detected ports
    const directConfig = {
      proxy_port: null,
      base_url: null,
      mode: 'direct',
      created_at: new Date().toISOString(),
      created_by_pid: process.pid,
      message: 'No reverse proxy configured - running in direct localhost mode',
      routes: {}
    };

    // Add all hub ports (backend: 10000, frontend: 11000)
    activeServices.hub.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: port === 10000 ? 'backend' : 'frontend'
      };
    });

    // Add all production ports (9000+)
    activeServices.production.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: 'backend'
      };
    });

    // Add all dev ports (backend: 10001+)
    activeServices.dev.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: 'backend'
      };
    });

    // Add all dev-vite ports (frontend: 11001+)
    activeServices.devVite.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: 'frontend'
      };
    });

    await saveMappings(directConfig);
    console.log('✓ Direct mode configuration file created\n');

    // Display report
    console.log('Active services (DIRECT mode - no proxy):');
    console.log('==========================================');
    for (const [path, config] of Object.entries(directConfig.routes)) {
      console.log(`  ${config.public_url.padEnd(30)} (${config.type})`);
    }
    console.log('');

    // Generate text report
    let report = 'REVERSE PROXY REPORT (DIRECT MODE)\n';
    report += '==================================\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Mode: DIRECT (no proxy)\n`;
    report += `Total Services: ${totalActive}\n\n`;
    report += 'All services are accessible directly via localhost:\n';
    report += '---------------------------------------------------\n';

    for (const [path, config] of Object.entries(directConfig.routes)) {
      report += `[DIRECT] ${config.public_url.padEnd(30)} (${config.type})\n`;
    }

    await fs.writeFile('./reverse_proxy_report.txt', report);
    console.log('Report saved to: reverse_proxy_report.txt\n');

    console.log('This process will remain active to maintain the config file.');
    console.log('Press Ctrl+C to stop (config file will be cleaned up automatically)\n');

    // Keep process alive indefinitely
    await new Promise(() => {}); // Never resolves
    return;
  }

  // Step 1: Scan ports
  console.log(`[T+${((Date.now() - scriptStartTime) / 1000).toFixed(3)}s] Starting port scan...`);
  const scanStartTime = Date.now();
  const activeServices = await scanAllPorts();
  const scanEndTime = Date.now();
  const scanElapsed = ((scanEndTime - scanStartTime) / 1000).toFixed(3);

  const totalActive = activeServices.hub.length +
                     activeServices.production.length +
                     activeServices.dev.length +
                     activeServices.devVite.length;

  console.log(`[T+${((Date.now() - scriptStartTime) / 1000).toFixed(3)}s | ${new Date(scanEndTime).toISOString()}] Port scan complete (took ${scanElapsed}s)`);
  console.log(`\nFound ${totalActive} active services`);

  if (totalActive === 0) {
    console.log('No active services found. Start your servers first!');
    return;
  }

  // Step 2: Get base URL based on deployment mode
  let baseUrl;
  let ngrokProcess = null;

  if (deployment === 'ngrok') {
    // Start ngrok and get the public URL
    try {
      const ngrokResult = await startNgrok(PROXY_PORT);
      baseUrl = ngrokResult.url;
      ngrokProcess = ngrokResult.process;
    } catch (error) {
      console.error('Failed to start ngrok:', error.message);
      console.log('Falling back to localhost mode');
      baseUrl = `http://localhost:${PROXY_PORT}`;
    }
  } else {
    // Local mode - use localhost
    baseUrl = `http://localhost:${PROXY_PORT}`;
    console.log(`Using local mode: ${baseUrl}`);
  }
  
  // Step 3: Generate mappings
  const mappingsStartTime = Date.now();
  const mappings = generateMappings(activeServices, baseUrl);
  await saveMappings(mappings);
  const mappingsEndTime = Date.now();
  console.log(`[T+${((mappingsEndTime - scriptStartTime) / 1000).toFixed(3)}s | ${new Date(mappingsEndTime).toISOString()}] Mappings generated and saved to reverse_proxy.json`);
  
  // Step 4: Start reverse proxy
  console.log('Starting reverse proxy server...');
  const server = createReverseProxy(mappings);
  
  server.listen(PROXY_PORT, () => {
    console.log(`\n✓ Reverse proxy listening on port ${PROXY_PORT}`);
    console.log('\n=================================');
    console.log('Reverse Proxy is Running!');
    console.log('=================================');

    // Find and display hub URL
    const hubRoute = Object.entries(mappings.routes).find(([_, config]) => config.type === 'hub');
    if (hubRoute) {
      console.log(`\nHub URL: ${hubRoute[1].public_url}`);
    }

    console.log('\nAll routes saved to reverse_proxy.json');
    console.log('Press Ctrl+C to stop\n');
  });
  
  // Cleanup function to remove reverse_proxy files
  const cleanup = () => {
    try {
      if (existsSync('./reverse_proxy.json')) {
        unlinkSync('./reverse_proxy.json');
        console.log('Removed reverse_proxy.json');
      }
      if (existsSync('./reverse_proxy_report.txt')) {
        unlinkSync('./reverse_proxy_report.txt');
        console.log('Removed reverse_proxy_report.txt');
      }
    } catch (error) {
      console.error('Error removing proxy files:', error.message);
    }
  };

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down reverse proxy...');

    // Kill ngrok if it's running
    if (ngrokProcess) {
      console.log('Stopping ngrok...');
      ngrokProcess.kill();
    }

    // Remove proxy info files
    cleanup();

    server.close(() => {
      console.log('Reverse proxy stopped');
      process.exit(0);
    });
  });

  // Also cleanup on any exit
  process.on('exit', cleanup);
}

// Run if executed directly
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(console.error);
}

export { scanAllPorts, generateMappings };