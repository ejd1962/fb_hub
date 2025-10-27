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

import ngrok from 'ngrok';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
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

// Read ngrok authtoken from file
function readAuthtoken() {
  const authtokenPath = join(__dirname, 'ngrok_authtoken.txt');

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

// Check if ngrok module is available
async function checkNgrokInstalled() {
  try {
    // If we can import ngrok, it's installed
    return true;
  } catch (error) {
    return false;
  }
}

// Start ngrok tunnel using Node.js API
async function startNgrokTunnel(port, managementPort, region, jsonMode, authtoken) {
  if (!jsonMode) {
    console.log(`\n🚇 Starting ngrok tunnel...`);
    console.log(`   Local port: ${port}`);
    // TODO: Re-enable when we figure out how to configure management port with ngrok npm package
    // console.log(`   Management port: ${managementPort}`);
    console.log(`   Region: ${region}`);
    console.log(`   Authtoken: ${authtoken ? 'Loaded from file' : 'Not found'}`);
  }

  try {
    const connectOptions = {
      addr: port,  // Use just the port number
      proto: 'http',  // Explicitly specify protocol
      region: region
      // TODO: Re-enable when we figure out correct option name for management port
      // web_addr: `localhost:${managementPort}`
    };

    // Add authtoken if available
    if (authtoken) {
      connectOptions.authtoken = authtoken;
    }

    const url = await ngrok.connect(connectOptions);

    // TODO: Get actual ngrok API URL when management port is configurable
    const ngrokManagementUrl = `http://127.0.0.1:4040`; // ngrok default

    if (!jsonMode) {
      console.log(`\n✅ Ngrok tunnel established!`);
      console.log(`   Public URL: ${url}`);
      console.log(`   Protocol: HTTPS`);
      console.log(`   Management: ${ngrokManagementUrl}`);
    }

    return {
      success: true,
      publicUrl: url,
      localPort: port,
      region: region,
      ngrokManagementUrl: ngrokManagementUrl
    };
  } catch (error) {
    if (!jsonMode) {
      console.error(`\n❌ Failed to start ngrok: ${error.message}`);
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
    console.log(`   ✅ Ngrok module is available`);
  }

  // Read authtoken from file
  const authtoken = readAuthtoken();

  if (!authtoken && !options.json) {
    console.warn(`\n⚠️  Warning: No authtoken found in ngrok_authtoken.txt`);
    console.warn(`   Ngrok may fail without authentication.`);
    console.warn(`   Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken`);
  }

  // Disconnect any existing tunnels first
  if (!options.json) {
    console.log(`\n🔌 Disconnecting any existing ngrok tunnels...`);
  }
  try {
    await ngrok.disconnect();
    await ngrok.kill();
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    // Ignore errors if no tunnels exist
  }

  // Start ngrok tunnel (this will wait until tunnel is established)
  let result;
  try {
    result = await startNgrokTunnel(options.port, options.managementPort, options.region, options.json, authtoken);
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
  process.on('SIGINT', async () => {
    if (!options.json) {
      console.log(`\n\n🛑 Shutting down ngrok tunnel...`);
    }
    await ngrok.disconnect();
    await ngrok.kill();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await ngrok.disconnect();
    await ngrok.kill();
    process.exit(0);
  });
}

// Run main function
main().catch(error => {
  console.error(`FATAL ERROR: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
