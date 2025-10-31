#!/usr/bin/env node

/**
 * launch_all_games.js
 *
 * Launches all games listed in the lobby.tsx file.
 * This script reads the lobby.tsx to extract the game list and then
 * calls launch_game.js with all games.
 *
 * Usage: launch_all_games.js [options]
 *
 * Options:
 *   --restart <auto|no>    Enable auto-restart on file changes (default: auto)
 *   --prod <yes|no>        Launch production servers (default: no)
 *
 * Examples:
 *   launch_all_games.js
 *   launch_all_games.js --prod yes
 *   launch_all_games.js --restart no
 *   launch_all_games.js --prod no --restart auto
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Extract game list from lobby.tsx
function getGameListFromLobby() {
    const lobbyPath = path.join(__dirname, 'src', 'lobby.tsx');

    if (!fs.existsSync(lobbyPath)) {
        throw new Error(`lobby.tsx not found at ${lobbyPath}`);
    }

    const content = fs.readFileSync(lobbyPath, 'utf8');

    // Look for the gameFolders array definition
    // Pattern: const gameFolders = ['game1', 'game2', ...];
    const gameFoldersRegex = /const\s+gameFolders\s*=\s*\[([^\]]+)\]/;
    const match = content.match(gameFoldersRegex);

    if (!match) {
        throw new Error('Could not find gameFolders array in lobby.tsx');
    }

    // Extract the array content and parse game names
    const arrayContent = match[1];
    const games = arrayContent
        .split(',')
        .map(item => item.trim())
        .map(item => item.replace(/['"]/g, '')) // Remove quotes
        .filter(item => item.length > 0);

    return games;
}

// Main function
async function main() {
    console.log(`${colors.bright}${colors.cyan}=== Launch All Games ===${colors.reset}\n`);

    try {
        // Extract game list from lobby.tsx
        console.log(`${colors.yellow}Reading game list from lobby.tsx...${colors.reset}`);
        const games = getGameListFromLobby();

        console.log(`${colors.green}Found ${games.length} games:${colors.reset}`);
        games.forEach((game, index) => {
            console.log(`  ${index + 1}. ${game}`);
        });
        console.log('');

        // Get all arguments except the script name
        const passThruArgs = process.argv.slice(2);

        // Build the command to run launch_game.js
        const launchGameScript = path.join(__dirname, 'launch_game.js');
        const allArgs = [...passThruArgs, ...games];

        console.log(`${colors.bright}Launching: launch_game.js ${allArgs.join(' ')}${colors.reset}\n`);

        // Spawn launch_game.js with all arguments
        const proc = spawn('node', [launchGameScript, ...allArgs], {
            stdio: 'inherit', // Pass through all I/O to parent process
            shell: true
        });

        // Handle exit
        proc.on('close', (code) => {
            if (code !== 0) {
                console.log(`${colors.red}launch_game.js exited with code ${code}${colors.reset}`);
                process.exit(code);
            } else {
                console.log(`${colors.green}All games stopped${colors.reset}`);
                process.exit(0);
            }
        });

        proc.on('error', (error) => {
            console.log(`${colors.red}Failed to start launch_game.js: ${error.message}${colors.reset}`);
            process.exit(1);
        });

        // Forward SIGINT to child process
        process.on('SIGINT', () => {
            console.log(`${colors.yellow}\nForwarding shutdown signal...${colors.reset}`);
            proc.kill('SIGINT');
        });

    } catch (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        process.exit(1);
    }
}

main();
