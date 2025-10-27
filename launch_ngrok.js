#!/usr/bin/env node

/**
 * launch_ngrok.js
 *
 * Launches ngrok tunnel pointing to the reverse proxy manager (localhost:8999)
 * and verifies the tunnel is healthy before returning the public URL.
 *
 * Usage:
 *   node launch_ngrok.js [options]
 *
 * Options:
 *   --port=<number>             Local port to tunnel to (default: 8999)
 *   --managementPort=<number>   Ngrok management API port (default: 8998)
 *   --region=<code>             Ngrok region (us, eu, ap, au, sa, jp, in) (default: us)
 *   --wait=<seconds>            Max seconds to wait for tunnel (default: 30)
 *   --help                      Show this help message
 *   --json                      Output only JSON (no human-readable text)
 *
 * Exit Codes:
 *   0 - Success, tunnel established
 *   1 - Ngrok not installed or startup failed
 *   2 - Timeout waiting for tunnel
 *   3 - Invalid arguments
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
const DEFAULT_PORT = 8999;
const DEFAULT_MANAGEMENT_PORT = 8998;
const DEFAULT_REGION = 'us';
const DEFAULT_WAIT_SECONDS = 30;

// Parse command line arguments
function parseArgs(args) {
  const options = {
    port: DEFAULT_PORT,
    managementPort: null, // Will be set to port - 1 if not explicitly provided
    managementPortExplicit: false, // Track if user explicitly set managementPort
    region: DEFAULT_REGION,
    waitSeconds: DEFAULT_WAIT_SECONDS,
    help: false,
    json: false
  };

  for (const arg of args) {
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--port=')) {
      const port = parseInt(arg.split('=')[1]);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(`ERROR: Invalid port number: ${arg.split('=')[1]}`);
        process.exit(3);
      }
      options.port = port;
    } else if (arg.startsWith('--managementPort=')) {
      const port = parseInt(arg.split('=')[1]);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(`ERROR: Invalid management port number: ${arg.split('=')[1]}`);
        process.exit(3);
      }
      options.managementPort = port;
      options.managementPortExplicit = true;
    } else if (arg.startsWith('--region=')) {
      const region = arg.split('=')[1];
      const validRegions = ['us', 'eu', 'ap', 'au', 'sa', 'jp', 'in'];
      if (!validRegions.includes(region)) {
        console.error(`ERROR: Invalid region: ${region}`);
        console.error(`Valid regions: ${validRegions.join(', ')}`);
        process.exit(3);
      }
      options.region = region;
    } else if (arg.startsWith('--wait=')) {
      const wait = parseInt(arg.split('=')[1]);
      if (isNaN(wait) || wait < 1) {
        console.error(`ERROR: Invalid wait time: ${arg.split('=')[1]}`);
        process.exit(3);
      }
      options.waitSeconds = wait;
    } else if (arg.startsWith('--')) {
      console.error(`ERROR: Unknown option: ${arg}`);
      console.error(`Run with --help for usage information`);
      process.exit(3);
    }
  }

  // If managementPort not explicitly set, default to port - 1
  if (!options.managementPortExplicit) {
    options.managementPort = options.port - 1;
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  launch_ngrok.js - Start ngrok tunnel for TransVerse reverse proxy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESCRIPTION:
  Launches an ngrok tunnel pointing to the reverse proxy manager (localhost:8999
  by default) and waits until the tunnel is established and healthy.

  Returns the public ngrok URL (e.g., https://abc123.ngrok.io) that can be used
  to access the TransVerse system from outside your local network.

USAGE:
  node launch_ngrok.js [options]

OPTIONS:
  --port=<number>             Local port to tunnel to (default: 8999)
                              This should be your reverse proxy manager port
                              If set, managementPort implicitly becomes port - 1

  --managementPort=<number>   Ngrok management API port (default: port - 1)
                              Port where ngrok's web interface and API run
                              Defaults to one below tunnel port (8998 for port 8999)
                              Only specify if you need a different management port

  --region=<code>             Ngrok region code (default: us)
                              Valid: us, eu, ap, au, sa, jp, in
                              Choose closest region for best performance

  --wait=<seconds>            Maximum seconds to wait for tunnel (default: 30)
                              Script will fail if tunnel not ready in time

  --json                      Output only JSON result (no human-readable text)
                              Useful for programmatic integration

  --help                      Show this help message and exit

EXAMPLES:
  # Basic usage (tunnel localhost:8999, management on 8998)
  node launch_ngrok.js

  # Tunnel different port with custom management port
  node launch_ngrok.js --port=3000 --managementPort=3001

  # Use Europe region for better latency
  node launch_ngrok.js --region=eu

  # JSON output only (for scripts)
  node launch_ngrok.js --json

  # Custom ports with longer timeout
  node launch_ngrok.js --port=8999 --managementPort=8998 --wait=60

EXIT CODES:
  0 - Success, tunnel established and healthy
  1 - Ngrok not installed or failed to start
  2 - Timeout waiting for tunnel to become ready
  3 - Invalid command line arguments

OUTPUT:
  Human-readable mode:
    - Progress messages showing startup steps
    - Final public URL and connection details
    - Health check results

  JSON mode (--json):
    {
      "success": true,
      "publicUrl": "https://abc123.ngrok.io",
      "localPort": 8999,
      "region": "us",
      "ngrokManagementUrl": "http://localhost:8998"
    }

NGROK MANAGEMENT INTERFACE:
  Ngrok provides a web interface and REST API for monitoring and managing
  tunnels. Access it at the management URL (default: http://localhost:8998)

  Features:
    - Real-time request logs and traffic inspection
    - Tunnel status and configuration
    - Request replay for debugging
    - JSON API at /api/tunnels endpoint

REQUIREMENTS:
  - ngrok must be installed and available in PATH
  - Port ${DEFAULT_PORT} (or specified port) must be available
  - Management port ${DEFAULT_MANAGEMENT_PORT} must be available
  - Internet connection required

INTEGRATION:
  This script is designed to be called by launch_servers.js when
  --deployment=ngrok is specified. It can also be run standalone for testing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Check if ngrok is installed (via npm)
async function checkNgrokInstalled() {
  return new Promise((resolve) => {
    // Try running npx ngrok version (will use installed version if available)
    const check = spawn('npx', ['ngrok', 'version'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    check.stdout.on('data', (data) => {
      output += data.toString();
    });

    check.on('error', () => resolve(false));
    check.on('exit', (code) => {
      // Consider it installed if exit code is 0 and we got version output
      resolve(code === 0 && output.length > 0);
    });
  });
}

// Start ngrok tunnel
function startNgrokTunnel(port, managementPort, region, jsonMode) {
  if (!jsonMode) {
    console.log(`\n🚇 Starting ngrok tunnel...`);
    console.log(`   Local port: ${port}`);
    console.log(`   Management port: ${managementPort}`);
    console.log(`   Region: ${region}`);
  }

  const ngrokProcess = spawn('npx', [
    'ngrok',
    'http',
    port.toString(),
    '--region', region,
    '--log=stdout',
    `--web-addr=localhost:${managementPort}`
  ], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Log ngrok output in non-JSON mode
  if (!jsonMode) {
    ngrokProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`   [ngrok] ${line.trim()}`);
        }
      }
    });

    ngrokProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.error(`   [ngrok ERROR] ${line.trim()}`);
        }
      }
    });
  }

  ngrokProcess.on('error', (err) => {
    if (!jsonMode) {
      console.error(`\n❌ Failed to start ngrok: ${err.message}`);
    }
    process.exit(1);
  });

  ngrokProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      if (!jsonMode) {
        console.error(`\n❌ Ngrok exited with code ${code}`);
      }
      process.exit(1);
    }
  });

  return ngrokProcess;
}

// Wait for ngrok API to be ready and fetch tunnel info
async function waitForNgrokTunnel(managementPort, waitSeconds, jsonMode) {
  const startTime = Date.now();
  const maxWaitMs = waitSeconds * 1000;

  if (!jsonMode) {
    console.log(`\n⏳ Waiting for ngrok tunnel to establish...`);
  }

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`http://localhost:${managementPort}/api/tunnels`);

      if (response.ok) {
        const text = await response.text();
        const data = JSON5.parse(text);

        if (data.tunnels && data.tunnels.length > 0) {
          // Find the HTTPS tunnel
          const httpsTunnel = data.tunnels.find(t => t.proto === 'https');

          if (httpsTunnel) {
            const publicUrl = httpsTunnel.public_url;

            if (!jsonMode) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`\n✅ Ngrok tunnel established! (${elapsed}s)`);
              console.log(`   Public URL: ${publicUrl}`);
              console.log(`   Protocol: HTTPS`);
              console.log(`   Management: http://localhost:${managementPort}`);
            }

            return {
              success: true,
              publicUrl: publicUrl,
              localPort: data.tunnels[0].config.addr.split(':')[1] || 'unknown',
              region: data.tunnels[0].region || 'unknown',
              ngrokManagementUrl: `http://localhost:${managementPort}`
            };
          }
        }
      }
    } catch (error) {
      // Tunnel not ready yet, continue waiting
    }

    // Wait 1 second before next check
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (!jsonMode && (Date.now() - startTime) % 5000 < 1000) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(`\r   Waiting... ${elapsed}s`);
    }
  }

  // Timeout
  if (!jsonMode) {
    console.error(`\n\n❌ Timeout: Ngrok tunnel did not become ready within ${waitSeconds} seconds`);
  }
  return {
    success: false,
    error: 'Timeout waiting for tunnel',
    waitSeconds: waitSeconds
  };
}

// Perform health check on the tunnel
async function healthCheckTunnel(publicUrl, jsonMode) {
  if (!jsonMode) {
    console.log(`\n🏥 Performing health check...`);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(publicUrl, {
      signal: controller.signal,
      method: 'HEAD'
    });

    clearTimeout(timeoutId);

    if (!jsonMode) {
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   ✅ Tunnel is healthy and responding`);
    }

    return true;
  } catch (error) {
    if (!jsonMode) {
      console.warn(`   ⚠️  Health check failed: ${error.message}`);
      console.warn(`   (This may be normal if reverse proxy is not running yet)`);
    }
    return false;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Check if ngrok is installed
  if (!options.json) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  TransVerse Ngrok Launcher`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n🔍 Checking for ngrok installation...`);
  }

  const ngrokInstalled = await checkNgrokInstalled();

  if (!ngrokInstalled) {
    if (options.json) {
      console.log(JSON5.stringify({
        success: false,
        error: 'Ngrok not installed or not in PATH'
      }, null, 2));
    } else {
      console.error(`\n❌ ERROR: ngrok is not installed`);
      console.error(`\nPlease install ngrok via npm:`);
      console.error(`  npm install -g ngrok`);
    }
    process.exit(1);
  }

  if (!options.json) {
    console.log(`   ✅ Ngrok is installed`);
  }

  // Start ngrok tunnel
  const ngrokProcess = startNgrokTunnel(options.port, options.managementPort, options.region, options.json);

  // Wait for tunnel to be ready
  const result = await waitForNgrokTunnel(options.managementPort, options.waitSeconds, options.json);

  if (!result.success) {
    if (options.json) {
      console.log(JSON5.stringify(result, null, 2));
    }
    ngrokProcess.kill();
    process.exit(2);
  }

  // Health check
  await healthCheckTunnel(result.publicUrl, options.json);

  // Output result
  if (options.json) {
    console.log(JSON5.stringify(result, null, 2));
  } else {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ✅ Ngrok tunnel is ready!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n  Use this URL to access your system from anywhere:`);
    console.log(`  👉 ${result.publicUrl}`);
    console.log(`\n  Ngrok management interface:`);
    console.log(`  👉 ${result.ngrokManagementUrl}`);
    console.log(`\n  Press Ctrl+C to stop the tunnel when done.`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  // Keep process alive
  process.on('SIGINT', () => {
    if (!options.json) {
      console.log(`\n\n🛑 Shutting down ngrok tunnel...`);
    }
    ngrokProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    ngrokProcess.kill();
    process.exit(0);
  });
}

// Run main function
main().catch(error => {
  console.error(`FATAL ERROR: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
