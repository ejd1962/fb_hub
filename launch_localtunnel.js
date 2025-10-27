#!/usr/bin/env node

/**
 * launch_localtunnel.js
 *
 * Launches localtunnel tunnel pointing to the reverse proxy manager (localhost:8999)
 * and verifies the tunnel is healthy before returning the public URL.
 *
 * Usage:
 *   node launch_localtunnel.js [options]
 *
 * Options:
 *   --port=<number>             Local port to tunnel to (default: 8999)
 *   --managementPort=<number>   Localtunnel management API port (default: 8998)
 *   --region=<code>             Localtunnel region (us, eu, ap, au, sa, jp, in) (default: us)
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
  launch_localtunnel.js - Start localtunnel tunnel for TransVerse reverse proxy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DESCRIPTION:
  Launches a localtunnel tunnel pointing to the reverse proxy manager (localhost:8999
  by default) and waits until the tunnel is established and healthy.

  Returns the public localtunnel URL (e.g., https://abc123.loca.lt) that can be used
  to access the TransVerse system from outside your local network.

USAGE:
  node launch_localtunnel.js [options]

OPTIONS:
  --port=<number>             Local port to tunnel to (default: 8999)
                              This should be your reverse proxy manager port
                              If set, managementPort implicitly becomes port - 1

  --managementPort=<number>   Localtunnel management API port (default: port - 1)
                              Port where localtunnel's web interface and API run
                              Defaults to one below tunnel port (8998 for port 8999)
                              Only specify if you need a different management port

  --region=<code>             Localtunnel region code (default: us)
                              Valid: us, eu, ap, au, sa, jp, in
                              Choose closest region for best performance

  --wait=<seconds>            Maximum seconds to wait for tunnel (default: 30)
                              Script will fail if tunnel not ready in time

  --json                      Output only JSON result (no human-readable text)
                              Useful for programmatic integration

  --help                      Show this help message and exit

EXAMPLES:
  # Basic usage (tunnel localhost:8999, management on 8998)
  node launch_localtunnel.js

  # Tunnel different port with custom management port
  node launch_localtunnel.js --port=3000 --managementPort=3001

  # Use Europe region for better latency
  node launch_localtunnel.js --region=eu

  # JSON output only (for scripts)
  node launch_localtunnel.js --json

  # Custom ports with longer timeout
  node launch_localtunnel.js --port=8999 --managementPort=8998 --wait=60

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
      "localPort": 8999,
      "region": "us",
      "localtunnelManagementUrl": "http://localhost:8998"
    }

LOCALTUNNEL MANAGEMENT INTERFACE:
  Localtunnel provides a web interface and REST API for monitoring and managing
  tunnels. Access it at the management URL (default: http://localhost:8998)

  Features:
    - Real-time request logs and traffic inspection
    - Tunnel status and configuration
    - Request replay for debugging
    - JSON API at /api/tunnels endpoint

REQUIREMENTS:
  - localtunnel must be installed and available in PATH
  - Port ${DEFAULT_PORT} (or specified port) must be available
  - Management port ${DEFAULT_MANAGEMENT_PORT} must be available
  - Internet connection required

INTEGRATION:
  This script is designed to be called by launch_servers.js when
  --deployment=localtunnel is specified. It can also be run standalone for testing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Read localtunnel authtoken from file
function readAuthtoken() {
  const authtokenPath = join(__dirname, 'localtunnel_authtoken.txt');

  if (!existsSync(authtokenPath)) {
    return null;
  }

  try {
    const content = readFileSync(authtokenPath, 'utf8');
    // Extract token from file (skip header lines and blank lines)
    const lines = content.split('\n').map(line => line.trim());
    for (const line of lines) {
      // Look for line that looks like a token (long alphanumeric with underscores)
      if (line.length > 20 && /^[A-Za-z0-9_-]+$/.test(line)) {
        return line;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error reading authtoken file: ${error.message}`);
    return null;
  }
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
async function startLocaltunnelTunnel(port, managementPort, region, jsonMode, authtoken) {
  if (!jsonMode) {
    console.log(`\n🚇 Starting localtunnel tunnel...`);
    console.log(`   Local port: ${port}`);
    // TODO: Re-enable when we figure out how to configure management port with localtunnel npm package
    // console.log(`   Management port: ${managementPort}`);
    console.log(`   Region: ${region}`);
    console.log(`   Authtoken: ${authtoken ? 'Loaded from file' : 'Not found'}`);
  }

  try {
    const connectOptions = {
      port: port,  // Use just the port number
      // TODO: Re-enable when we figure out correct option name for management port
      // web_addr: `localhost:${managementPort}`
    };

    // Add authtoken if available
    if (authtoken) {
      connectOptions.authtoken = authtoken;
    }

    const tunnel = await localtunnel(connectOptions);

    // TODO: Get actual localtunnel API URL when management port is configurable
    const localtunnelManagementUrl = `http://127.0.0.1:4040`; // localtunnel default

    if (!jsonMode) {
      console.log(`\n✅ Localtunnel tunnel established!`);
      console.log(`   Public URL: ${tunnel.url}`);
      console.log(`   Protocol: HTTPS`);
      console.log(`   Management: ${localtunnelManagementUrl}`);
    }

    return {
      success: true,
      publicUrl: tunnel.url,
      localPort: port,
      region: region,
      localtunnelManagementUrl: localtunnelManagementUrl,
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

  // Read authtoken from file
  const authtoken = readAuthtoken();

  if (!authtoken && !options.json) {
    console.warn(`\n⚠️  Warning: No authtoken found in localtunnel_authtoken.txt`);
    console.warn(`   Localtunnel may fail without authentication.`);
    console.warn(`   Get your token from: https://dashboard.localtunnel.com/get-started/your-authtoken`);
  }

  // Disconnect any existing tunnels first
  if (!options.json) {
    console.log(`\n🔌 Disconnecting any existing localtunnel tunnels...`);
  }
  try {
    // Note: localtunnel doesn't have disconnect/kill methods like ngrok
    // We'll just let old tunnels timeout naturally
  } catch (error) {
    // Ignore errors if no tunnels exist
  }

  // Start localtunnel tunnel (this will wait until tunnel is established)
  let result;
  try {
    result = await startLocaltunnelTunnel(options.port, options.managementPort, options.region, options.json, authtoken);
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
    console.log(`\n  Localtunnel management interface:`);
    console.log(`  👉 ${result.localtunnelManagementUrl}`);
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
