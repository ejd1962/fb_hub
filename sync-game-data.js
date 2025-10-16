#!/usr/bin/env node
/**
 * sync-game-data.js
 *
 * Syncs game panel data from source game projects into fb_hub's public/games directory.
 * This ensures fb_hub has local copies of all game metadata and assets it needs to display game panels.
 *
 * Run this before building fb_hub to ensure game data is up-to-date.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

/**
 * Game source configuration
 * Maps local game folder names to their source project paths
 */
const GAME_SOURCES = [
    {
        name: 'testgame',
        sourceProject: 'p21_testgame',
        sourcePath: 'C:/_projects/p21_testgame/testgame',
        files: [
            { source: 'public/fb_hub_data/game_info.json', dest: 'game_info.json' },
            { source: 'public/fb_hub_data/game_panel_image.png', dest: 'game_panel_image.png' }
        ]
    },
    {
        name: 'guess_a_word',
        sourceProject: 'p22_guess_a_word',
        sourcePath: 'C:/_projects/p22_guess_a_word/guess_a_word',
        files: [
            { source: 'public/fb_hub_data/game_info.json', dest: 'game_info.json' },
            { source: 'public/fb_hub_data/game_panel_image.png', dest: 'game_panel_image.png' }
        ]
    }
];

const DEST_BASE = path.join(__dirname, 'public', 'games');

/**
 * Copy a file with error handling
 */
function copyFile(sourcePath, destPath) {
    try {
        // Check if source exists
        if (!fs.existsSync(sourcePath)) {
            console.log(`${colors.yellow}  ⚠ Source file not found: ${sourcePath}${colors.reset}`);
            return false;
        }

        // Get file stats for size reporting
        const stats = fs.statSync(sourcePath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        // Copy the file
        fs.copyFileSync(sourcePath, destPath);

        console.log(`${colors.green}  ✓ Copied ${path.basename(destPath)} (${sizeKB} KB)${colors.reset}`);
        return true;
    } catch (error) {
        console.log(`${colors.red}  ✗ Error copying ${path.basename(destPath)}: ${error.message}${colors.reset}`);
        return false;
    }
}

/**
 * Sync files for a single game
 */
function syncGame(gameConfig) {
    console.log(`\n${colors.bright}${colors.cyan}Syncing ${gameConfig.name}${colors.reset} from ${colors.dim}${gameConfig.sourceProject}${colors.reset}`);

    // Check if source project exists
    if (!fs.existsSync(gameConfig.sourcePath)) {
        console.log(`${colors.red}  ✗ Source project not found: ${gameConfig.sourcePath}${colors.reset}`);
        return { success: false, filesCopied: 0 };
    }

    // Create destination directory if it doesn't exist
    const destDir = path.join(DEST_BASE, gameConfig.name);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`${colors.blue}  Created directory: ${destDir}${colors.reset}`);
    }

    // Copy each file
    let filesCopied = 0;
    for (const file of gameConfig.files) {
        const sourcePath = path.join(gameConfig.sourcePath, file.source);
        const destPath = path.join(destDir, file.dest);

        if (copyFile(sourcePath, destPath)) {
            filesCopied++;
        }
    }

    const allCopied = filesCopied === gameConfig.files.length;
    return { success: allCopied, filesCopied };
}

/**
 * Main function
 */
function main() {
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}Game Data Sync Tool${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.dim}Syncing game data from source projects to fb_hub...${colors.reset}`);

    // Create base games directory if needed
    if (!fs.existsSync(DEST_BASE)) {
        fs.mkdirSync(DEST_BASE, { recursive: true });
        console.log(`\n${colors.blue}Created base directory: ${DEST_BASE}${colors.reset}`);
    }

    // Sync all games
    let totalGames = 0;
    let successfulGames = 0;
    let totalFiles = 0;

    for (const gameConfig of GAME_SOURCES) {
        const result = syncGame(gameConfig);
        totalGames++;
        totalFiles += result.filesCopied;
        if (result.success) {
            successfulGames++;
        }
    }

    // Summary
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  Games synced: ${colors.green}${successfulGames}${colors.reset}/${totalGames}`);
    console.log(`  Files copied: ${colors.green}${totalFiles}${colors.reset}`);

    if (successfulGames === totalGames) {
        console.log(`\n${colors.green}${colors.bright}✓ All game data synced successfully!${colors.reset}`);
    } else {
        console.log(`\n${colors.yellow}${colors.bright}⚠ Some games had errors during sync${colors.reset}`);
    }

    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

    // Exit with error code if not all games synced
    if (successfulGames < totalGames) {
        process.exit(1);
    }
}

// Run main function
try {
    main();
} catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
}

export { syncGame, GAME_SOURCES };
