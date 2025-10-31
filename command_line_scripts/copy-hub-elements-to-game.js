#!/usr/bin/env node
/**
 * copy-hub-elements-to-game.js
 *
 * Copies banner, footer, and other hub elements FROM fb_hub TO a specified game project.
 * Before copying, backs up existing game files to old_hub_elements/yyyymmdd-hhmmss/
 * subdirectory where yyyymmdd-hhmmss is the timestamp in 24-hour format.
 *
 * Usage: copy-hub-elements-to-game.js <game_name>
 * Where game_name can be: p21_testgame, testgame, p21, or 21
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECTS_DIR = 'C:\\_projects';
const FB_HUB_SRC = path.join(__dirname, 'src');

// Files to copy from fb_hub
const FILES_TO_COPY = [
    'banner.tsx',
    'footer.tsx',
    'DebugContext.tsx',
    'NavigationHistoryContext.tsx',
    'firebase.ts',
    'about.tsx',
    'jobs.tsx',
    'contact.tsx',
    'help.tsx',
    'privacy.tsx',
    'terms.tsx'
];

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
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

// Generate timestamp string
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// Backup a file
function backupFile(sourceFile, backupDir, timestamp) {
    try {
        if (!fs.existsSync(sourceFile)) {
            return { backed_up: false, reason: 'file_not_exist' };
        }

        const timestampedBackupDir = path.join(backupDir, timestamp);
        if (!fs.existsSync(timestampedBackupDir)) {
            fs.mkdirSync(timestampedBackupDir, { recursive: true });
        }

        const originalFilename = path.basename(sourceFile);
        const backupPath = path.join(timestampedBackupDir, originalFilename);

        fs.copyFileSync(sourceFile, backupPath);

        const stats = fs.statSync(backupPath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        console.log(`${colors.yellow}  → Backed up: ${originalFilename} (${sizeKB} KB)${colors.reset}`);

        return { backed_up: true, backup_path: backupPath };
    } catch (error) {
        console.log(`${colors.red}  ✗ Error backing up ${path.basename(sourceFile)}: ${error.message}${colors.reset}`);
        return { backed_up: false, reason: 'error', error: error.message };
    }
}

// Copy a file
function copyFile(filename, destDir) {
    const sourcePath = path.join(FB_HUB_SRC, filename);
    const destPath = path.join(destDir, filename);

    try {
        if (!fs.existsSync(sourcePath)) {
            console.log(`${colors.red}  ✗ Source file not found: ${sourcePath}${colors.reset}`);
            return { success: false, reason: 'source_not_found' };
        }

        const stats = fs.statSync(sourcePath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        fs.copyFileSync(sourcePath, destPath);

        console.log(`${colors.green}  ✓ Copied: ${filename} (${sizeKB} KB)${colors.reset}`);
        return { success: true, size: sizeKB };
    } catch (error) {
        console.log(`${colors.red}  ✗ Error copying ${filename}: ${error.message}${colors.reset}`);
        return { success: false, reason: 'error', error: error.message };
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}Copy Hub Elements to Game Tool${colors.reset}`);
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

    console.log(`${colors.green}Target game: ${project.fullName}${colors.reset}\n`);

    const gameSrcDir = path.join(PROJECTS_DIR, project.fullName, project.name, 'src');
    const backupDir = path.join(PROJECTS_DIR, project.fullName, project.name, 'old_hub_elements');

    if (!fs.existsSync(gameSrcDir)) {
        console.error(`${colors.red}Error: Game src directory not found: ${gameSrcDir}${colors.reset}`);
        process.exit(1);
    }

    const timestamp = getTimestamp();

    let totalFiles = 0;
    let successfulCopies = 0;
    let backedUpFiles = 0;

    for (const filename of FILES_TO_COPY) {
        totalFiles++;
        console.log(`\n${colors.bright}${colors.cyan}Processing: ${filename}${colors.reset}`);

        const gameFile = path.join(gameSrcDir, filename);

        const backupResult = backupFile(gameFile, backupDir, timestamp);
        if (backupResult.backed_up) {
            backedUpFiles++;
        } else if (backupResult.reason === 'file_not_exist') {
            console.log(`${colors.dim}  (No existing file to backup)${colors.reset}`);
        }

        const copyResult = copyFile(filename, gameSrcDir);
        if (copyResult.success) {
            successfulCopies++;
        }
    }

    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  Files processed: ${totalFiles}`);
    console.log(`  Files backed up: ${colors.yellow}${backedUpFiles}${colors.reset}`);
    console.log(`  Files copied: ${colors.green}${successfulCopies}${colors.reset}/${totalFiles}`);

    if (successfulCopies === totalFiles) {
        console.log(`\n${colors.green}${colors.bright}✓ All hub elements copied to ${project.fullName} successfully!${colors.reset}`);
    } else {
        console.log(`\n${colors.yellow}${colors.bright}⚠ Some files had errors during copy${colors.reset}`);
    }

    console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

    if (successfulCopies < totalFiles) {
        process.exit(1);
    }
}

// Run
try {
    main();
} catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
}
