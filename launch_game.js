#!/usr/bin/env node

/**
 * launch_game.js
 *
 * Launches game servers for specified games with configurable options.
 *
 * Usage: node launch_game.js [options] <game1> <game2> ...
 *
 * Options:
 *   --mode <prod|dev|dev-vite>  Launch mode (default: dev-vite)
 *                               prod: Production (port 9000+game#, backend only)
 *                               dev: Dev backend only (port 10000+game#, serves built frontend)
 *                               dev-vite: Dev with live Vite (backend 10000+game#, frontend 11000+game#)
 *   --build-only <yes|no>       Only build frontend, don't launch servers (default: no)
 *   --restart <auto|no>         Enable auto-restart on file changes (default: auto)
 *   --newtab <yes|no>           Launch each server in a new Windows Terminal tab (default: yes)
 *
 * Examples:
 *   node launch_game.js trivia guess_a_word
 *   node launch_game.js --mode prod trivia
 *   node launch_game.js --mode dev chateasy
 *   node launch_game.js --build-only yes guess_a_word trivia
 *   node launch_game.js --restart no chateasy
 *   node launch_game.js --newtab yes trivia
 *   node launch_game.js --mode dev-vite --restart auto --newtab yes trivia guess_a_word chateasy
 *
 * The script will:
 * - Read game_info.json to get game numbers
 * - Launch backend servers on appropriate ports (9xxx for prod, 10xxx for dev)
 * - Launch Vite frontend servers on 11xxx ports (dev mode only)
 * - Display status and logs for all running servers
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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
const lockFile = path.join(__dirname, '.launch_game.lock');

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
                log(`[PORT-KILL] Killing process ${pid}...`);
                execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf8' });
                log(`${colors.green}[PORT-KILL] Successfully killed process ${pid}${colors.reset}`);
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
        deployment: 'local',  // local, alpha, beta, or prod
        games: []
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--mode' && i + 1 < args.length) {
            options.mode = args[++i];
        } else if (arg === '--build-only' && i + 1 < args.length) {
            options.buildOnly = args[++i];
        } else if (arg === '--restart' && i + 1 < args.length) {
            options.restart = args[++i];
        } else if (arg === '--newtab' && i + 1 < args.length) {
            options.newtab = args[++i];
        } else if (arg === '--deployment' && i + 1 < args.length) {
            options.deployment = args[++i];
        } else if (arg === '--games' && i + 1 < args.length) {
            // Split comma-separated game list
            const gamesList = args[++i];
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
    return JSON.parse(content);
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

    // Only set PORT explicitly - no fallbacks, fail early if missing
    if (!envVars.PORT) {
        throw new Error(`PORT must be explicitly set in env options for ${label}`);
    }

    // TRUE_URL is only required for backend servers, not frontend Vite servers
    const isBackend = label.includes('-backend');
    if (isBackend && !envVars.TRUE_URL) {
        throw new Error(`TRUE_URL must be explicitly set in env options for ${label}`);
    }

    log(`${colors.cyan}[DEBUG] PORT: ${envVars.PORT}${colors.reset}`);
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
    const trueUrlExport = envVars.TRUE_URL ? `export TRUE_URL="${envVars.TRUE_URL}"\n` : '';
    const scriptContent = `#!/bin/bash
cd "${bashCwd}"
export PORT=${envVars.PORT}
${trueUrlExport}${command} ${args.join(' ')}
echo ""
echo "Server exited. Press Enter to close..."
read
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
        console.log(`  Deployment: ${options.deployment}`);
        console.log(`  New tabs: ${options.newtab}`);
    }
    console.log(`  Games: ${options.games.join(', ')}\n`);

    if (options.games.length === 0) {
        console.log(`${colors.red}Error: No games specified${colors.reset}`);
        console.log(`\nUsage: node launch_game.js [options] <game1> <game2> ...`);
        console.log(`\nOptions:`);
        console.log(`  --mode <prod|dev|dev-vite>  Launch mode (default: dev-vite)`);
        console.log(`                              prod: Production (backend only)`);
        console.log(`                              dev: Dev backend (serves built frontend)`);
        console.log(`                              dev-vite: Dev with live Vite frontend`);
        console.log(`  --build-only <yes|no>       Only build frontend, don't launch (default: no)`);
        console.log(`  --restart <auto|no>         Enable auto-restart (default: auto)`);
        console.log(`  --newtab <yes|no>           Launch in new tabs (default: yes)`);
        console.log(`\nExamples:`);
        console.log(`  node launch_game.js trivia guess_a_word`);
        console.log(`  node launch_game.js --mode prod trivia`);
        console.log(`  node launch_game.js --mode dev chateasy`);
        console.log(`  node launch_game.js --build-only yes guess_a_word trivia`);
        console.log(`  node launch_game.js --restart no chateasy`);
        console.log(`  node launch_game.js --newtab no trivia`);
        process.exit(1);
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
            // Find project directory
            const projectDir = findGameProject(gameName);
            if (!projectDir) {
                console.log(`${colors.red}Error: Project not found for game '${gameName}'${colors.reset}`);
                continue;
            }

            // Get game info
            const gameInfo = getGameInfo(projectDir, gameName);
            const gameNumber = gameInfo.game_number;

            console.log(`${colors.cyan}${colors.bright}Game: ${gameInfo.game_name} (${gameName})${colors.reset}`);
            console.log(`  Project: ${projectDir}`);
            console.log(`  Game number: ${gameNumber}\n`);

            // Determine ports
            const backendPort = isProd ? 9000 + gameNumber : 10000 + gameNumber;
            const frontendPort = 11000 + gameNumber;

            const gamePath = path.join(PROJECTS_DIR, projectDir, gameName);
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

            // Determine TRUE_URL based on deployment
            const deploymentKey = `${options.deployment}_server`;
            const baseUrl = gameInfo[deploymentKey];

            if (!baseUrl) {
                throw new Error(`Missing ${deploymentKey} in game_info.json for ${gameName}`);
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

                const backendProc = await launchFunc(
                    backendCmd,
                    backendArgs,
                    {
                        cwd: serverPath,
                        env: { ...process.env, PORT: backendPort.toString(), TRUE_URL }
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

                const frontendProc = await launchFunc(
                    frontendCmd,
                    frontendArgs,
                    {
                        cwd: gamePath,
                        env: { ...process.env, PORT: frontendPort.toString() }
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
