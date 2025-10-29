#!/usr/bin/env node

/**
 * clone_project.js
 *
 * Clones an existing game project to create a new one with a fresh identity.
 *
 * Usage: node clone_project.js
 *
 * The script will:
 * 1. Prompt for source project and new project name
 * 2. Find the next available pNN number
 * 3. Copy the project directory (excluding node_modules, dist, .git)
 * 4. Update all references to the old name with the new name
 * 5. Initialize a fresh git repository
 * 6. Add the new game to the fb_hub lobby
 * 7. Install npm dependencies for both main project and server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { exec } from 'child_process';
import readline from 'readline';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load TransVerse platform configuration
const configPath = path.join(__dirname, '..', 'transverse_configs.json');
const transverseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const FIRST_PORT_PROD = transverseConfig.first_port_in_prod_range;
const FIRST_PORT_DEV = transverseConfig.first_port_in_dev_range;
const FIRST_PORT_DEV_VITE = transverseConfig.first_port_in_dev_vite_range;

const PROJECTS_DIR = 'C:\\_projects';

// Utility: Convert string to Title Case
function toTitleCase(str) {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Utility: Convert string to lowercase with underscores
function toSnakeCase(str) {
    return str
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

// Utility: Ask user a question
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }));
}

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

// Find next available pNN number
function getNextProjectNumber(projects) {
    if (projects.length === 0) return 1;
    return Math.max(...projects.map(p => p.number)) + 1;
}

// Get next available game number from game_info.json files
async function getNextGameNumber() {
    const projects = getExistingProjects();
    let maxGameNumber = 0;

    for (const project of projects) {
        const gameInfoPath = path.join(PROJECTS_DIR, project.fullName, project.name, 'public', 'fb_hub_data', 'game_info.json');
        if (fs.existsSync(gameInfoPath)) {
            try {
                const content = fs.readFileSync(gameInfoPath, 'utf8');
                const gameInfo = JSON.parse(content);
                if (gameInfo.game_number > maxGameNumber) {
                    maxGameNumber = gameInfo.game_number;
                }
            } catch (error) {
                console.warn(`Warning: Could not parse ${gameInfoPath}`);
            }
        }
    }

    return maxGameNumber + 1;
}

// Recursively copy directory, excluding certain patterns
function copyDirectory(src, dest, excludePatterns = []) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Check if this path should be excluded
        const shouldExclude = excludePatterns.some(pattern => {
            if (typeof pattern === 'string') {
                return entry.name === pattern;
            } else if (pattern instanceof RegExp) {
                return pattern.test(entry.name);
            }
            return false;
        });

        if (shouldExclude) {
            console.log(`  Skipping: ${entry.name}`);
            continue;
        }

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath, excludePatterns);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Replace text in file
function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [search, replace] of replacements) {
        if (content.includes(search)) {
            content = content.replace(new RegExp(search, 'g'), replace);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }

    return false;
}

// Update lobby.tsx to include the new game
function updateLobby(newGameFolderName) {
    const lobbyPath = path.join(PROJECTS_DIR, 'p23_fb_hub', 'fb_hub', 'src', 'lobby.tsx');

    if (!fs.existsSync(lobbyPath)) {
        console.warn(`Warning: Could not find lobby.tsx at ${lobbyPath}`);
        return false;
    }

    let content = fs.readFileSync(lobbyPath, 'utf8');

    // Find the gameFolders array definition (around line 83)
    const gameFoldersRegex = /const gameFolders = \[([\s\S]*?)\];/;
    const match = content.match(gameFoldersRegex);

    if (!match) {
        console.warn('Warning: Could not find gameFolders array in lobby.tsx');
        return false;
    }

    const currentGames = match[1]
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(s => s.length > 0);

    if (currentGames.includes(newGameFolderName)) {
        console.log(`  Game '${newGameFolderName}' already exists in lobby.tsx`);
        return false;
    }

    currentGames.push(newGameFolderName);
    const newGamesArray = currentGames.map(g => `'${g}'`).join(', ');
    const newContent = content.replace(gameFoldersRegex, `const gameFolders = [${newGamesArray}];`);

    fs.writeFileSync(lobbyPath, newContent, 'utf8');
    return true;
}

// Main script
async function main() {
    console.log('=== Clone Project Script ===\n');

    const projects = getExistingProjects();

    console.log('Existing projects:');
    projects.forEach(p => console.log(`  - ${p.fullName}`));
    console.log();

    // Get source project
    const sourceInput = await askQuestion('Enter source project (e.g., p21_testgame or testgame): ');
    const sourceInputClean = sourceInput.trim();

    let sourceProject = projects.find(p =>
        p.fullName === sourceInputClean || p.name === sourceInputClean
    );

    if (!sourceProject) {
        console.error(`Error: Project '${sourceInputClean}' not found.`);
        process.exit(1);
    }

    console.log(`Source project: ${sourceProject.fullName}\n`);

    // Get new project name
    const newNameInput = await askQuestion('Enter new project name (e.g., word_battle): ');
    const newName = toSnakeCase(newNameInput.trim());

    if (!newName) {
        console.error('Error: Invalid project name.');
        process.exit(1);
    }

    const newNameTitle = toTitleCase(newName);
    const nextProjectNumber = getNextProjectNumber(projects);
    const nextGameNumber = await getNextGameNumber();
    const newProjectDir = `p${nextProjectNumber.toString().padStart(2, '0')}_${newName}`;
    const newProjectPath = path.join(PROJECTS_DIR, newProjectDir);
    const newGamePath = path.join(newProjectPath, newName);

    console.log(`\nNew project details:`);
    console.log(`  Project directory: ${newProjectDir}`);
    console.log(`  Game folder: ${newName}`);
    console.log(`  Display name: ${newNameTitle}`);
    console.log(`  Game number: ${nextGameNumber}`);
    console.log(`  Production port: ${FIRST_PORT_PROD + nextGameNumber}`);
    console.log(`  Dev backend port: ${FIRST_PORT_DEV + nextGameNumber}`);
    console.log(`  Dev frontend port: ${FIRST_PORT_DEV_VITE + nextGameNumber}\n`);

    const confirm = await askQuestion('Proceed with cloning? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('Aborted.');
        process.exit(0);
    }

    console.log('\n=== Starting clone process ===\n');

    // Step 1: Copy directory structure
    console.log('Step 1: Copying directory structure...');
    const sourcePath = path.join(PROJECTS_DIR, sourceProject.fullName);
    copyDirectory(sourcePath, newProjectPath, ['node_modules', 'dist', '.git', '.gitignore']);
    console.log('  ✓ Directory copied\n');

    // Step 2: Rename inner directory
    console.log('Step 2: Renaming inner directory...');
    const oldInnerPath = path.join(newProjectPath, sourceProject.name);
    if (fs.existsSync(oldInnerPath) && oldInnerPath !== newGamePath) {
        fs.renameSync(oldInnerPath, newGamePath);
        console.log(`  ✓ Renamed ${sourceProject.name}/ to ${newName}/\n`);
    } else {
        console.log(`  ✓ Inner directory already named ${newName}/\n`);
    }

    // Step 3: Update file contents
    console.log('Step 3: Updating file contents...');

    const oldNameSnake = sourceProject.name;
    const oldNameTitle = toTitleCase(oldNameSnake);

    const replacements = [
        [oldNameSnake, newName],
        [oldNameTitle, newNameTitle],
    ];

    // Update package.json (name and ports)
    const packageJsonPath = path.join(newGamePath, 'package.json');
    let pkgJson = fs.readFileSync(packageJsonPath, 'utf8');

    // Replace name
    pkgJson = pkgJson.replace(new RegExp(oldNameSnake, 'g'), newName);

    // Replace PORT=9xxx with new production port (tolerate 0+ spaces before &&)
    pkgJson = pkgJson.replace(/PORT=9\d{3}\s*&&/g, `PORT=${FIRST_PORT_PROD + nextGameNumber} &&`);

    // Replace PORT=10xxx with new dev port (tolerate 0+ spaces before &&)
    pkgJson = pkgJson.replace(/PORT=10\d{3}\s*&&/g, `PORT=${FIRST_PORT_DEV + nextGameNumber} &&`);

    fs.writeFileSync(packageJsonPath, pkgJson, 'utf8');
    console.log('  ✓ Updated package.json');

    // Update server package.json and adjust ports
    const serverPackageJsonPath = path.join(newGamePath, 'server', 'package.json');
    if (fs.existsSync(serverPackageJsonPath)) {
        let serverPkg = JSON.parse(fs.readFileSync(serverPackageJsonPath, 'utf8'));

        // Update the name field explicitly
        serverPkg.name = `${newName}-server`;

        // Update the description field - replace old game name with new one
        if (serverPkg.description) {
            serverPkg.description = serverPkg.description.replace(new RegExp(oldNameTitle, 'gi'), newNameTitle);
            serverPkg.description = serverPkg.description.replace(new RegExp(oldNameSnake, 'gi'), newName);
        }

        // Convert back to string to handle PORT replacements
        let serverPkgString = JSON.stringify(serverPkg, null, 2);

        // Replace PORT=9xxx with new production port (tolerate 0+ spaces before &&)
        serverPkgString = serverPkgString.replace(/PORT=9\d{3}\s*&&/g, `PORT=${FIRST_PORT_PROD + nextGameNumber} &&`);

        // Replace PORT=10xxx with new dev port (tolerate 0+ spaces before &&)
        serverPkgString = serverPkgString.replace(/PORT=10\d{3}\s*&&/g, `PORT=${FIRST_PORT_DEV + nextGameNumber} &&`);

        fs.writeFileSync(serverPackageJsonPath, serverPkgString, 'utf8');
        console.log('  ✓ Updated server/package.json');
    }

    // Update vite.config.ts port
    const viteConfigPath = path.join(newGamePath, 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
        let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

        // Replace port: 11xxx with new frontend dev port
        viteConfig = viteConfig.replace(/port:\s*11\d{3},/, `port: ${FIRST_PORT_DEV_VITE + nextGameNumber},`);

        // Also handle old 8080 port if it exists
        viteConfig = viteConfig.replace(/port:\s*8080,/, `port: ${FIRST_PORT_DEV_VITE + nextGameNumber},`);

        fs.writeFileSync(viteConfigPath, viteConfig, 'utf8');
        console.log('  ✓ Updated vite.config.ts');
    }

    // Update index.html
    const indexHtmlPath = path.join(newGamePath, 'index.html');
    if (replaceInFile(indexHtmlPath, replacements)) {
        console.log('  ✓ Updated index.html');
    }

    // Update game_info.json
    const gameInfoPath = path.join(newGamePath, 'public', 'fb_hub_data', 'game_info.json');
    if (fs.existsSync(gameInfoPath)) {
        let gameInfo = fs.readFileSync(gameInfoPath, 'utf8');

        // Replace game name
        gameInfo = gameInfo.replace(new RegExp(`"game_name"\\s*:\\s*"${oldNameTitle}"`, 'g'), `"game_name" : "${newNameTitle}"`);

        // Replace game number
        gameInfo = gameInfo.replace(/"game_number"\s*:\s*\d+/, `"game_number" : ${nextGameNumber}`);

        // Replace port numbers
        const oldGameNumber = await (async () => {
            const oldGameInfoPath = path.join(sourcePath, sourceProject.name, 'public', 'fb_hub_data', 'game_info.json');
            if (fs.existsSync(oldGameInfoPath)) {
                const content = JSON.parse(fs.readFileSync(oldGameInfoPath, 'utf8'));
                return content.game_number || 1;
            }
            return 1;
        })();

        gameInfo = gameInfo.replace(new RegExp(`:${FIRST_PORT_PROD + oldGameNumber}`, 'g'), `:${FIRST_PORT_PROD + nextGameNumber}`);
        gameInfo = gameInfo.replace(new RegExp(`:${FIRST_PORT_DEV + oldGameNumber}`, 'g'), `:${FIRST_PORT_DEV + nextGameNumber}`);

        fs.writeFileSync(gameInfoPath, gameInfo, 'utf8');
        console.log('  ✓ Updated public/fb_hub_data/game_info.json');
    }

    console.log();

    // Step 4: Initialize git repo
    console.log('Step 4: Initializing git repository...');
    try {
        await execAsync('git init', { cwd: newGamePath });
        await execAsync('git add .', { cwd: newGamePath });
        await execAsync(`git commit -m "Initial commit from clone of ${sourceProject.fullName}"`, { cwd: newGamePath });
        console.log('  ✓ Git repository initialized\n');
    } catch (error) {
        console.error('  ✗ Error initializing git:', error.message);
        console.log();
    }

    // Step 5: Update fb_hub lobby
    console.log('Step 5: Updating fb_hub lobby...');
    if (updateLobby(newName)) {
        console.log('  ✓ Added game to lobby.tsx\n');
    } else {
        console.log('  - No changes needed in lobby.tsx\n');
    }

    // Step 6: Install npm dependencies
    console.log('Step 6: Installing npm dependencies...');
    console.log('  This may take a few minutes...\n');

    try {
        console.log('  Installing main project dependencies...');
        await execAsync('npm install --legacy-peer-deps', { cwd: newGamePath });
        console.log('  ✓ Main dependencies installed\n');
    } catch (error) {
        console.error('  ✗ Error installing main dependencies:', error.message);
        console.log('  You can manually run: npm install --legacy-peer-deps\n');
    }

    const serverPath = path.join(newGamePath, 'server');
    if (fs.existsSync(serverPath) && fs.existsSync(path.join(serverPath, 'package.json'))) {
        try {
            console.log('  Installing server dependencies...');
            await execAsync('npm install', { cwd: serverPath });
            console.log('  ✓ Server dependencies installed\n');
        } catch (error) {
            console.error('  ✗ Error installing server dependencies:', error.message);
            console.log('  You can manually run: cd server && npm install\n');
        }
    }

    console.log('=== Clone complete! ===\n');
    console.log(`New project created at: ${newProjectPath}`);
    console.log(`\nYou can now run:`);
    console.log(`  1. cd ${newGamePath}`);
    console.log(`  2. npm run dev (client on port ${FIRST_PORT_DEV_VITE + nextGameNumber})`);
    console.log(`  3. npm run server:dev (server on port ${FIRST_PORT_DEV + nextGameNumber})`);
    console.log(`\nThe game has been added to the TransVerse Hub lobby.`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
