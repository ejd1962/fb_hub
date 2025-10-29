import http from 'http';
import httpProxy from 'http-proxy';
import net from 'net';
import { promises as fs, existsSync, unlinkSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load TransVerse platform configuration
const configPath = join(__dirname, '..', 'transverse_configs.json');
const transverseConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
const DEFAULT_SERVER_SETUP_DELAY = transverseConfig.server_setup_delay;
const PROXY_PORT_FROM_CONFIG = transverseConfig.proxy_port;

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

const PROXY_PORT = PROXY_PORT_FROM_CONFIG; // The single port we'll expose externally (via localtunnel or localhost)

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const deploymentArg = args.find(arg => arg.startsWith('--deployment='))?.split('=')[1] || 'direct';
  const serverSetupDelayArg = args.find(arg => arg.startsWith('--server_setup_delay='))?.split('=')[1];
  const serverSetupDelay = serverSetupDelayArg ? parseInt(serverSetupDelayArg, 10) : DEFAULT_SERVER_SETUP_DELAY;

  // Parse deployment and extract residence if portforward:RESIDENCE format
  let deployment = deploymentArg;
  let residence = null;

  if (deploymentArg.startsWith('portforward:')) {
    deployment = 'portforward';
    residence = deploymentArg.split(':')[1];
    if (!residence) {
      console.error('Error: --deployment=portforward:RESIDENCE requires a residence name');
      console.error('Example: --deployment=portforward:erics_cottage');
      process.exit(1);
    }
  }

  if (!['direct', 'localproxy', 'ngrok', 'localtunnel', 'portforward'].includes(deployment)) {
    console.error('Error: --deployment must be "direct", "localproxy", "ngrok", "localtunnel", or "portforward:RESIDENCE"');
    console.error('Usage: node launch_proxy.js --deployment=direct|localproxy|ngrok|localtunnel|portforward:RESIDENCE --server_setup_delay=NN');
    process.exit(1);
  }

  if (isNaN(serverSetupDelay) || serverSetupDelay < 0) {
    console.error('Error: --server_setup_delay must be a non-negative number');
    process.exit(1);
  }

  return { deployment, residence, serverSetupDelay };
}


/**
 * Load portforward configuration via launch_portforward.js
 */
async function loadPortforwardConfig(residence) {
  console.log(`\nLoading port forwarding configuration for residence: ${residence}...`);

  return new Promise((resolve, reject) => {
    const pf = spawn('node', [
      'launch_portforward.js',
      `--residence=${residence}`,
      '--json'
    ]);

    let outputBuffer = '';

    pf.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    pf.stderr.on('data', (data) => {
      console.error(`Port forward error: ${data.toString()}`);
    });

    pf.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to load port forward config (exit code: ${code})`));
        return;
      }

      try {
        const result = JSON5.parse(outputBuffer);
        if (result.success && result.publicUrl) {
          console.log(`Port forward URL loaded: ${result.publicUrl}`);
          resolve({ url: result.publicUrl });
        } else {
          reject(new Error(result.error || 'Unknown error loading port forward config'));
        }
      } catch (e) {
        reject(new Error(`Failed to parse port forward config: ${e.message}`));
      }
    });
  });
}

/**
 * Launch ngrok tunnel by calling launch_ngrok.js
 */
async function launchNgrok(port) {
  console.log(`\nLaunching ngrok tunnel for port ${port}...`);

  return new Promise((resolve, reject) => {
    const ngrok = spawn('node', [
      'launch_ngrok.js',
      `--port=${port}`,
      '--json'
    ]);

    let outputBuffer = '';

    ngrok.stdout.on('data', (data) => {
      outputBuffer += data.toString();
    });

    ngrok.stderr.on('data', (data) => {
      console.error(`Ngrok error: ${data.toString()}`);
    });

    ngrok.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to launch ngrok (exit code: ${code})`));
        return;
      }

      try {
        const result = JSON5.parse(outputBuffer);
        if (result.success && result.publicUrl) {
          console.log(`Ngrok URL established: ${result.publicUrl}`);
          resolve({ url: result.publicUrl, password: null });
        } else {
          reject(new Error(result.error || 'Unknown error launching ngrok'));
        }
      } catch (e) {
        reject(new Error(`Failed to parse ngrok output: ${e.message}`));
      }
    });
  });
}

// Spawn localtunnel via launch_localtunnel.js and extract the public URL
async function startLocaltunnel(port, timeoutSeconds = 10) {
  console.log(`\nStarting localtunnel on port ${port}...`);
  console.log(`   Timeout: ${timeoutSeconds} seconds`);

  return new Promise((resolve, reject) => {
    // Spawn launch_localtunnel.js process with JSON output
    const lt = spawn('node', [
      'launch_localtunnel.js',
      `--port=${port}`,
      '--subdomain=transverse',
      '--subdomain_retry=transverse-NNNN',
      '--json'
    ]);

    let ltUrl = null;
    let outputBuffer = '';
    let timeout = setTimeout(() => {
      if (!ltUrl) {
        lt.kill();
        reject(new Error(`Timeout waiting for localtunnel URL (${timeoutSeconds}s)`));
      }
    }, timeoutSeconds * 1000); // Convert seconds to milliseconds

    // Parse localtunnel output to find the public URL
    lt.stdout.on('data', (data) => {
      outputBuffer += data.toString();

      // Try to parse complete JSON object
      try {
        const result = JSON5.parse(outputBuffer);
        if (result.success && result.publicUrl && !ltUrl) {
          ltUrl = result.publicUrl;
          clearTimeout(timeout);
          console.log(`\n✓ localtunnel URL obtained: ${ltUrl}`);
          if (result.tunnelPassword) {
            console.log(`Tunnel password obtained: ${result.tunnelPassword}`);
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(``);
            console.log(`SHARE WITH USERS:`);
            console.log(`URL:      ${ltUrl}`);
            console.log(`Password: ${result.tunnelPassword}`);
            console.log(`(First-time visitors need password - once per IP per 7 days)`);
            console.log(``);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
          } else {
            console.log();
          }
          resolve({ url: ltUrl, password: result.tunnelPassword, process: lt });
        } else if (!result.success) {
          clearTimeout(timeout);
          lt.kill();
          reject(new Error(`Localtunnel failed: ${result.error}`));
        }
      } catch (e) {
        // Not complete JSON yet, keep buffering
      }
    });

    lt.stderr.on('data', (data) => {
      console.error('[LOCALTUNNEL ERROR]', data.toString());
    });

    lt.on('close', (code) => {
      console.log(`localtunnel process exited with code ${code}`);
    });

    lt.on('error', (err) => {
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

// Helper function to determine port context
function getPortContext(port) {
  const isHub = port.toString().endsWith('000'); // 9000, 10000, 11000
  const appType = isHub ? 'hub' : 'app';

  let tier, serverType;

  if (port >= 11000 && port <= 11999) {
    tier = 'dev-vite';
    serverType = 'frontend';
  } else if (port >= 10000 && port <= 10999) {
    tier = 'dev';
    serverType = 'backend';
  } else if (port >= 9000 && port <= 9999) {
    tier = 'prod';
    serverType = 'backend';
  }

  return { appType, tier, serverType };
}

// Generate path mappings
function generateMappings(activeServices, baseUrl, tunnelPassword = null) {
  const mappings = {
    proxy_port: PROXY_PORT,
    base_url: baseUrl,
    mode: baseUrl === null ? 'direct' : 'proxy',  // direct mode if no baseUrl
    created_at: new Date().toISOString(),
    created_by_pid: process.pid,
    tunnel_password: tunnelPassword,  // Add tunnel password if using localtunnel
    routes: {}
  };

  // Hub can have multiple ports (backend: 10000, frontend: 11000)
  activeServices.hub.forEach(port => {
    const path = `/localhost_${port}`;
    const context = getPortContext(port);
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: context.serverType,
      app_type: context.appType,
      tier: context.tier
    };
  });

  // Production apps (backend only)
  activeServices.production.forEach(port => {
    const path = `/localhost_${port}`;
    const context = getPortContext(port);
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: context.serverType,
      app_type: context.appType,
      tier: context.tier
    };
  });

  // Dev apps (backend only: 10001+)
  activeServices.dev.forEach(port => {
    const path = `/localhost_${port}`;
    const context = getPortContext(port);
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: context.serverType,
      app_type: context.appType,
      tier: context.tier
    };
  });

  // Dev-Vite apps (frontend only: 11001+)
  activeServices.devVite.forEach(port => {
    const path = `/localhost_${port}`;
    const context = getPortContext(port);
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      mode: 'proxy',
      type: context.serverType,
      app_type: context.appType,
      tier: context.tier
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
    const serverType = config.type.padEnd(8); // "backend " or "frontend"
    const details = `${serverType} -- ${config.app_type} -- ${config.tier}`;
    report += `[PROXY ] ${config.public_url.padEnd(50)} → localhost:${config.local_port} (${details})\n`;
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
  const { deployment, residence, serverSetupDelay } = parseArgs();
  console.log(`Deployment mode: ${deployment}`);
  console.log(`Server setup delay: ${serverSetupDelay} seconds\n`);

  // If deployment=direct, scan ports and create direct mode config file
  if (deployment === 'direct') {
    // Step 1: Wait for servers to initialize
    if (serverSetupDelay > 0) {
      console.log(`Waiting ${serverSetupDelay} seconds for servers to initialize...`);
      await new Promise(resolve => setTimeout(resolve, serverSetupDelay * 1000));
      console.log('Server setup delay complete\n');
    }

    console.log('Proxy disabled - scanning ports and creating direct mode configuration...\n');

    // Step 2: Scan ports (after delay)
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
      const context = getPortContext(port);
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: context.serverType,
        app_type: context.appType,
        tier: context.tier
      };
    });

    // Add all production ports (9000+)
    activeServices.production.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      const context = getPortContext(port);
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: context.serverType,
        app_type: context.appType,
        tier: context.tier
      };
    });

    // Add all dev ports (backend: 10001+)
    activeServices.dev.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      const context = getPortContext(port);
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: context.serverType,
        app_type: context.appType,
        tier: context.tier
      };
    });

    // Add all dev-vite ports (frontend: 11001+)
    activeServices.devVite.forEach(port => {
      const path = `/localhost_${port}`;
      const publicUrl = `http://localhost:${port}`;
      const context = getPortContext(port);
      directConfig.routes[path] = {
        local_port: port,
        public_url: publicUrl,
        mode: 'direct',
        type: context.serverType,
        app_type: context.appType,
        tier: context.tier
      };
    });

    await saveMappings(directConfig);
    console.log('✓ Direct mode configuration file created\n');

    // Display report
    console.log('Active services (DIRECT mode - no proxy):');
    console.log('==========================================');
    for (const [path, config] of Object.entries(directConfig.routes)) {
      const serverType = config.type.padEnd(8); // "backend " or "frontend"
      const details = `${serverType} -- ${config.app_type} -- ${config.tier}`;
      console.log(`  ${config.public_url.padEnd(30)} (${details})`);
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
      const serverType = config.type.padEnd(8); // "backend " or "frontend"
      const details = `${serverType} -- ${config.app_type} -- ${config.tier}`;
      report += `[DIRECT] ${config.public_url.padEnd(30)} (${details})\n`;
    }

    await fs.writeFile('./reverse_proxy_report.txt', report);
    console.log('Report saved to: reverse_proxy_report.txt\n');

    console.log('This process will remain active to maintain the config file.');
    console.log('Press Ctrl+C to stop (config file will be cleaned up automatically)\n');

    // Keep process alive indefinitely
    await new Promise(() => {}); // Never resolves
    return;
  }

  // Step 1: Start tunnel/load config (if needed) and sleep for server initialization IN PARALLEL
  let baseUrl;
  let tunnelProcess = null;
  let tunnelPassword = null;

  if (deployment === 'localtunnel') {
    // Start localtunnel AND sleep in parallel
    try {
      const [tunnelResult] = await Promise.all([
        startLocaltunnel(PROXY_PORT, serverSetupDelay),
        (async () => {
          if (serverSetupDelay > 0) {
            console.log(`Waiting ${serverSetupDelay} seconds for servers to initialize...`);
            await new Promise(resolve => setTimeout(resolve, serverSetupDelay * 1000));
            console.log('Server setup delay complete\n');
          }
        })()
      ]);
      baseUrl = tunnelResult.url;
      tunnelProcess = tunnelResult.process;
      tunnelPassword = tunnelResult.password;
    } catch (error) {
      // FATAL ERROR - localtunnel is required when deployment=localtunnel
      console.error('\n' + '='.repeat(80));
      console.error('FATAL ERROR: Failed to start localtunnel');
      console.error('='.repeat(80));
      console.error(`Error: ${error.message}`);
      console.error(`Deployment mode: ${deployment}`);
      console.error(`Timeout: ${serverSetupDelay} seconds`);
      console.error('\nLocaltunnel is REQUIRED when --deployment=localtunnel is specified.');
      console.error('This is a hard failure - cannot continue without tunnel.');
      console.error('\nPossible causes:');
      console.error('  - Internet connection issues');
      console.error('  - Localtunnel service is down');
      console.error('  - Timeout too short (increase --server_setup_delay)');
      console.error('  - Port 8999 is not available');
      console.error('='.repeat(80) + '\n');
      process.exit(1);
    }
  } else if (deployment === 'ngrok') {
    // Start ngrok AND sleep in parallel
    try {
      const [ngrokResult] = await Promise.all([
        launchNgrok(PROXY_PORT),
        (async () => {
          if (serverSetupDelay > 0) {
            console.log(`Waiting ${serverSetupDelay} seconds for servers to initialize...`);
            await new Promise(resolve => setTimeout(resolve, serverSetupDelay * 1000));
            console.log('Server setup delay complete\n');
          }
        })()
      ]);
      baseUrl = ngrokResult.url;
      tunnelPassword = ngrokResult.password || null;

      console.log('\n' + '━'.repeat(80));
      console.log('');
      console.log('NGROK TUNNEL ACTIVE');
      console.log('');
      console.log(`Public URL: ${baseUrl}`);
      console.log('');
      console.log('━'.repeat(80) + '\n');

    } catch (error) {
      // FATAL ERROR - ngrok is required when deployment=ngrok
      console.error('\n' + '='.repeat(80));
      console.error('FATAL ERROR: Failed to start ngrok tunnel');
      console.error('='.repeat(80));
      console.error(`Error: ${error.message}`);
      console.error(`Deployment mode: ${deployment}`);
      console.error('\nNgrok tunnel is REQUIRED when --deployment=ngrok is specified.');
      console.error('This is a hard failure - cannot continue without tunnel.');
      console.error('\nPossible causes:');
      console.error('  - Ngrok authtoken not configured (check ngrok_authtoken.txt)');
      console.error('  - Internet connection issues');
      console.error('  - Port 8999 is not available');
      console.error('  - Existing ngrok tunnel already running');
      console.error('\nTo fix:');
      console.error('  1. Get authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.error('  2. Save it to ngrok_authtoken.txt in this directory');
      console.error('  3. Kill any existing ngrok processes');
      console.error('  4. Try again');
      console.error('='.repeat(80) + '\n');
      process.exit(1);
    }
  } else if (deployment === 'portforward') {
    // Load port forwarding configuration
    try {
      const pfResult = await loadPortforwardConfig(residence);
      baseUrl = pfResult.url;

      console.log('\n' + '━'.repeat(80));
      console.log('');
      console.log('PORT FORWARDING MODE ACTIVE');
      console.log('');
      console.log(`Public URL: ${baseUrl}`);
      console.log(`Residence: ${residence}`);
      console.log('');
      console.log('IMPORTANT: Ensure your router has port forwarding configured:');
      console.log(`  External Port ${PROXY_PORT} -> Your local machine port ${PROXY_PORT}`);
      console.log('');
      console.log('━'.repeat(80) + '\n');

      // Still need to wait for servers
      if (serverSetupDelay > 0) {
        console.log(`Waiting ${serverSetupDelay} seconds for servers to initialize...`);
        await new Promise(resolve => setTimeout(resolve, serverSetupDelay * 1000));
        console.log('Server setup delay complete\n');
      }
    } catch (error) {
      // FATAL ERROR - port forward config is required
      console.error('\n' + '='.repeat(80));
      console.error('FATAL ERROR: Failed to load port forward configuration');
      console.error('='.repeat(80));
      console.error(`Error: ${error.message}`);
      console.error(`Residence: ${residence}`);
      console.error('\nPort forwarding configuration is REQUIRED when --deployment=portforward:RESIDENCE is specified.');
      console.error('\nTo fix:');
      console.error(`  1. Run: node get-public-ip.js --residence=${residence}`);
      console.error(`  2. Configure port forwarding on your router`);
      console.error(`  3. Try again`);
      console.error('='.repeat(80) + '\n');
      process.exit(1);
    }
  } else if (deployment === 'localproxy') {
    // Local proxy mode - use localhost proxy
    baseUrl = `http://localhost:${PROXY_PORT}`;
    console.log(`Using local proxy mode: ${baseUrl}`);

    // Still need to wait for servers in local proxy mode
    if (serverSetupDelay > 0) {
      console.log(`Waiting ${serverSetupDelay} seconds for servers to initialize...`);
      await new Promise(resolve => setTimeout(resolve, serverSetupDelay * 1000));
      console.log('Server setup delay complete\n');
    }
  } else if (deployment === 'direct') {
    // Direct mode - no proxy, servers accessed directly
    baseUrl = null; // No proxy URL in direct mode
    console.log('Using direct mode: servers accessed directly at their own ports');

    // Still need to wait for servers in direct mode
    if (serverSetupDelay > 0) {
      console.log(`Waiting ${serverSetupDelay} seconds for servers to initialize...`);
      await new Promise(resolve => setTimeout(resolve, serverSetupDelay * 1000));
      console.log('Server setup delay complete\n');
    }
  } else {
    // Fallback error (should never reach here due to validation)
    console.error(`ERROR: Unknown deployment mode: ${deployment}`);
    process.exit(1);
  }

  // Step 2: Scan ports (after delay and localtunnel are both complete)
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

  // Step 4: Generate mappings
  const mappingsStartTime = Date.now();
  const mappings = generateMappings(activeServices, baseUrl, tunnelPassword);
  await saveMappings(mappings);
  const mappingsEndTime = Date.now();
  console.log(`[T+${((mappingsEndTime - scriptStartTime) / 1000).toFixed(3)}s | ${new Date(mappingsEndTime).toISOString()}] Mappings generated and saved to reverse_proxy.json`);

  // Step 5: Start reverse proxy
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

    // Kill tunnel process if it's running
    if (tunnelProcess) {
      console.log('Stopping localtunnel...');
      tunnelProcess.kill();
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
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  main().catch(console.error);
}

export { scanAllPorts, generateMappings };