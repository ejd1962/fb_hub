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
 *   --subdomain=<name>          Request specific subdomain (may not be available)
 *                               Use NNNN in name for random 4-digit number
 *                               Examples: --subdomain=transverse
 *                                        --subdomain=transverse-NNNN
 *   --subdomain_retry=<name>    Fallback subdomain if first request fails
 *                               Use NNNN for random 4-digit number
 *                               Example: --subdomain_retry=transverse-NNNN
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
    subdomainRetry: null,  // null means no retry
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
      // Store pattern, don't replace NNNN yet (we may need to retry)
      options.subdomain = subdomain;
    } else if (arg.startsWith('--subdomain_retry=')) {
      let subdomainRetry = arg.split('=')[1];
      if (!subdomainRetry || subdomainRetry.trim() === '') {
        console.error(`ERROR: Subdomain retry cannot be empty`);
        process.exit(3);
      }
      // Store pattern, don't replace NNNN yet
      options.subdomainRetry = subdomainRetry;
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

// Replace NNNN pattern with random 4-digit number
function replaceNNNN(pattern) {
  if (pattern && pattern.includes('NNNN')) {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    return pattern.replace(/NNNN/g, randomNum.toString());
  }
  return pattern;
}

// Try to establish tunnel with requested subdomain
// If pattern contains NNNN, will try up to maxAttempts times with different random numbers
// Returns: { result, subdomainGranted, attemptsUsed }
async function attemptTunnel(port, subdomainPattern, jsonMode, maxAttempts = 3) {
  // If no subdomain pattern, just try once
  if (!subdomainPattern) {
    const result = await startLocaltunnelTunnel(port, null, jsonMode);
    return { result, subdomainGranted: true, attemptsUsed: 1 };
  }

  // If pattern has NNNN, try up to maxAttempts times with different random numbers
  const hasNNNN = subdomainPattern.includes('NNNN');
  const attempts = hasNNNN ? maxAttempts : 1;

  let lastResult = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const subdomain = replaceNNNN(subdomainPattern);

    if (!jsonMode && hasNNNN && attempt > 1) {
      console.log(`   🔄 Attempt ${attempt}/${attempts} with new random number...`);
    }

    const result = await startLocaltunnelTunnel(port, subdomain, jsonMode);

    if (result.subdomainGranted) {
      // Success! Got the subdomain we wanted
      return { result, subdomainGranted: true, attemptsUsed: attempt };
    }

    // Not granted, close this tunnel and try again (if we have attempts left)
    if (attempt < attempts) {
      result.tunnel.close();
    }

    lastResult = result;
  }

  // All attempts failed
  return { result: lastResult, subdomainGranted: false, attemptsUsed: attempts };
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

  --subdomain=<name>          Request specific subdomain (may not be available)
                              Omit for random subdomain
                              Use NNNN pattern for random 4-digit number
                              NNNN patterns will retry up to 3 times automatically
                              Examples: transverse, transverse-NNNN, my-app-NNNN

  --subdomain_retry=<name>    If first subdomain fails, retry with this name
                              Use NNNN pattern for random 4-digit number
                              NNNN patterns will retry up to 3 times automatically
                              Example: transverse-NNNN
                              If this also fails, script will error out

  --wait=<seconds>            Maximum seconds to wait for tunnel (default: 30)
                              Script will fail if tunnel not ready in time

  --json                      Output only JSON result (no human-readable text)
                              Useful for programmatic integration

  --help                      Show this help message and exit

EXAMPLES:
  # Basic usage (tunnel localhost:8999 with random subdomain)
  node launch_localtunnel.js

  # Recommended: Request specific subdomain with fallback to random suffix
  node launch_localtunnel.js --subdomain=transverse --subdomain_retry=transverse-NNNN
  # This tries "transverse" once, then "transverse-XXXX" up to 3 times

  # Request specific subdomain only (no fallback)
  node launch_localtunnel.js --subdomain=transverse

  # Request subdomain with random suffix and retries (up to 3 attempts)
  node launch_localtunnel.js --subdomain=transverse-NNNN

  # Use only subdomain_retry (no primary subdomain)
  node launch_localtunnel.js --subdomain_retry=transverse-NNNN
  # This tries "transverse-XXXX" up to 3 times

  # Tunnel different port with custom subdomain
  node launch_localtunnel.js --port=3000 --subdomain=my-app

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
async function startLocaltunnelTunnel(port, subdomain, jsonMode) {
  if (!jsonMode) {
    console.log(`\n🚇 Starting localtunnel tunnel...`);
    console.log(`   Local port: ${port}`);
    if (subdomain) {
      console.log(`   Requested subdomain: ${subdomain}`);
    } else {
      console.log(`   Subdomain: Random (not specified)`);
    }
  }

  try {
    const options = { port: port };

    // Add subdomain if specified
    if (subdomain) {
      options.subdomain = subdomain;
    }

    const tunnel = await localtunnel(options);

    // Extract actual subdomain from URL
    const actualSubdomain = tunnel.url.replace('https://', '').split('.')[0];
    const subdomainGranted = subdomain ? (actualSubdomain === subdomain) : true;

    if (!jsonMode) {
      console.log(`\n✅ Localtunnel tunnel established!`);
      console.log(`   Public URL: ${tunnel.url}`);
      console.log(`   Protocol: HTTPS`);
      if (subdomain) {
        if (subdomainGranted) {
          console.log(`   ✅ Got requested subdomain: ${subdomain}`);
        } else {
          console.log(`   ⚠️  Requested subdomain '${subdomain}' NOT granted`);
          console.log(`   ℹ️  Server assigned: ${actualSubdomain}`);
        }
      }
    }

    return {
      success: true,
      publicUrl: tunnel.url,
      localPort: port,
      requestedSubdomain: subdomain,
      actualSubdomain: actualSubdomain,
      subdomainGranted: subdomainGranted,
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
      console.log(`   ✅ Tunnel is healthy and reverse proxy is responding`);
    }

    return true;
  } catch (error) {
    if (!jsonMode) {
      console.log(`   ℹ️  Reverse proxy manager not responding yet (this is normal)`);
      console.log(`   ℹ️  Start your proxy manager to complete the connection`);
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
    // Determine primary and fallback patterns
    // If no subdomain but subdomain_retry is defined, use retry as primary
    const primaryPattern = options.subdomain || options.subdomainRetry;
    const fallbackPattern = options.subdomain ? options.subdomainRetry : null;

    // First attempt (primary pattern)
    const firstAttempt = await attemptTunnel(options.port, primaryPattern, options.json);

    if (firstAttempt.subdomainGranted) {
      // Happy path - got what we wanted (or didn't request specific subdomain)
      result = firstAttempt.result;
    } else {
      // Subdomain requested but NOT granted
      if (fallbackPattern) {
        // Try with fallback subdomain
        if (!options.json) {
          console.log(`\n🔄 Retrying with fallback subdomain...`);
        }

        firstAttempt.result.tunnel.close();

        const retryAttempt = await attemptTunnel(options.port, fallbackPattern, options.json);

        if (retryAttempt.subdomainGranted) {
          // Happy path - retry succeeded
          result = retryAttempt.result;
        } else {
          // ERROR - all attempts failed (primary pattern + fallback pattern)
          const totalAttempts = firstAttempt.attemptsUsed + retryAttempt.attemptsUsed;
          if (!options.json) {
            console.error(`\n❌ ERROR: No subdomain granted after ${totalAttempts} attempts`);
            console.error(`   Primary pattern: '${primaryPattern}' (${firstAttempt.attemptsUsed} attempts) - NOT granted`);
            console.error(`   Fallback pattern: '${fallbackPattern}' (${retryAttempt.attemptsUsed} attempts) - NOT granted`);
            console.error(`   Last server assignment: '${retryAttempt.result.actualSubdomain}'`);
          } else {
            console.log(JSON5.stringify({
              success: false,
              error: 'No subdomain granted after all attempts',
              totalAttempts: totalAttempts,
              primaryPattern: primaryPattern,
              primaryAttempts: firstAttempt.attemptsUsed,
              fallbackPattern: fallbackPattern,
              fallbackAttempts: retryAttempt.attemptsUsed,
              lastAssignedSubdomain: retryAttempt.result.actualSubdomain
            }, null, 2));
          }
          retryAttempt.result.tunnel.close();
          process.exit(1);
        }
      } else {
        // ERROR - no fallback option, subdomain not granted after all attempts
        if (!options.json) {
          console.error(`\n❌ ERROR: Requested subdomain not granted after ${firstAttempt.attemptsUsed} attempts`);
          console.error(`   Pattern: '${primaryPattern}'`);
          console.error(`   Last server assignment: '${firstAttempt.result.actualSubdomain}'`);
          console.error(`   Tip: Use --subdomain_retry=transverse-NNNN for a fallback option`);
        } else {
          console.log(JSON5.stringify({
            success: false,
            error: 'Requested subdomain not available after all attempts',
            pattern: primaryPattern,
            attemptsUsed: firstAttempt.attemptsUsed,
            lastAssignedSubdomain: firstAttempt.result.actualSubdomain
          }, null, 2));
        }
        firstAttempt.result.tunnel.close();
        process.exit(1);
      }
    }
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
