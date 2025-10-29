/**
 * increment-build.js
 *
 * Increments build number in package.json and creates a git commit
 * Build number format: 0.0.X where X increments on each build
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_JSON_PATH = path.join(__dirname, 'package.json');

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
 * Executes a shell command and returns the output
 */
function exec(command, silent = false) {
    try {
        const output = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
        return output;
    } catch (error) {
        if (!silent) {
            console.error(`${colors.red}Error executing command: ${command}${colors.reset}`);
            console.error(error.message);
        }
        throw error;
    }
}

/**
 * Gets the current build number from package.json
 */
function getCurrentBuildNumber() {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const version = packageJson.version || '0.0.0';
    const parts = version.split('.');
    return parseInt(parts[2] || '0', 10);
}

/**
 * Updates the build number in package.json
 */
function updateBuildNumber(newBuildNumber) {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    packageJson.version = `0.0.${newBuildNumber}`;
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
}

/**
 * Checks if there are any uncommitted changes
 */
function hasUncommittedChanges() {
    try {
        const status = exec('git status --porcelain', true);
        return status.trim().length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Gets a list of changed files
 */
function getChangedFiles() {
    try {
        const status = exec('git status --porcelain', true);
        return status
            .trim()
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.substring(3)); // Remove status prefix (e.g., "M ", "A ")
    } catch (error) {
        return [];
    }
}

/**
 * Main function
 */
function main() {
    console.log(`${colors.bright}${colors.cyan}=== Build Increment Tool ===${colors.reset}\n`);

    // Check if we're in a git repository
    try {
        exec('git rev-parse --git-dir', true);
    } catch (error) {
        console.error(`${colors.red}Error: Not in a git repository${colors.reset}`);
        process.exit(1);
    }

    // Check if there are changes to commit
    if (!hasUncommittedChanges()) {
        console.log(`${colors.yellow}No uncommitted changes found. Nothing to commit.${colors.reset}`);
        process.exit(0);
    }

    // Get current build number
    const currentBuild = getCurrentBuildNumber();
    const newBuild = currentBuild + 1;

    console.log(`${colors.dim}Current build: ${currentBuild}${colors.reset}`);
    console.log(`${colors.green}New build: ${newBuild}${colors.reset}\n`);

    // Show changed files
    const changedFiles = getChangedFiles();
    console.log(`${colors.bright}Changed files:${colors.reset}`);
    changedFiles.forEach(file => {
        console.log(`  ${colors.cyan}→${colors.reset} ${file}`);
    });
    console.log();

    // Update build number
    console.log(`${colors.blue}Updating package.json...${colors.reset}`);
    updateBuildNumber(newBuild);

    // Stage all changes
    console.log(`${colors.blue}Staging changes...${colors.reset}`);
    exec('git add .');

    // Create commit
    const commitMessage = `Build ${newBuild}`;
    console.log(`${colors.blue}Creating commit: "${commitMessage}"${colors.reset}`);
    exec(`git commit -m "${commitMessage}"`);

    console.log(`\n${colors.green}${colors.bright}✓ Build ${newBuild} committed successfully!${colors.reset}\n`);

    // Show git log
    console.log(`${colors.dim}Recent commits:${colors.reset}`);
    exec('git log --oneline -5');
}

main();
