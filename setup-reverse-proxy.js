const http = require('http');
const httpProxy = require('http-proxy');
const net = require('net');
const fs = require('fs').promises;

const num_ports = 5;  // number of ports in each range that might need proxies

// Define your port ranges
const PORT_RANGES = {
  hub: [5173],
  production: Array.from({length: num_ports}, (_, i) => 9000 + i),
  dev: Array.from({length: num_ports}, (_, i) => 10000 + i),
  devVite: Array.from({length: num_ports}, (_, i) => 11000 + i)
};

const PROXY_PORT = 8080; // The single port we'll expose via ngrok

// Check if a port is active
async function isPortActive(port) {
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
    
    socket.connect(port, '127.0.0.1');
  });
}

// Scan all ports and categorize
async function scanAllPorts() {
  console.log('Scanning ports...\n');
  const activeServices = {
    hub: null,
    production: [],
    dev: [],
    devVite: []
  };
  
  // Check hub
  if (await isPortActive(PORT_RANGES.hub[0])) {
    console.log(`✓ Hub on port ${PORT_RANGES.hub[0]}`);
    activeServices.hub = PORT_RANGES.hub[0];
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
    routes: {}
  };
  
  // Hub always at root
  if (activeServices.hub) {
    mappings.routes['/'] = {
      local_port: activeServices.hub,
      public_url: baseUrl,
      type: 'hub'
    };
  }
  
  // Production games
  activeServices.production.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      type: 'production'
    };
  });

  // Dev games
  activeServices.dev.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      type: 'dev'
    };
  });

  // Dev-Vite games
  activeServices.devVite.forEach(port => {
    const path = `/localhost_${port}`;
    mappings.routes[path] = {
      local_port: port,
      public_url: `${baseUrl}${path}`,
      type: 'dev-vite'
    };
  });
  
  return mappings;
}

// Create and start the reverse proxy server
function createReverseProxy(mappings) {
  const proxy = httpProxy.createProxyServer({});
  
  // Handle proxy errors
  proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Could not connect to upstream server');
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
        
        // Rewrite the URL to remove the path prefix
        const newUrl = url.substring(path.length) || '/';
        req.url = newUrl;
        break;
      }
    }
    
    if (targetPort) {
      console.log(`${req.method} ${url} → localhost:${targetPort}${req.url !== url ? ` (rewritten to ${req.url})` : ''}`);
      proxy.web(req, res, { 
        target: `http://localhost:${targetPort}`,
        changeOrigin: true
      });
    } else {
      console.log(`${req.method} ${url} → 404 (no route found)`);
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
        req.url = url.substring(path.length) || '/';
        break;
      }
    }
    
    if (targetPort) {
      console.log(`WebSocket upgrade ${url} → localhost:${targetPort}`);
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
  await fs.writeFile('./reverse_proxy.json', JSON.stringify(mappings, null, 2));
  console.log('\n✓ Mappings saved to reverse_proxy.json');
  
  // Create human-readable report
  let report = 'REVERSE PROXY MAPPINGS\n';
  report += '=====================\n\n';
  report += `Proxy Port: ${mappings.proxy_port}\n`;
  report += `Base URL: ${mappings.base_url}\n\n`;
  report += 'Routes:\n';
  report += '-------\n';
  
  for (const [path, config] of Object.entries(mappings.routes)) {
    report += `${config.public_url.padEnd(50)} → localhost:${config.local_port} (${config.type})\n`;
  }
  
  await fs.writeFile('./reverse_proxy_report.txt', report);
  console.log('✓ Report saved to reverse_proxy_report.txt\n');
}

// Main execution
async function main() {
  console.log('=================================');
  console.log('Reverse Proxy Setup');
  console.log('=================================\n');
  
  // Step 1: Scan ports
  const activeServices = await scanAllPorts();
  
  const totalActive = (activeServices.hub ? 1 : 0) + 
                     activeServices.production.length + 
                     activeServices.dev.length + 
                     activeServices.devVite.length;
  
  console.log(`\nFound ${totalActive} active services`);
  
  if (totalActive === 0) {
    console.log('No active services found. Start your servers first!');
    return;
  }
  
  // Step 2: Get ngrok URL (or use placeholder)
  console.log('\nTo complete setup:');
  console.log(`1. This script will start a reverse proxy on port ${PROXY_PORT}`);
  console.log(`2. Run: ngrok http ${PROXY_PORT}`);
  console.log('3. Enter your ngrok URL below (or press Enter to use localhost for testing)\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const baseUrl = await new Promise(resolve => {
    readline.question('Enter ngrok URL (e.g., https://abc123.ngrok.io) or press Enter for localhost: ', answer => {
      readline.close();
      resolve(answer.trim() || `http://localhost:${PROXY_PORT}`);
    });
  });
  
  // Step 3: Generate mappings
  const mappings = generateMappings(activeServices, baseUrl);
  await saveMappings(mappings);
  
  // Step 4: Start reverse proxy
  console.log('Starting reverse proxy server...');
  const server = createReverseProxy(mappings);
  
  server.listen(PROXY_PORT, () => {
    console.log(`\n✓ Reverse proxy listening on port ${PROXY_PORT}`);
    console.log('\n=================================');
    console.log('Reverse Proxy is Running!');
    console.log('=================================');
    console.log(`\nHub URL: ${mappings.routes['/'].public_url}`);
    console.log('\nPress Ctrl+C to stop\n');
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down reverse proxy...');
    server.close(() => {
      console.log('Reverse proxy stopped');
      process.exit(0);
    });
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { scanAllPorts, generateMappings };