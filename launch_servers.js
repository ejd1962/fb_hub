#!/usr/bin/env node

/**
 * launch_servers.js
 *
 * Launches hub and game servers with configurable options.
 *
 * Usage: node launch_servers.js [options] [game1] [game2] ...
 *
 * Options:
 *   --mode=<prod|dev|dev-vite>  Launch mode (default: dev-vite)
 *                               prod: Production (port 9000+game#, backend only)
 *                               dev: Dev backend only (port 10000+game#, serves built frontend)
 *                               dev-vite: Dev with live Vite (backend 10000+game#, frontend 11000+game#)
 *
 *   --purpose=<designer_test|alpha_test|beta_test|customer_access>
 *                               Purpose/environment of the codebase (default: designer_test)
 *                               designer_test: Early development, designer testing
 *                               alpha_test: Internal alpha testing
 *                               beta_test: External beta testing
 *                               customer_access: Production/customer-facing
 *                               This determines which server URL is used from game_info.json
 *
 *   --proxy=<yes|no>            Enable reverse proxy mode (default: no)
 *                               Automatically launches setup-reverse-proxy.js on port 8999
 *                               Sets VITE_BASE_PATH for proper asset serving through proxy
 *
 *   --deployment=<local|localhost|localtunnel|portforward:RESIDENCE>
 *                               Proxy deployment method (default: local)
 *                               Only used when --proxy=yes is specified
 *                               local: Proxy for local testing (http://localhost:8999)
 *                               localhost: Same as local
 *                               localtunnel: Proxy for external access via localtunnel (FREE, but slow)
 *                               portforward:RESIDENCE: Use port forwarding with configured residence
 *                                 Example: --deployment=portforward:erics_cottage
 *
 *   --build-only=<yes|no>       Only build frontend, don't launch servers (default: no)
 *   --restart=<auto|no>         Enable auto-restart on file changes (default: auto)
 *   --newtab=<yes|no>           Launch each server in a new Windows Terminal tab (default: yes)
 *
 * Examples:
 *   node launch_servers.js wordguess
 *     # Launches hub + wordguess in dev-vite mode with designer_test purpose
 *
 *   node launch_servers.js --purpose=beta_test wordguess
 *     # Uses beta_test server URLs from game_info.json
 *
 *   node launch_servers.js --proxy=yes wordguess
 *     # Enables local reverse proxy on port 8999 for testing
 *
 *   node launch_servers.js --proxy=yes --deployment=ngrok wordguess
 *     # Enables reverse proxy with ngrok for external access
 *
 *   node launch_servers.js --proxy=yes --deployment=localtunnel wordguess
 *     # Enables reverse proxy with localtunnel for external access (FREE)
 *
 *   node launch_servers.js --mode=prod --purpose=customer_access wordguess
 *     # Production mode with customer-facing configuration
 *
 *   node launch_servers.js --build-only=yes wordguess
 *     # Only builds frontend, doesn't launch servers
 *
 * The script will ALWAYS:
 * - Kill all existing servers on ports 9000-11005 and 8999
 * - Launch hub (game_number=0) - auto-added if not specified
 * - Launch specified games
 * - Read game_info.json to get game numbers
 * - Launch backend servers on appropriate ports (9xxx for prod, 10xxx for dev)
 * - Launch Vite frontend servers on 11xxx ports (dev-vite mode only)
 * - In proxy mode: set VITE_BASE_PATH for correct asset paths
 *
 * Tab Management (when --newtab yes):
 * - Each server launches in a separate Windows Terminal tab
 * - When re-running this script:
 *   1. Script kills all existing servers on known ports
 *   2. Old tabs display "Server exited with code 143" (SIGTERM)
 *   3. Old tabs auto-close after 5 seconds
 *   4. New tabs launch immediately with fresh servers
 *   5. Brief overlap (~5 seconds) of old and new tabs, then old tabs disappear
 * - Exception: If a server crashed (exit code ≠ 0, 130, 143):
 *   - Tab shows "⚠️  Server crashed or exited with error!"
 *   - Tab remains open indefinitely to preserve crash information
 *   - User must manually press Enter to close after reviewing the error
 * - This allows easy re-launching without manual tab cleanup while preserving crash details
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logging functionality
const logFile = path.join(__dirname, 'launch_game.log');
function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(message);
}

// User confirmation helper
async function waitForUserConfirmation(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(`${colors.yellow}${message} (Press Enter to continue)${colors.reset} `, () => {
            rl.close();
            resolve();
        });
    });
}

// Lockfile to prevent multiple instances
const lockFile = path.join(__dirname, '.launch_servers.lock');

function checkAndCreateLockfile() {
    if (fs.existsSync(lockFile)) {
        const lockPid = fs.readFileSync(lockFile, 'utf8').trim();
        log(`${colors.red}ERROR: Another instance is already running (PID: ${lockPid})${colors.reset}`);
        log(`${colors.yellow}Lock file: ${lockFile}${colors.reset}`);
        log(`${colors.yellow}If this is an error, delete the lock file and try again.${colors.reset}`);
        process.exit(1);
    }

    fs.writeFileSync(lockFile, process.pid.toString());
    log(`[LOCKFILE] Created lock file: ${lockFile} with PID ${process.pid}`);
}

function removeLockfile() {
    if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        log(`[LOCKFILE] Removed lock file`);
    }
}

const PROJECTS_DIR = 'C:\\_projects';

// Kill process using a specific port (Windows)
function killProcessOnPort(port) {
    try {
        log(`[PORT-CHECK] Checking if port ${port} is in use...`);

        // Find the PID using the port
        const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });

        if (!netstatOutput) {
            log(`[PORT-CHECK] Port ${port} is free`);
            return;
        }

        const lines = netstatOutput.split('\n').filter(line => line.trim());
        const pids = new Set();

        for (const line of lines) {
            // Extract PID from the end of the line
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];

            if (pid && pid !== '0' && !isNaN(pid)) {
                pids.add(pid);
            }
        }

        if (pids.size === 0) {
            log(`[PORT-CHECK] Port ${port} is free`);
            return;
        }

        log(`${colors.yellow}[PORT-KILL] Port ${port} is in use by PID(s): ${Array.from(pids).join(', ')}${colors.reset}`);

        for (const pid of pids) {
            try {
                log(`[PORT-KILL] Killing process tree for ${pid}...`);
                // Use /T to kill the entire process tree (including child processes like nodemon)
                execSync(`taskkill /F /T /PID ${pid}`, { encoding: 'utf8' });
                log(`${colors.green}[PORT-KILL] Successfully killed process tree ${pid}${colors.reset}`);
            } catch (killError) {
                log(`${colors.yellow}[PORT-KILL] Warning: Could not kill process ${pid}: ${killError.message}${colors.reset}`);
            }
        }

        // Wait a moment for ports to be released
        execSync('timeout /t 1 /nobreak', { stdio: 'ignore', shell: 'cmd.exe' });
        log(`[PORT-KILL] Port ${port} should now be free`);

    } catch (error) {
        // If netstat returns nothing, the port is free
        if (error.status === 1) {
            log(`[PORT-CHECK] Port ${port} is free`);
        } else {
            log(`${colors.yellow}[PORT-CHECK] Warning: Error checking port ${port}: ${error.message}${colors.reset}`);
        }
    }
}

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Parse command line arguments
function parseArgs(args) {
    const options = {
        mode: 'dev-vite',  // prod, dev, or dev-vite
        buildOnly: 'no',   // yes or no
        restart: 'auto',
        newtab: 'yes',
        purpose: 'designer_test',  // designer_test, alpha_test, beta_test, or customer_access
        deployment: 'local',  // local, localhost, localtunnel, portforward:<residence> - proxy deployment method
        residence: null,   // Extracted from deployment=portforward:<residence>
        proxy: 'no',       // yes or no - use reverse proxy mode
        games: []
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        // Parse --flag=value format
        if (arg.startsWith('--mode=')) {
            options.mode = arg.split('=')[1];
        } else if (arg.startsWith('--build-only=')) {
            options.buildOnly = arg.split('=')[1];
        } else if (arg.startsWith('--restart=')) {
            options.restart = arg.split('=')[1];
        } else if (arg.startsWith('--newtab=')) {
            options.newtab = arg.split('=')[1];
        } else if (arg.startsWith('--purpose=')) {
            options.purpose = arg.split('=')[1];
        } else if (arg.startsWith('--deployment=')) {
            const deploymentValue = arg.split('=')[1];
            // Check if it's portforward:<residence> format
            if (deploymentValue.startsWith('portforward:')) {
                options.deployment = 'portforward';
                options.residence = deploymentValue.split(':')[1];
            } else {
                options.deployment = deploymentValue;
            }
        } else if (arg.startsWith('--proxy=')) {
            options.proxy = arg.split('=')[1];
        } else if (arg.startsWith('--games=')) {
            // Split comma-separated game list
            const gamesList = arg.split('=')[1];
            options.games.push(...gamesList.split(',').map(g => g.trim()));
        } else if (!arg.startsWith('--')) {
            options.games.push(arg);
        }
    }

    // Validate mode
    if (!['prod', 'dev', 'dev-vite'].includes(options.mode)) {
        throw new Error(`Invalid mode: ${options.mode}. Must be 'prod', 'dev', or 'dev-vite'`);
    }

    return options;
}

// Find project directory for a game
function findGameProject(gameName) {
    const entries = fs.readdirSync(PROJECTS_DIR);

    // Look for pNN_<gameName> pattern
    const match = entries.find(entry => {
        const match = entry.match(/^p\d+_(.+)$/);
        return match && match[1] === gameName;
    });

    return match;
}

// Get game info from game_info.json
function getGameInfo(projectDir, gameName) {
    const gameInfoPath = path.join(PROJECTS_DIR, projectDir, gameName, 'public', 'fb_hub_data', 'game_info.json');

    if (!fs.existsSync(gameInfoPath)) {
        throw new Error(`Game info not found at ${gameInfoPath}`);
    }

    const content = fs.readFileSync(gameInfoPath, 'utf8');
    return JSON5.parse(content);
}

// Safety counter to prevent infinite spawning
let tabsLaunched = 0;
const MAX_TABS = 20;

// Launch a process in a new Windows Terminal tab
async function launchProcessInNewTab(command, args, options, label, color) {
    // Safety check to prevent infinite recursion
    if (tabsLaunched >= MAX_TABS) {
        const msg = `[SAFETY] Maximum tab limit (${MAX_TABS}) reached. Not launching ${label}`;
        log(`${colors.red}${msg}${colors.reset}`);
        return null;
    }

    log(`[PRE-SPAWN] Spawning tab ${tabsLaunched + 1}/${MAX_TABS} for ${label}`);

    tabsLaunched++;

    log(`${colors[color]}${colors.bright}[${label}] Launching in new tab (${tabsLaunched}/${MAX_TABS}): ${command} ${args.join(' ')}${colors.reset}`);

    // Build the command to run in the new tab
    const cwd = options.cwd || process.cwd();
    const envVars = options.env || {};

    // PORT is required for game servers, but not for reverse-proxy
    const isProxy = label.includes('reverse-proxy');
    if (!isProxy && !envVars.PORT) {
        throw new Error(`PORT must be explicitly set in env options for ${label}`);
    }

    // TRUE_URL is only required for backend servers, not frontend Vite servers or proxy
    const isBackend = label.includes('-backend');
    if (isBackend && !envVars.TRUE_URL) {
        throw new Error(`TRUE_URL must be explicitly set in env options for ${label}`);
    }

    if (envVars.PORT) {
        log(`${colors.cyan}[DEBUG] PORT: ${envVars.PORT}${colors.reset}`);
    }
    if (envVars.TRUE_URL) {
        log(`${colors.cyan}[DEBUG] TRUE_URL: ${envVars.TRUE_URL}${colors.reset}`);
    }
    log(`${colors.cyan}[DEBUG] Working directory: ${cwd}${colors.reset}`);

    // Use Windows Terminal to open a new tab in the current window
    // -w 0 targets the current/focused window, nt is short for new-tab
    // Use Git Bash (Admin) profile to inherit bash environment with admin privileges
    log(`[SPAWN] Calling spawn('wt.exe') for ${label}`);

    // Convert Windows path to bash-style path for Git Bash
    const bashCwd = cwd.replace(/\\/g, '/');

    // Extract game name and server type from label
    // e.g., "trivia-backend:10003" -> game="trivia", type="backend"
    // e.g., "trivia-vite:11003" -> game="trivia", type="vite"
    const labelParts = label.split('-');
    const gameName = labelParts[0];
    const serverType = labelParts[1].split(':')[0]; // "backend" or "vite"

    // Create a temporary bash script to avoid escaping issues
    const scriptPath = path.join(__dirname, `launch_script_${gameName}_${serverType}.bash`);
    const portExport = envVars.PORT ? `export PORT=${envVars.PORT}\n` : '';
    const trueUrlExport = envVars.TRUE_URL ? `export TRUE_URL="${envVars.TRUE_URL}"\n` : '';
    const proxyEnabledExport = envVars.PROXY_ENABLED ? `export PROXY_ENABLED="${envVars.PROXY_ENABLED}"\n` : '';
    const proxyInfoPathExport = envVars.PROXY_INFO_PATH ? `export PROXY_INFO_PATH="${envVars.PROXY_INFO_PATH}"\n` : '';
    // Use MSYS_NO_PATHCONV to prevent Git Bash from converting the path
    const viteBasePathExport = envVars.VITE_BASE_PATH ? `export MSYS_NO_PATHCONV=1\nexport VITE_BASE_PATH="${envVars.VITE_BASE_PATH}"\n` : '';
    const scriptContent = `#!/bin/bash
cd "${bashCwd}"
${portExport}${trueUrlExport}${proxyEnabledExport}${proxyInfoPathExport}${viteBasePathExport}${command} ${args.join(' ')}
EXIT_CODE=$?
echo ""
echo "Server exited with code $EXIT_CODE"

# Only auto-close on clean shutdown or intentional kill
# Exit codes that trigger auto-close:
#   0 = clean exit
#   1 = taskkill force termination (from launch_servers.js killing the process tree)
#   130 = SIGINT (Ctrl+C)
#   143 = SIGTERM (graceful shutdown)
# Any other exit code = unexpected crash, keep tab open
if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 1 ] || [ $EXIT_CODE -eq 130 ] || [ $EXIT_CODE -eq 143 ]; then
    echo "Tab will auto-close in 5 seconds (or press Enter to close now)..."
    read -t 5 || true
else
    echo "⚠️  Server crashed or exited with error!"
    echo "Tab will remain open. Press Enter to close and review the error above..."
    read
fi
exit $EXIT_CODE
`;

    fs.writeFileSync(scriptPath, scriptContent);
    log(`[SPAWN] Created script: ${scriptPath}`);

    const proc = spawn('wt.exe', [
        '-w', '0',
        'nt',
        '--title', label,
        '-p', 'Git Bash (Admin)',
        'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
        '-l',
        scriptPath.replace(/\\/g, '/')
    ], {
        detached: true,
        stdio: 'ignore'
    });

    log(`[SPAWN-SUCCESS] spawn() returned for ${label}, PID: ${proc.pid || 'unknown'}`);

    proc.on('error', (error) => {
        const errorMsg = `[${label}] Failed to spawn tab: ${error.message}`;
        log(`${colors.red}${errorMsg}${colors.reset}`);
        tabsLaunched--; // Decrement if spawn failed
    });

    proc.unref(); // Allow parent to exit independently

    log(`[SPAWN-COMPLETE] Finished spawning ${label}`);
    return proc;
}

// Launch a process with colored output (same terminal)
function launchProcess(command, args, options, label, color) {
    console.log(`${colors[color]}${colors.bright}[${label}] Starting: ${command} ${args.join(' ')}${colors.reset}`);

    const proc = spawn(command, args, {
        ...options,
        shell: true,
        stdio: 'pipe'
    });

    // Prefix output with label and color
    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            console.log(`${colors[color]}[${label}]${colors.reset} ${line}`);
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
            console.log(`${colors.red}[${label} ERROR]${colors.reset} ${line}`);
        });
    });

    proc.on('close', (code) => {
        if (code !== 0) {
            console.log(`${colors.red}[${label}] Process exited with code ${code}${colors.reset}`);
        } else {
            console.log(`${colors[color]}[${label}] Process exited successfully${colors.reset}`);
        }
    });

    proc.on('error', (error) => {
        console.log(`${colors.red}[${label}] Failed to start: ${error.message}${colors.reset}`);
    });

    return proc;
}

// Main function
// Post-launch verification: check that proxy table has expected number of servers
// and perform health checks on each server
async function postLaunchCheck(options, gameNames, silent = false) {
    if (!silent) {
        console.log(`${colors.cyan}Performing post-launch verification...${colors.reset}\n`);
    }

    try {
        const proxyConfigPath = path.join(__dirname, 'reverse_proxy.json');
        const proxyConfig = JSON5.parse(fs.readFileSync(proxyConfigPath, 'utf-8'));

        // Calculate expected number of ports
        // Note: gameNames already includes 'hub' (added by main() at line 657)
        const serversToLaunch = gameNames;
        let expectedPorts = 0;

        if (options.mode === 'dev-vite') {
            // Each server has 2 ports: backend + frontend
            expectedPorts = serversToLaunch.length * 2;
        } else {
            // prod or dev mode: 1 port per server (backend only)
            expectedPorts = serversToLaunch.length;
        }

        const actualPorts = Object.keys(proxyConfig.routes).length;

        console.log(`${colors.cyan}Expected ports: ${expectedPorts}${colors.reset}`);
        console.log(`${colors.cyan}Found ports:    ${actualPorts}${colors.reset}\n`);

        if (actualPorts !== expectedPorts) {
            console.log(`${colors.red}⚠️  WARNING: Port count mismatch!${colors.reset}`);
            console.log(`${colors.yellow}Expected ${expectedPorts} ports but found ${actualPorts} in proxy table.${colors.reset}`);
            console.log(`${colors.yellow}Some servers may have failed to start or bind to their ports.${colors.reset}\n`);

            console.log(`${colors.cyan}Ports found in proxy table:${colors.reset}`);
            for (const [route, info] of Object.entries(proxyConfig.routes)) {
                console.log(`  ${colors.green}✓${colors.reset} ${route} → localhost:${info.local_port} (${info.type})`);
            }
            console.log('');

            return { success: false, hubUrl: null };
        }

        // Perform health checks on all backend servers
        console.log(`${colors.cyan}Performing health checks on backend servers...${colors.reset}\n`);
        const healthChecks = [];
        const backendRoutes = [];

        for (const [route, info] of Object.entries(proxyConfig.routes)) {
            // Only check backend servers (they have /api/health endpoints)
            if (info.type === 'backend') {
                backendRoutes.push({ route, port: info.local_port });

                // Use public_url (proxy-aware) instead of direct localhost:port
                // In proxy mode: public_url = "http://localhost:8999/localhost_10000"
                // In direct mode: public_url = "http://localhost:10000"
                const healthUrl = `${info.public_url}/api/health`;

                healthChecks.push(
                    fetch(healthUrl, { signal: AbortSignal.timeout(5000) })
                        .then(async res => {
                            if (!res.ok) {
                                return { port: info.local_port, mode: info.mode, healthy: false, error: `HTTP ${res.status}` };
                            }
                            const data = await res.json();
                            if (data.status === 'ok') {
                                return { port: info.local_port, mode: info.mode, healthy: true };
                            } else {
                                return { port: info.local_port, mode: info.mode, healthy: false, error: 'Invalid status' };
                            }
                        })
                        .catch(err => ({ port: info.local_port, mode: info.mode, healthy: false, error: err.message }))
                );
            }
        }

        const healthResults = await Promise.all(healthChecks);
        const unhealthyServers = healthResults.filter(r => !r.healthy);

        // Display health check results
        for (const result of healthResults) {
            const modeLabel = result.mode === 'proxy' ? '[PROXY]' : '[DIRECT]';
            if (result.healthy) {
                console.log(`  ${colors.green}✓${colors.reset} localhost:${result.port} ${modeLabel} - Healthy`);
            } else {
                console.log(`  ${colors.red}✗${colors.reset} localhost:${result.port} ${modeLabel} - Failed (${result.error})`);
            }
        }
        console.log('');

        if (unhealthyServers.length > 0) {
            console.log(`${colors.red}⚠️  WARNING: ${unhealthyServers.length} server(s) failed health check!${colors.reset}`);
            console.log(`${colors.yellow}The following servers are not responding correctly:${colors.reset}`);
            for (const server of unhealthyServers) {
                console.log(`  ${colors.red}✗${colors.reset} localhost:${server.port} - ${server.error}`);
            }
            console.log('');
            return { success: false, hubUrl: null, unhealthyServers };
        }

        // All ports found and all health checks passed - determine hub URL
        const hubRoute = proxyConfig.routes['/localhost_11000'] || proxyConfig.routes['/localhost_10000'] || proxyConfig.routes['/localhost_9000'];

        if (!hubRoute) {
            console.log(`${colors.red}⚠️  WARNING: Hub frontend not found in proxy table!${colors.reset}\n`);
            return { success: false, hubUrl: null };
        }

        const hubUrl = hubRoute.public_url;
        const tunnelPassword = proxyConfig.tunnel_password || null;
        return { success: true, hubUrl, actualPorts, expectedPorts, tunnelPassword };

    } catch (error) {
        if (!silent) {
            console.log(`${colors.red}ERROR: Could not read proxy config: ${error.message}${colors.reset}\n`);
        }
        return { success: false, hubUrl: null };
    }
}

async function main() {
    log(`\n${'='.repeat(60)}`);
    log(`[SCRIPT START] launch_game.js starting, PID: ${process.pid}`);
    log(`[SCRIPT START] Timestamp: ${new Date().toISOString()}`);
    log(`${'='.repeat(60)}\n`);

    // Check and create lockfile to prevent multiple instances
    checkAndCreateLockfile();

    const args = process.argv.slice(2);
    const options = parseArgs(args);

    const mode = options.mode;
    const isProd = mode === 'prod';
    const isBuildOnly = options.buildOnly === 'yes';
    const autoRestart = options.restart === 'auto';
    const useNewTabs = options.newtab === 'yes';
    const processes = [];

    log(`${colors.bright}=== Game ${isBuildOnly ? 'Frontend Builder' : 'Server Launcher'} ===${colors.reset}\n`);
    console.log(`Options:`);
    console.log(`  Mode: ${options.mode}`);
    console.log(`  Build only: ${options.buildOnly}`);
    if (!isBuildOnly) {
        console.log(`  Auto-restart: ${options.restart}`);
        console.log(`  Purpose: ${options.purpose}`);
        console.log(`  Proxy mode: ${options.proxy}`);
        if (options.proxy === 'yes') {
            console.log(`  Deployment: ${options.deployment}`);
        }
        console.log(`  New tabs: ${options.newtab}`);
    }
    console.log(`  Games: ${options.games.join(', ')}\n`);

    if (options.games.length === 0) {
        console.log(`${colors.red}Error: No games specified${colors.reset}`);
        console.log(`\nUsage: node launch_servers.js [options] <game1> <game2> ...`);
        console.log(`\nOptions:`);
        console.log(`  --mode=<prod|dev|dev-vite>  Launch mode (default: dev-vite)`);
        console.log(`  --purpose=<designer_test|alpha_test|beta_test|customer_access>`);
        console.log(`                              Codebase purpose (default: designer_test)`);
        console.log(`  --proxy=<yes|no>            Enable reverse proxy (default: no)`);
        console.log(`  --deployment=<local|ngrok|localtunnel>  Proxy method (default: local)`);
        console.log(`  --build-only=<yes|no>       Only build frontend (default: no)`);
        console.log(`  --restart=<auto|no>         Auto-restart on changes (default: auto)`);
        console.log(`  --newtab=<yes|no>           Launch in new tabs (default: yes)`);
        console.log(`\nExamples:`);
        console.log(`  node launch_servers.js wordguess`);
        console.log(`  node launch_servers.js --purpose=beta_test wordguess`);
        console.log(`  node launch_servers.js --proxy=yes wordguess`);
        console.log(`  node launch_servers.js --proxy=yes --deployment=ngrok wordguess`);
        console.log(`  node launch_servers.js --proxy=yes --deployment=localtunnel wordguess`);
        console.log(`  node launch_servers.js --mode=prod --purpose=customer_access wordguess`);
        process.exit(1);
    }

    // Always clean up all server ports before launching
    console.log(`${colors.yellow}Cleaning up all server ports...${colors.reset}\n`);

    // Kill all ports in the hub/game range
    const allPorts = [
        9000, 10000, 11000,  // Hub ports
        ...Array.from({length: 5}, (_, i) => 9001 + i),   // Production game ports
        ...Array.from({length: 5}, (_, i) => 10001 + i),  // Dev game ports
        ...Array.from({length: 5}, (_, i) => 11001 + i),  // Dev-vite game ports
        8999  // Reverse proxy port
    ];

    for (const port of allPorts) {
        killProcessOnPort(port);
    }

    // Remove stale reverse_proxy files (prevents servers from seeing old proxy info)
    const proxyJsonPath = path.join(__dirname, 'reverse_proxy.json');
    const proxyJsonTmpPath = path.join(__dirname, 'reverse_proxy.json.tmp');
    const proxyReportPath = path.join(__dirname, 'reverse_proxy_report.txt');

    try {
        if (fs.existsSync(proxyJsonPath)) {
            fs.unlinkSync(proxyJsonPath);
            log(`${colors.yellow}[CLEANUP] Removed stale reverse_proxy.json${colors.reset}`);
        }
        if (fs.existsSync(proxyJsonTmpPath)) {
            fs.unlinkSync(proxyJsonTmpPath);
            log(`${colors.yellow}[CLEANUP] Removed stale reverse_proxy.json.tmp${colors.reset}`);
        }
        if (fs.existsSync(proxyReportPath)) {
            fs.unlinkSync(proxyReportPath);
            log(`${colors.yellow}[CLEANUP] Removed stale reverse_proxy_report.txt${colors.reset}`);
        }
    } catch (error) {
        log(`${colors.yellow}[CLEANUP] Warning: Could not remove proxy files: ${error.message}${colors.reset}`);
    }

    console.log(`${colors.green}Port cleanup complete${colors.reset}\n`);

    // Always ensure hub is in the list (since we kill all servers, we need to relaunch it)
    // Hub can be explicitly named on command line, but will be added automatically if not
    if (!options.games.includes('hub')) {
        console.log(`${colors.cyan}Adding hub to launch list (auto-added since all servers were killed)${colors.reset}\n`);
        options.games.unshift('hub');
    }

    // If proxy=no, launch config creator BEFORE servers start
    if (options.proxy === 'no') {
        console.log(`${colors.cyan}Launching no-proxy configuration manager...${colors.reset}\n`);

        const proxyLabel = 'proxy-config:no-proxy';
        const proxyCmd = 'node';
        const proxyArgs = ['setup-reverse-proxy.js', '--proxy=no'];

        if (useNewTabs) {
            const proxyProc = await launchProcessInNewTab(
                proxyCmd,
                proxyArgs,
                {
                    cwd: __dirname,
                    env: { ...process.env }
                },
                proxyLabel,
                'yellow'
            );

            if (proxyProc) {
                processes.push({ proc: proxyProc, label: proxyLabel });
            }
        }

        // Wait a moment for config file to be created
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`${colors.green}No-proxy configuration manager running${colors.reset}\n`);
    }

    // Show proxy mode status
    if (options.proxy === 'yes') {
        console.log(`${colors.bright}${colors.yellow}Proxy mode enabled (deployment: ${options.deployment})${colors.reset}`);
        console.log(`${colors.yellow}Note: Proxy will be launched AFTER all game servers are running${colors.reset}\n`);
    }

    // Choose launch function based on newtab option
    const launchFunc = useNewTabs ? launchProcessInNewTab : launchProcess;

    if (isBuildOnly) {
        console.log(`${colors.bright}Building frontends...${colors.reset}\n`);
    } else {
        console.log(`${colors.bright}Starting servers...${colors.reset}\n`);
    }

    for (const gameName of options.games) {
        try {
            // Handle "hub" as a special case
            let projectDir, gameInfo, gameNumber;

            if (gameName === 'hub') {
                projectDir = 'p23_fb_hub';
                gameNumber = 0;
                gameInfo = {
                    game_name: 'FB Hub',
                    game_number: 0,
                    designer_test_server: 'http://localhost:10000',
                    alpha_test_server: 'http://localhost:10000',
                    beta_test_server: 'http://localhost:10000',
                    customer_access_server: 'http://localhost:9000'
                };
            } else {
                // Find project directory
                projectDir = findGameProject(gameName);
                if (!projectDir) {
                    console.log(`${colors.red}Error: Project not found for game '${gameName}'${colors.reset}`);
                    continue;
                }

                // Get game info
                gameInfo = getGameInfo(projectDir, gameName);
                gameNumber = gameInfo.game_number;
            }

            console.log(`${colors.cyan}${colors.bright}Game: ${gameInfo.game_name} (${gameName})${colors.reset}`);
            console.log(`  Project: ${projectDir}`);
            console.log(`  Game number: ${gameNumber}\n`);

            // Determine ports
            const backendPort = isProd ? 9000 + gameNumber : 10000 + gameNumber;
            const frontendPort = 11000 + gameNumber;

            // Set paths (hub is directly in its project dir, games have a subdir)
            const gamePath = gameName === 'hub'
                ? path.join(PROJECTS_DIR, projectDir, 'fb_hub')
                : path.join(PROJECTS_DIR, projectDir, gameName);
            const serverPath = path.join(gamePath, 'server');

            // BUILD ONLY MODE: Just build the frontend and exit
            if (isBuildOnly) {
                console.log(`${colors.cyan}Building ${gameName} frontend...${colors.reset}`);
                try {
                    const buildCmd = `cd "${gamePath}" && set PORT=${backendPort}&& npm run build:dev`;
                    console.log(`  Running: ${buildCmd}`);
                    execSync(buildCmd, { stdio: 'inherit', shell: 'cmd.exe' });
                    console.log(`${colors.green}✓ ${gameName} build complete${colors.reset}\n`);
                } catch (error) {
                    console.log(`${colors.red}✗ ${gameName} build failed: ${error.message}${colors.reset}\n`);
                }
                continue;  // Skip to next game
            }

            // Kill any processes using these ports before launching
            console.log(`${colors.yellow}Checking ports for ${gameName}...${colors.reset}`);
            killProcessOnPort(backendPort);
            if (mode === 'dev-vite') {
                killProcessOnPort(frontendPort);
            }
            console.log('');

            // Determine TRUE_URL based on purpose
            const purposeKey = `${options.purpose}_server`;
            const baseUrl = gameInfo[purposeKey];

            if (!baseUrl) {
                throw new Error(`Missing ${purposeKey} in game_info.json for ${gameName}`);
            }

            // Parse the base URL and replace the port with our calculated port
            const url = new URL(baseUrl);
            url.port = backendPort.toString();
            const TRUE_URL = url.toString();

            // Check if server directory exists
            if (!fs.existsSync(serverPath)) {
                console.log(`${colors.yellow}Warning: Server directory not found for ${gameName}, skipping backend${colors.reset}\n`);
            } else {
                // Launch backend server
                const backendLabel = `${gameName}-backend:${backendPort}`;
                const backendCmd = autoRestart ? 'npm' : 'npm';
                const backendArgs = autoRestart ? ['run', 'dev'] : ['start'];

                // Set VITE_BASE_PATH for backend so it knows its public path prefix
                const backendEnv = {
                    ...process.env,
                    PORT: backendPort.toString(),
                    TRUE_URL,
                    PROXY_ENABLED: options.proxy === 'yes' ? 'true' : 'false',
                    PROXY_INFO_PATH: path.join(__dirname, 'reverse_proxy.json'),
                    MAX_PROXY_SETUP_SECONDS: '20'  // Maximum time to wait for proxy config (server_setup_delay + 10)
                };
                if (options.proxy === 'yes') {
                    backendEnv.VITE_BASE_PATH = `/localhost_${backendPort}`;
                }

                const backendProc = await launchFunc(
                    backendCmd,
                    backendArgs,
                    {
                        cwd: serverPath,
                        env: backendEnv
                    },
                    backendLabel,
                    isProd ? 'magenta' : 'blue'
                );

                if (backendProc) {
                    processes.push({ proc: backendProc, label: backendLabel });
                }
            }

            // Launch Vite frontend (dev-vite mode only)
            if (mode === 'dev-vite') {
                const frontendLabel = `${gameName}-vite:${frontendPort}`;
                const frontendCmd = 'npm';
                const frontendArgs = ['run', 'dev'];

                // Set VITE_BASE_PATH so Vite knows to serve assets with the path prefix
                const frontendEnv = {
                    ...process.env,
                    PORT: frontendPort.toString(),
                    PROXY_ENABLED: options.proxy === 'yes' ? 'true' : 'false',
                    PROXY_INFO_PATH: path.join(__dirname, 'reverse_proxy.json'),
                    MAX_PROXY_SETUP_SECONDS: '20'  // Maximum time to wait for proxy config (server_setup_delay + 10)
                };
                if (options.proxy === 'yes') {
                    frontendEnv.VITE_BASE_PATH = `/localhost_${frontendPort}`;
                }

                const frontendProc = await launchFunc(
                    frontendCmd,
                    frontendArgs,
                    {
                        cwd: gamePath,
                        env: frontendEnv
                    },
                    frontendLabel,
                    'green'
                );

                if (frontendProc) {
                    processes.push({ proc: frontendProc, label: frontendLabel });
                }
            }

            console.log('');

        } catch (error) {
            console.log(`${colors.red}Error processing game '${gameName}': ${error.message}${colors.reset}\n`);
        }
    }

    // Exit early if build-only mode
    if (isBuildOnly) {
        console.log(`${colors.bright}${colors.green}All builds complete${colors.reset}`);
        removeLockfile();
        process.exit(0);
    }

    if (processes.length === 0) {
        console.log(`${colors.red}No servers started${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.bright}${colors.green}Started ${processes.length} server(s)${colors.reset}`);

    // Launch reverse proxy AFTER all game servers are running
    if (options.proxy === 'yes') {
        console.log(`\n${colors.bright}${colors.yellow}Launching reverse proxy...${colors.reset}`);
        console.log(`${colors.yellow}Proxy will wait 10 seconds for game servers to fully initialize...${colors.reset}\n`);

        // Launch reverse proxy immediately - it will handle the server setup delay internally
        const proxyLabel = 'reverse-proxy:8999';
        const proxyCmd = 'node';

        // Build deployment string - if portforward, include residence
        let deploymentString = options.deployment;
        if (options.deployment === 'portforward' && options.residence) {
            deploymentString = `portforward:${options.residence}`;
        }

        const proxyArgs = ['setup-reverse-proxy.js', `--proxy=yes`, `--deployment=${deploymentString}`, `--server_setup_delay=10`];

        console.log(`${colors.cyan}Starting reverse proxy server...${colors.reset}\n`);

        if (useNewTabs) {
            const proxyProc = await launchProcessInNewTab(
                proxyCmd,
                proxyArgs,
                {
                    cwd: __dirname,
                    env: { ...process.env }
                },
                proxyLabel,
                'yellow'
            );

            if (proxyProc) {
                processes.push({ proc: proxyProc, label: proxyLabel });
            }
        } else {
            const proxyProc = launchProcess(
                proxyCmd,
                proxyArgs,
                {
                    cwd: __dirname,
                    env: { ...process.env }
                },
                proxyLabel,
                'yellow'
            );

            if (proxyProc) {
                processes.push({ proc: proxyProc, label: proxyLabel });
            }
        }

        console.log(`${colors.green}Reverse proxy launched on port 8999${colors.reset}\n`);

        // Wait for proxy to fully initialize and servers to register
        // MAX_PROXY_SETUP_SECONDS is server_setup_delay (10) + 10 = 20
        // Add 5 second buffer for file creation and final setup
        const MAX_PROXY_SETUP_SECONDS = 20;
        const maxWaitSeconds = MAX_PROXY_SETUP_SECONDS + 5;
        console.log(`${colors.cyan}Polling for up to ${maxWaitSeconds} seconds until all servers are healthy...${colors.reset}\n`);

        let result = null;
        let secondsElapsed = 0;
        const startTime = Date.now();

        // Poll once per second until success or timeout
        while (secondsElapsed < maxWaitSeconds) {
            // Use silent mode during polling to avoid spamming error messages
            result = await postLaunchCheck(options, options.games, true);

            if (result.success) {
                // Do one final verbose check to show the details
                console.log(`${colors.green}✓ All servers detected as healthy after ${secondsElapsed} seconds!${colors.reset}\n`);
                result = await postLaunchCheck(options, options.games, false);
                break;
            }

            // Wait 1 second before next check
            await new Promise(resolve => setTimeout(resolve, 1000));
            secondsElapsed = Math.floor((Date.now() - startTime) / 1000);

            // Show progress every 5 seconds
            if (secondsElapsed % 5 === 0 && secondsElapsed > 0) {
                console.log(`${colors.yellow}   Still waiting... (${secondsElapsed}/${maxWaitSeconds}s)${colors.reset}`);
            }
        }

        if (result && result.success) {
            // Display big success banner
            console.log('\n' + '═'.repeat(80));
            console.log('');
            console.log(colors.bright + colors.green + 'LAUNCH SUCCESSFUL!' + colors.reset);
            console.log('');
            console.log('All ' + result.expectedPorts + ' servers started correctly!');
            console.log('');
            console.log(colors.bright + colors.cyan + 'Hub URL:' + colors.reset);
            console.log(result.hubUrl);

            // Add tunnel password if present
            if (result.tunnelPassword) {
                console.log('');
                console.log(colors.bright + colors.cyan + 'Tunnel Password:' + colors.reset);
                console.log(result.tunnelPassword);
                console.log('');

                // Canned message for sharing with users
                const cannedMessage = `Come try the app. Open a browser on your computer and enter ${result.hubUrl} into it. When you go there the first time, you will need to enter this password: ${result.tunnelPassword} (yes 4 numbers separated by dots. Include the digits and dots).`;
                console.log(colors.bright + 'Message to share with users:' + colors.reset);
                console.log(cannedMessage);
            }

            console.log('');
            console.log('═'.repeat(80) + '\n');
        } else {
            console.log('\n' + '═'.repeat(80));
            console.log('');
            console.log(colors.bright + colors.red + 'LAUNCH INCOMPLETE' + colors.reset);
            console.log('');
            if (secondsElapsed >= maxWaitSeconds) {
                console.log(colors.red + 'TIMEOUT: Servers did not become healthy within ' + maxWaitSeconds + ' seconds.' + colors.reset);
            } else {
                console.log(colors.yellow + 'Some servers may not have started correctly.' + colors.reset);
            }
            console.log(colors.yellow + 'Check the output above for details.' + colors.reset);
            console.log(colors.yellow + 'Check individual server tabs for error messages.' + colors.reset);
            console.log('');
            console.log('═'.repeat(80) + '\n');
        }
    }

    if (useNewTabs) {
        console.log(`${colors.yellow}Servers running in separate tabs. Close individual tabs to stop servers.${colors.reset}\n`);
        console.log(`${colors.yellow}Press Ctrl+C to exit this launcher (servers will continue running)${colors.reset}\n`);
    } else {
        console.log(`${colors.yellow}Press Ctrl+C to stop all servers${colors.reset}\n`);
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        log(`\n[SHUTDOWN] Received SIGINT, cleaning up...`);
        removeLockfile();

        if (useNewTabs) {
            console.log(`\n${colors.yellow}Launcher exiting. Servers are still running in their tabs.${colors.reset}`);
            process.exit(0);
        } else {
            console.log(`\n${colors.yellow}Shutting down all servers...${colors.reset}`);

            processes.forEach(({ proc, label }) => {
                console.log(`${colors.yellow}Stopping ${label}...${colors.reset}`);
                proc.kill('SIGINT');
            });

            setTimeout(() => {
                console.log(`${colors.green}All servers stopped${colors.reset}`);
                process.exit(0);
            }, 1000);
        }
    });

    // Ensure lockfile is removed on any exit
    process.on('exit', () => {
        removeLockfile();
    });
}

main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    removeLockfile();
    process.exit(1);
});
