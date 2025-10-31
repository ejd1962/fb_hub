#!/usr/bin/env node
/**
 * show-routes.js
 *
 * Displays all @route markers found in React component files
 * Shows a summary of all routes in the application
 *
 * Adapted from endpoint display script for frontend routes
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
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
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
 * Extracts @route markers from a file
 */
function extractRouteMarkers(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const routes = [];

    // Match @route /path/to/route
    const routeRegex = /@route\s+(\/\S+)/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
        routes.push({
            path: match[1],
            file: filePath,
        });
    }

    return routes;
}

/**
 * Gets the component name from a file path
 */
function getComponentNameFromFile(filePath) {
    const fileName = path.basename(filePath, '.tsx');
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

/**
 * Main function
 */
function main() {
    console.log(`${colors.bright}${colors.cyan}=== React Routes Summary ===${colors.reset}\n`);

    // Get all .tsx files
    const tsxFiles = getTsxFiles(SRC_DIR);

    const allRoutes = [];

    tsxFiles.forEach(filePath => {
        const routes = extractRouteMarkers(filePath);
        if (routes.length > 0) {
            const componentName = getComponentNameFromFile(filePath);
            allRoutes.push({
                componentName,
                routes,
                filePath,
            });
        }
    });

    if (allRoutes.length === 0) {
        console.log(`${colors.yellow}No @route markers found in any files.${colors.reset}`);
        console.log(`${colors.dim}Run 'npm run add-routes' to add route markers.${colors.reset}\n`);
        return;
    }

    // Sort routes alphabetically by path
    const sortedRoutes = allRoutes
        .flatMap(comp => comp.routes.map(route => ({
            path: route.path,
            component: comp.componentName,
            file: route.file,
        })))
        .sort((a, b) => a.path.localeCompare(b.path));

    console.log(`${colors.bright}Found ${sortedRoutes.length} route(s):\n${colors.reset}`);

    // Display routes in a table format
    console.log(`${colors.dim}┌${'─'.repeat(50)}┬${'─'.repeat(30)}┐${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} ${colors.bright}Route Path${' '.repeat(39)}${colors.reset}${colors.dim}│${colors.reset} ${colors.bright}Component${' '.repeat(20)}${colors.reset}${colors.dim}│${colors.reset}`);
    console.log(`${colors.dim}├${'─'.repeat(50)}┼${'─'.repeat(30)}┤${colors.reset}`);

    sortedRoutes.forEach(route => {
        const pathDisplay = route.path.padEnd(49);
        const componentDisplay = route.component.padEnd(29);
        console.log(`${colors.dim}│${colors.reset} ${colors.cyan}${pathDisplay}${colors.reset}${colors.dim}│${colors.reset} ${colors.green}${componentDisplay}${colors.reset}${colors.dim}│${colors.reset}`);
    });

    console.log(`${colors.dim}└${'─'.repeat(50)}┴${'─'.repeat(30)}┘${colors.reset}\n`);

    // Show file locations
    console.log(`${colors.bright}Route Definitions by File:\n${colors.reset}`);
    allRoutes.forEach(comp => {
        const relativePath = path.relative(__dirname, comp.filePath);
        console.log(`${colors.blue}${comp.componentName}${colors.reset} ${colors.dim}(${relativePath})${colors.reset}`);
        comp.routes.forEach(route => {
            console.log(`  ${colors.cyan}→${colors.reset} ${route.path}`);
        });
        console.log();
    });

    console.log(`${colors.dim}Total: ${sortedRoutes.length} route(s) in ${allRoutes.length} component(s)${colors.reset}\n`);
}

main();
