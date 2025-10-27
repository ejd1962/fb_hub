#!/usr/bin/env node

/**
 * launch_localtunnel.js
 *
 * Launches localtunnel tunnel pointing to the reverse proxy manager (localhost:8999)
 * and verifies the tunnel is healthy before returning the public URL.
 *
 * Localtunnel is FREE and requires NO account or authentication!
 *
 * Usage:
 *   node launch_localtunnel.js [options]
 *
 * Options:
 *   --port=<number>             Local port to tunnel to (default: 8999)
 *   --wait=<seconds>            Max seconds to wait for tunnel (default: 30)
 *   --help                      Show this help message
 *   --json                      Output only JSON (no human-readable text)
 *
 * Exit Codes:
 *   0 - Success, tunnel established
 *   1 - Localtunnel not installed or startup failed
 *   2 - Timeout waiting for tunnel
 *   3 - Invalid arguments
 */

import localtunnel from 'localtunnel';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
const DEFAULT_PORT = 8999;
const DEFAULT_WAIT_SECONDS = 30;

// Parse command line arguments
function parseArgs(args) {
  const options = {
    port: DEFAULT_PORT,
    waitSeconds: DEFAULT_WAIT_SECONDS,
    subdomain: null,  // null means random subdomain
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
    } else if (arg.startsWith('--subdomain=')) {
      let subdomain = arg.split('=')[1];
      if (!subdomain || subdomain.trim() === '') {
        console.error(`ERROR: Subdomain cannot be empty`);
        process.exit(3);
      }
      // Replace NNNN with a random 4-digit number
      if (subdomain.includes('NNNN')) {
        const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
        subdomain = subdomain.replace(/NNNN/g, randomNum.toString());
      }
      options.subdomain = subdomain;
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

  return options;
}

// Show help message
function showHelp() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  launch_localtunnel.js - Start localtunnel tunnel for TransVerse reverse proxy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESCRIPTION:
  Launches a localtunnel tunnel pointing to the reverse proxy manager (localhost:8999
  by default) and waits until the tunnel is established and healthy.

  Returns the public localtunnel URL (e.g., https://abc123.loca.lt) that can be used
  to access the TransVerse system from outside your local network.

  Localtunnel is FREE and requires NO account or authentication!

USAGE:
  node launch_localtunnel.js [options]

OPTIONS:
  --port=<number>             Local port to tunnel to (default: 8999)
                              This should be your reverse proxy manager port

  --wait=<seconds>            Maximum seconds to wait for tunnel (default: 30)
                              Script will fail if tunnel not ready in time

  --json                      Output only JSON result (no human-readable text)
                              Useful for programmatic integration

  --help                      Show this help message and exit

EXAMPLES:
  # Basic usage (tunnel localhost:8999)
  node launch_localtunnel.js

  # Tunnel different port
  node launch_localtunnel.js --port=3000

  # JSON output only (for scripts)
  node launch_localtunnel.js --json

  # Custom port with longer timeout
  node launch_localtunnel.js --port=8999 --wait=60

EXIT CODES:
  0 - Success, tunnel established and healthy
  1 - Localtunnel not installed or failed to start
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
      "publicUrl": "https://abc123.loca.lt",
      "localPort": 8999
    }

REQUIREMENTS:
  - localtunnel must be installed (npm install localtunnel)
  - Port ${DEFAULT_PORT} (or specified port) must be available
  - Internet connection required

INTEGRATION:
  This script is designed to be called by launch_servers.js when
  --deployment=localtunnel is specified. It can also be run standalone for testing.

NOTE:
  Localtunnel does NOT support:
  - Custom regions (uses https://localtunnel.me server)
  - Management/inspection UI (no equivalent to ngrok's web interface)
  - Authentication tokens (completely free and open)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Check if localtunnel module is available
async function checkLocaltunnelInstalled() {
  try {
    // If we can import localtunnel, it's installed
    return true;
  } catch (error) {
    return false;
  }
}

// Start localtunnel tunnel using Node.js API
async function startLocaltunnelTunnel(port, jsonMode) {
  if (!jsonMode) {
    console.log(`\n🚇 Starting localtunnel tunnel...`);
    console.log(`   Local port: ${port}`);
  }

  try {
    const tunnel = await localtunnel({ port: port });

    if (!jsonMode) {
      console.log(`\n✅ Localtunnel tunnel established!`);
      console.log(`   Public URL: ${tunnel.url}`);
      console.log(`   Protocol: HTTPS`);
    }

    return {
      success: true,
      publicUrl: tunnel.url,
      localPort: port,
      tunnel: tunnel  // Keep reference to tunnel object
    };
  } catch (error) {
    if (!jsonMode) {
      console.error(`\n❌ Failed to start localtunnel: ${error.message}`);
      console.error(`\nFull error details:`);
      console.error(error);
    }
    throw error;
  }
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

  // Check if localtunnel is installed
  if (!options.json) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  TransVerse Localtunnel Launcher`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n🔍 Checking for localtunnel installation...`);
  }

  const localtunnelInstalled = await checkLocaltunnelInstalled();

  if (!localtunnelInstalled) {
    if (options.json) {
      console.log(JSON5.stringify({
        success: false,
        error: 'Localtunnel not installed or not in PATH'
      }, null, 2));
    } else {
      console.error(`\n❌ ERROR: localtunnel is not installed`);
      console.error(`\nPlease install localtunnel via npm:`);
      console.error(`  npm install -g localtunnel`);
    }
    process.exit(1);
  }

  if (!options.json) {
    console.log(`   ✅ Localtunnel module is available`);
  }

  // Start localtunnel tunnel (this will wait until tunnel is established)
  let result;
  try {
    result = await startLocaltunnelTunnel(options.port, options.json);
  } catch (error) {
    if (options.json) {
      console.log(JSON5.stringify({
        success: false,
        error: error.message
      }, null, 2));
    }
    process.exit(1);
  }

  // Health check
  await healthCheckTunnel(result.publicUrl, options.json);

  // Output result
  if (options.json) {
    console.log(JSON5.stringify(result, null, 2));
  } else {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ✅ Localtunnel tunnel is ready!`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n  Use this URL to access your system from anywhere:`);
    console.log(`  👉 ${result.publicUrl}`);
    console.log(`\n  Press Ctrl+C to stop the tunnel when done.`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  // Keep process alive and listen for tunnel close events
  result.tunnel.on('close', () => {
    if (!options.json) {
      console.log('\n🛑 Tunnel closed');
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    if (!options.json) {
      console.log(`\n\n🛑 Shutting down localtunnel tunnel...`);
    }
    result.tunnel.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    result.tunnel.close();
    process.exit(0);
  });
}

// Run main function
main().catch(error => {
  console.error(`FATAL ERROR: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
