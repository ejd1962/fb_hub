#!/usr/bin/env node

/**
 * copy-game-info-to-hub.js
 *
 * Copies game information FROM a game project TO the TransVerse Hub.
 * This allows the hub lobby to display the game's information and panel image.
 *
 * Usage: copy-game-info-to-hub.js <game_name>
 * Where game_name can be: p21_testgame, testgame, p21, or 21
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_DIR = 'C:\\_projects';
const HUB_PUBLIC_GAMES_PATH = path.join(__dirname, 'public', 'games');

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};

// Get list of all existing pNN projects (excluding xxx_ prefixed ones)
function getExistingProjects() {
    const entries = fs.readdirSync(PROJECTS_DIR);
    const projects = entries
        .filter(entry => {
            const match = entry.match(/^p(\d+)_(.+)$/);
            return match && !entry.startsWith('xxx_');
        })
        .map(entry => {
            const match = entry.match(/^p(\d+)_(.+)$/);
            return {
                fullName: entry,
                number: parseInt(match[1], 10),
                name: match[2]
            };
        })
        .sort((a, b) => a.number - b.number);

    return projects;
}

// Find project by various input formats
function findProject(input, projects) {
    const cleanInput = input.trim();

    // Try exact full name match
    let project = projects.find(p => p.fullName === cleanInput);
    if (project) return project;

    // Try game name match
    project = projects.find(p => p.name === cleanInput);
    if (project) return project;

    // Try pNN format
    const pMatch = cleanInput.match(/^p(\d+)$/i);
    if (pMatch) {
        const num = parseInt(pMatch[1], 10);
        project = projects.find(p => p.number === num);
        if (project) return project;
    }

    // Try just number
    const numMatch = cleanInput.match(/^(\d+)$/);
    if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        project = projects.find(p => p.number === num);
        if (project) return project;
    }

    return null;
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}Copy Game Info to Hub Tool${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

    const projects = getExistingProjects();

    console.log('Available game projects:');
    projects.forEach(p => console.log(`  - ${p.fullName}`));
    console.log();

    let gameInput;
    if (args.length > 0) {
        gameInput = args[0];
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        gameInput = await new Promise(resolve => rl.question('Enter game project (e.g., p21_testgame, testgame, p21, or 21): ', answer => {
            rl.close();
            resolve(answer);
        }));
    }

    const project = findProject(gameInput, projects);

    if (!project) {
        console.error(`${colors.red}Error: Game project '${gameInput}' not found.${colors.reset}`);
        process.exit(1);
    }

    console.log(`${colors.green}Source game: ${project.fullName}${colors.reset}`);

    const gamePublicPath = path.join(PROJECTS_DIR, project.fullName, project.name, 'public', 'fb_hub_data');
    const gameInfoSource = path.join(gamePublicPath, 'game_info.json');

    // Check if source game_info.json exists
    if (!fs.existsSync(gameInfoSource)) {
        console.error(`${colors.red}Error: game_info.json not found at ${gameInfoSource}${colors.reset}`);
        process.exit(1);
    }

    // Read and parse game_info.json
    const gameInfo = JSON.parse(fs.readFileSync(gameInfoSource, 'utf8'));
    const panelImageSource = path.join(gamePublicPath, gameInfo.game_panel_image);

    // Check if game panel image exists
    if (!fs.existsSync(panelImageSource)) {
        console.error(`${colors.red}Error: Panel image '${gameInfo.game_panel_image}' not found at ${panelImageSource}${colors.reset}`);
        process.exit(1);
    }

    // Create destination directory if it doesn't exist
    const hubGameDir = path.join(HUB_PUBLIC_GAMES_PATH, project.name);
    if (!fs.existsSync(hubGameDir)) {
        fs.mkdirSync(hubGameDir, { recursive: true });
        console.log(`${colors.yellow}Created directory: ${hubGameDir}${colors.reset}`);
    }

    console.log(`${colors.cyan}Destination: ${hubGameDir}${colors.reset}\n`);

    // Copy game_info.json
    const gameInfoDest = path.join(hubGameDir, 'game_info.json');
    fs.copyFileSync(gameInfoSource, gameInfoDest);
    const gameInfoStats = fs.statSync(gameInfoDest);
    console.log(`${colors.green}✓ Copied game_info.json (${(gameInfoStats.size / 1024).toFixed(1)} KB)${colors.reset}`);

    // Copy panel image
    const panelImageDest = path.join(hubGameDir, gameInfo.game_panel_image);
    fs.copyFileSync(panelImageSource, panelImageDest);
    const imageStats = fs.statSync(panelImageDest);
    console.log(`${colors.green}✓ Copied ${gameInfo.game_panel_image} (${(imageStats.size / 1024).toFixed(1)} KB)${colors.reset}`);

    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${colors.green}✓ Copy Complete!${colors.reset}`);
    console.log(`The hub can now display '${gameInfo.game_name}' in the lobby.`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

// Run
try {
    main();
} catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
}
