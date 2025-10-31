#!/usr/bin/env node

/**
 * launch_ngrok.js
 *
 * Launches ngrok tunnel using the standalone ngrok executable (not npm package)
 * and returns the public URL by querying ngrok's API.
 *
 * Usage:
 *   launch_ngrok.js [options]
 *
 * Options:
 *   --port=<number>     Local port to tunnel to (default: 8999)
 *   --region=<code>     Ngrok region (us, eu, ap, au, sa, jp, in) (default: us)
 *   --wait=<seconds>    Max seconds to wait for tunnel (default: 30)
 *   --help              Show this help message
 *   --json              Output only JSON (no human-readable text)
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
const DEFAULT_REGION = 'us';
const DEFAULT_WAIT_SECONDS = 30;
const NGROK_API_PORT = 4040; // Ngrok's default web interface port

// Parse command line arguments
function parseArgs(args) {
  const options = {
    port: DEFAULT_PORT,
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

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Usage: launch_ngrok.js [options]

Options:
  --port=<number>     Local port to tunnel to (default: ${DEFAULT_PORT})
  --region=<code>     Ngrok region: us, eu, ap, au, sa, jp, in (default: ${DEFAULT_REGION})
  --wait=<seconds>    Max seconds to wait for tunnel (default: ${DEFAULT_WAIT_SECONDS})
  --json              Output only JSON (no human-readable text)
  --help              Show this help message

Examples:
  launch_ngrok.js --port=8999
  launch_ngrok.js --port=8999 --region=us --json
`);
}

// Kill any existing ngrok processes
async function killExistingNgrok(jsonMode) {
  if (!jsonMode) {
    console.log(`\n🔌 Killing any existing ngrok processes...`);
  }

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('taskkill /F /IM ngrok.exe 2>nul');
      if (!jsonMode) {
        console.log(`   ✓ Killed existing ngrok processes`);
      }
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      // No processes to kill, that's fine
      if (!jsonMode) {
        console.log(`   No existing ngrok processes found`);
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Start ngrok process in background
function startNgrokProcess(port, region, jsonMode) {
  if (!jsonMode) {
    console.log(`\n🚇 Starting ngrok tunnel...`);
    console.log(`   Local port: ${port}`);
    console.log(`   Region: ${region}`);
  }

  // Spawn ngrok http command
  const ngrokProcess = spawn('ngrok', ['http', port.toString(), '--region', region], {
    detached: true,
    stdio: 'ignore'
  });

  // Allow parent to exit independently
  ngrokProcess.unref();

  if (!jsonMode) {
    console.log(`   ✓ Ngrok process started (PID: ${ngrokProcess.pid})`);
  }

  return ngrokProcess;
}

// Poll ngrok API to get tunnel URL
async function getTunnelUrl(waitSeconds, jsonMode) {
  if (!jsonMode) {
    console.log(`\n⏳ Waiting for ngrok API to become available...`);
  }

  const maxAttempts = waitSeconds * 2; // Poll every 500ms
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(`http://127.0.0.1:${NGROK_API_PORT}/api/tunnels`);

      if (response.ok) {
        const data = await response.json();

        if (data.tunnels && data.tunnels.length > 0) {
          // Get the HTTPS tunnel (ngrok creates both http and https)
          const httpsTunnel = data.tunnels.find(t => t.public_url.startsWith('https://'));
          const tunnel = httpsTunnel || data.tunnels[0];

          if (!jsonMode) {
            console.log(`   ✓ Tunnel established!`);
          }

          return {
            publicUrl: tunnel.public_url,
            config: tunnel.config,
            proto: tunnel.proto
          };
        }
      }
    } catch (error) {
      // API not ready yet, continue waiting
    }

    attempt++;
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!jsonMode && attempt % 4 === 0) {
      console.log(`   Attempt ${Math.floor(attempt / 2)}/${Math.floor(maxAttempts / 2)}...`);
    }
  }

  throw new Error(`Timeout: Ngrok API did not respond after ${waitSeconds} seconds`);
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
      console.log(`   ✓ Tunnel is healthy and responding`);
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

  const jsonMode = options.json;

  try {
    if (!jsonMode) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  TransVerse Ngrok Launcher (Standalone Executable)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    // Step 1: Kill any existing ngrok processes
    await killExistingNgrok(jsonMode);

    // Step 2: Start ngrok process
    const ngrokProcess = startNgrokProcess(options.port, options.region, jsonMode);

    // Step 3: Wait for tunnel URL from API
    let tunnelInfo;
    try {
      tunnelInfo = await getTunnelUrl(options.waitSeconds, jsonMode);
    } catch (error) {
      if (jsonMode) {
        console.log(JSON5.stringify({
          success: false,
          error: error.message
        }, null, 2));
      } else {
        console.error(`\n❌ Failed to get tunnel URL: ${error.message}`);
      }
      process.exit(2);
    }

    // Step 4: Health check
    await healthCheckTunnel(tunnelInfo.publicUrl, jsonMode);

    // Step 5: Output result
    const result = {
      success: true,
      publicUrl: tunnelInfo.publicUrl,
      localPort: options.port,
      region: options.region,
      ngrokManagementUrl: `http://127.0.0.1:${NGROK_API_PORT}`,
      proto: tunnelInfo.proto
    };

    if (jsonMode) {
      console.log(JSON5.stringify(result, null, 2));
    } else {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  Ngrok tunnel is ready!`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`\n  Use this URL to access your system from anywhere:`);
      console.log(`  ${tunnelInfo.publicUrl}`);
      console.log(`\n  Ngrok management interface:`);
      console.log(`  http://127.0.0.1:${NGROK_API_PORT}`);
      console.log(`\n  Press Ctrl+C to stop the tunnel when done.`);
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    // Keep process alive (ngrok is running in background)
    process.on('SIGINT', async () => {
      if (!jsonMode) {
        console.log(`\n\n🛑 Shutting down ngrok tunnel...`);
      }
      await killExistingNgrok(jsonMode);
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    if (jsonMode) {
      console.log(JSON5.stringify({
        success: false,
        error: error.message
      }, null, 2));
    } else {
      console.error(`\n❌ Error: ${error.message}`);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
const isMainModule = process.argv[1] === __filename;
if (isMainModule) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
