#!/usr/bin/env node
/**
 * show-doc-flow.js
 *
 * Displays all documented control flows:
 * - HTTP Endpoints (server-side)
 * - Socket.io Events incoming and outgoing (server-side)
 * - React Router Routes (client-side)
 *
 * Reads markers added by doc-flow.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - must match doc-flow.js
const CONFIG = {
  serverFiles: [
    './server/index.js',
  ],
  clientDir: './src',
  clientExtensions: ['.tsx', '.ts'],
};

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
  red: '\x1b[31m',
};

// ============================================================================
// SERVER-SIDE PARSING (Express + Socket.io)
// ============================================================================

function parseServerFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { endpoints: [], socketIn: [], socketOut: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const endpoints = [];
  const socketIn = [];
  const socketOut = [];

  let currentMarker = null;
  let currentComments = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect markers
    if (line.includes('@endpoint')) {
      currentMarker = 'endpoint';
      currentComments = [];
      continue;
    }

    if (line.includes('@socket-in')) {
      currentMarker = 'socket-in';
      currentComments = [];
      continue;
    }

    if (line.includes('@socket-out')) {
      currentMarker = 'socket-out';
      currentComments = [];
      continue;
    }

    // Collect comments after marker
    if (currentMarker && line.startsWith('//')) {
      const comment = line.substring(2).trim();
      if (comment) {
        currentComments.push(comment);
      }
      continue;
    }

    // Process the actual endpoint/event line
    if (currentMarker && !line.startsWith('//')) {
      if (currentMarker === 'endpoint') {
        const match = line.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const [, method, route] = match;
          endpoints.push({
            method: method.toUpperCase(),
            route,
            comments: [...currentComments]
          });
        }
      } else if (currentMarker === 'socket-in') {
        const match = line.match(/socket\.on\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const [, eventName] = match;
          socketIn.push({
            event: eventName,
            comments: [...currentComments]
          });
        }
      } else if (currentMarker === 'socket-out') {
        const match = line.match(/\.emit\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const [, eventName] = match;
          // Avoid duplicates
          if (!socketOut.find(e => e.event === eventName)) {
            socketOut.push({
              event: eventName,
              comments: [...currentComments]
            });
          }
        }
      }

      currentMarker = null;
      currentComments = [];
    }
  }

  return { endpoints, socketIn, socketOut };
}

// ============================================================================
// CLIENT-SIDE PARSING (React Routes)
// ============================================================================

function getTsxFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getTsxFiles(filePath, fileList);
    } else if (CONFIG.clientExtensions.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function parseClientFiles() {
  const clientDir = path.join(__dirname, CONFIG.clientDir);
  if (!fs.existsSync(clientDir)) {
    return [];
  }

  const routes = [];
  const tsxFiles = getTsxFiles(clientDir);

  tsxFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const routeMatch = content.match(/@route\s+(\/\S+)/);

    if (routeMatch) {
      const componentName = path.basename(filePath, path.extname(filePath));
      const formattedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

      routes.push({
        path: routeMatch[1],
        component: formattedName,
        file: path.relative(__dirname, filePath)
      });
    }
  });

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

function displayServerFlows({ endpoints, socketIn, socketOut }) {
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}HTTP ENDPOINTS (Server-side)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);

  if (endpoints.length === 0) {
    console.log(`${colors.dim}  No HTTP endpoints found${colors.reset}`);
  } else {
    endpoints.forEach(({ method, route, comments }) => {
      console.log('');
      console.log(`  ${colors.green}${method.padEnd(7)}${colors.reset} ${colors.bright}${route}${colors.reset}`);
      comments.forEach(comment => {
        console.log(`  ${colors.dim}${comment}${colors.reset}`);
      });
    });
  }

  console.log('');
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}SOCKET.IO INCOMING (Server receives)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);

  if (socketIn.length === 0) {
    console.log(`${colors.dim}  No incoming socket events found${colors.reset}`);
  } else {
    socketIn.forEach(({ event, comments }) => {
      console.log('');
      console.log(`  ${colors.cyan}⯈${colors.reset} ${colors.bright}${event}${colors.reset}`);
      comments.forEach(comment => {
        console.log(`  ${colors.dim}${comment}${colors.reset}`);
      });
    });
  }

  console.log('');
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}SOCKET.IO OUTGOING (Server emits)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);

  if (socketOut.length === 0) {
    console.log(`${colors.dim}  No outgoing socket events found${colors.reset}`);
  } else {
    socketOut.forEach(({ event, comments }) => {
      console.log('');
      console.log(`  ${colors.magenta}⯇${colors.reset} ${colors.bright}${event}${colors.reset}`);
      comments.forEach(comment => {
        console.log(`  ${colors.dim}${comment}${colors.reset}`);
      });
    });
  }

  console.log('');
}

function displayClientRoutes(routes) {
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}REACT ROUTES (Client-side)${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);

  if (routes.length === 0) {
    console.log(`${colors.dim}  No routes found${colors.reset}`);
    console.log(`${colors.dim}  Run 'npm run doc-flow' to add route markers${colors.reset}`);
  } else {
    console.log('');
    console.log(`${colors.dim}  ┌${'─'.repeat(40)}┬${'─'.repeat(35)}┐${colors.reset}`);
    console.log(`${colors.dim}  │${colors.reset} ${colors.bright}Route Path${' '.repeat(29)}${colors.reset}${colors.dim}│${colors.reset} ${colors.bright}Component${' '.repeat(25)}${colors.reset}${colors.dim}│${colors.reset}`);
    console.log(`${colors.dim}  ├${'─'.repeat(40)}┼${'─'.repeat(35)}┤${colors.reset}`);

    routes.forEach(route => {
      const pathDisplay = route.path.padEnd(39);
      const componentDisplay = route.component.padEnd(34);
      console.log(`${colors.dim}  │${colors.reset} ${colors.cyan}${pathDisplay}${colors.reset}${colors.dim}│${colors.reset} ${colors.green}${componentDisplay}${colors.reset}${colors.dim}│${colors.reset}`);
    });

    console.log(`${colors.dim}  └${'─'.repeat(40)}┴${'─'.repeat(35)}┘${colors.reset}`);
  }

  console.log('');
}

function displaySummary(serverData, routes) {
  const { endpoints, socketIn, socketOut } = serverData;
  const total = endpoints.length + socketIn.length + socketOut.length + routes.length;

  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`  ${colors.green}HTTP Endpoints:${colors.reset}       ${endpoints.length}`);
  console.log(`  ${colors.cyan}Socket.io Incoming:${colors.reset}   ${socketIn.length}`);
  console.log(`  ${colors.magenta}Socket.io Outgoing:${colors.reset}   ${socketOut.length}`);
  console.log(`  ${colors.blue}React Routes:${colors.reset}         ${routes.length}`);
  console.log(`  ${colors.dim}${'─'.repeat(30)}${colors.reset}`);
  console.log(`  ${colors.bright}Total Control Flows:${colors.reset}  ${total}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  console.log('');

  // Collect all server-side flows
  let allEndpoints = [];
  let allSocketIn = [];
  let allSocketOut = [];

  CONFIG.serverFiles.forEach(file => {
    const serverPath = path.join(__dirname, file);
    const { endpoints, socketIn, socketOut } = parseServerFile(serverPath);
    allEndpoints = allEndpoints.concat(endpoints);
    allSocketIn = allSocketIn.concat(socketIn);
    allSocketOut = allSocketOut.concat(socketOut);
  });

  const serverData = {
    endpoints: allEndpoints,
    socketIn: allSocketIn,
    socketOut: allSocketOut,
  };

  // Collect all client-side routes
  const routes = parseClientFiles();

  // Display everything
  displayServerFlows(serverData);
  displayClientRoutes(routes);
  displaySummary(serverData, routes);
}

// Export for use in other scripts
export function getDocFlows() {
  let allEndpoints = [];
  let allSocketIn = [];
  let allSocketOut = [];

  CONFIG.serverFiles.forEach(file => {
    const serverPath = path.join(__dirname, file);
    const { endpoints, socketIn, socketOut } = parseServerFile(serverPath);
    allEndpoints = allEndpoints.concat(endpoints);
    allSocketIn = allSocketIn.concat(socketIn);
    allSocketOut = allSocketOut.concat(socketOut);
  });

  const routes = parseClientFiles();

  return {
    server: {
      endpoints: allEndpoints,
      socketIn: allSocketIn,
      socketOut: allSocketOut,
    },
    client: {
      routes,
    },
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  }
}
