#\!/usr/bin/env node
/**
 * add-route-markers.js
 *
 * Automatically adds @route markers to React Router route components
 * Scans all .tsx files in src/ directory for route definitions
 *
 * Adapted from endpoint marker script for frontend routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, 'src');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

/**
 * Recursively gets all .tsx files in a directory
 */
function getTsxFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getTsxFiles(filePath, fileList);
        } else if (file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * Checks if a component already has a @route marker
 */
function hasRouteMarker(content) {
    return /@route\s+\/\S+/.test(content);
}

/**
 * Extracts the route path from App.tsx route definition
 */
function getRoutePathForComponent(componentName, appTsxContent) {
    // Match: <Route path="/something" element={<ComponentName />} />
    const routeRegex = new RegExp(`<Route\\s+path=["']([^"']+)["']\\s+element=\\{<${componentName}[^>]*>\\}`, 'i');
    const match = appTsxContent.match(routeRegex);
    return match ? match[1] : null;
}

/**
 * Gets the component name from a file path
 * e.g., C:\...\src\profile.tsx -> Profile
 */
function getComponentNameFromFile(filePath) {
    const fileName = path.basename(filePath, '.tsx');
    // Capitalize first letter
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

/**
 * Adds @route marker to a component file
 */
function addRouteMarker(filePath, routePath) {
    let content = fs.readFileSync(filePath, 'utf-8');

    if (hasRouteMarker(content)) {
        return { modified: false, reason: 'already has marker' };
    }

    // Find the default export function
    const exportRegex = /export default function \w+\(\)/;
    const match = content.match(exportRegex);

    if (!match) {
        return { modified: false, reason: 'no default export function found' };
    }

    // Add marker comment above the function
    const marker = `/**\n * @route ${routePath}\n */\n`;
    const insertPosition = content.indexOf(match[0]);

    const newContent =
        content.substring(0, insertPosition) +
        marker +
        content.substring(insertPosition);

    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { modified: true, reason: 'marker added' };
}

/**
 * Main function
 */
function main() {
    console.log(`${colors.bright}${colors.cyan}=== React Route Marker Tool ===${colors.reset}\n`);

    // Read App.tsx to get route definitions
    const appTsxPath = path.join(SRC_DIR, 'App.tsx');
    if (!fs.existsSync(appTsxPath)) {
        console.error(`${colors.yellow}Error: App.tsx not found at ${appTsxPath}${colors.reset}`);
        process.exit(1);
    }

    const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

    // Get all .tsx files
    const tsxFiles = getTsxFiles(SRC_DIR);

    console.log(`Found ${tsxFiles.length} .tsx files\n`);

    let modifiedCount = 0;
    let skippedCount = 0;
    let noRouteCount = 0;

    tsxFiles.forEach(filePath => {
        const relativePath = path.relative(__dirname, filePath);
        const componentName = getComponentNameFromFile(filePath);

        // Skip App.tsx and utility files
        if (componentName === 'App' || componentName === 'Main' || filePath.includes('Context') || filePath.includes('Utils')) {
            console.log(`${colors.yellow}⊘ ${relativePath} - Skipped (utility/config file)${colors.reset}`);
            skippedCount++;
            return;
        }

        // Get route path from App.tsx
        const routePath = getRoutePathForComponent(componentName, appTsxContent);

        if (!routePath) {
            console.log(`${colors.yellow}⊘ ${relativePath} - No route found in App.tsx${colors.reset}`);
            noRouteCount++;
            return;
        }

        // Add marker
        const result = addRouteMarker(filePath, routePath);

        if (result.modified) {
            console.log(`${colors.green}✓ ${relativePath} - Added @route ${routePath}${colors.reset}`);
            modifiedCount++;
        } else {
            console.log(`${colors.blue}○ ${relativePath} - ${result.reason}${colors.reset}`);
            skippedCount++;
        }
    });

    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`  Modified: ${colors.green}${modifiedCount}${colors.reset}`);
    console.log(`  Skipped: ${colors.yellow}${skippedCount}${colors.reset}`);
    console.log(`  No route: ${colors.yellow}${noRouteCount}${colors.reset}`);
    console.log(`  Total: ${tsxFiles.length}\n`);
}

main();
