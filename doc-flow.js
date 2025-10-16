#!/usr/bin/env node
/**
 * doc-flow.js
 *
 * Documents control flow in both server and client code:
 * - HTTP Endpoints: // @endpoint
 * - Socket.io Events (incoming): // @socket-in
 * - Socket.io Events (outgoing): // @socket-out
 * - React Router Routes: // @route
 *
 * Scans specified files and adds documentation markers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - which files to scan
const CONFIG = {
  // Server-side files (Express + Socket.io)
  serverFiles: [
    './server/index.js',
  ],

  // Client-side files (React components)
  clientDir: './src',
  clientExtensions: ['.tsx', '.ts'],

  // File to read route definitions from
  routeDefinitionFile: './src/App.tsx',
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
// SERVER-SIDE PATTERNS (Express + Socket.io)
// ============================================================================

const ROUTE_PATTERN = /^\s*(app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`])/;
const SOCKET_ON_PATTERN = /^\s*(socket\.on\s*\(\s*['"`]([^'"`]+)['"`])/;
const SOCKET_EMIT_PATTERN = /^\s*((?:socket|io\.to\([^)]+\))\.emit\s*\(\s*['"`]([^'"`]+)['"`])/;

function analyzeEndpoint(method, route, nextLines) {
  method = method.toUpperCase();

  const params = [];
  const bodyVars = [];

  // Check for URL parameters
  const urlParams = route.match(/:(\w+)/g);
  if (urlParams) {
    urlParams.forEach(p => params.push(p.substring(1)));
  }

  // Check for req.body destructuring
  for (let i = 0; i < Math.min(10, nextLines.length); i++) {
    const line = nextLines[i];
    const bodyMatch = line.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/);
    if (bodyMatch) {
      const vars = bodyMatch[1].split(',').map(v => v.trim());
      bodyVars.push(...vars);
    }

    const queryMatch = line.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.query/);
    if (queryMatch) {
      const vars = queryMatch[1].split(',').map(v => v.trim());
      params.push(...vars.map(v => `${v} (query)`));
    }
  }

  // Build endpoint comment
  const lines = ['// @endpoint', `// ${method} ${route}`];

  if (params.length > 0) {
    lines.push(`// URL params: ${params.join(', ')}`);
  }

  if (bodyVars.length > 0) {
    lines.push(`// Body: { ${bodyVars.join(', ')} }`);
  }

  return lines;
}

function analyzeSocketEvent(eventName, isEmit, nextLines) {
  const description = isEmit ? `Emit ${eventName} event` : `Handle ${eventName} event`;
  const payloadVars = [];

  for (let i = 0; i < Math.min(10, nextLines.length); i++) {
    const line = nextLines[i];

    // For socket.on, check for destructured parameters
    if (!isEmit) {
      const paramMatch = line.match(/socket\.on\s*\([^,]+,\s*\(\s*\{\s*([^}]+)\s*\}/);
      if (paramMatch) {
        const vars = paramMatch[1].split(',').map(v => v.trim());
        payloadVars.push(...vars);
      }
    }

    // For emit, check for the payload object
    if (isEmit) {
      const emitMatch = line.match(/\.emit\s*\([^,]+,\s*\{/);
      if (emitMatch) {
        for (let j = i; j < Math.min(i + 10, nextLines.length); j++) {
          const fieldMatch = nextLines[j].match(/^\s*(\w+)\s*:/);
          if (fieldMatch && fieldMatch[1] !== 'timestamp') {
            payloadVars.push(fieldMatch[1]);
          }
          if (nextLines[j].includes('}')) break;
        }
      }
    }
  }

  // Build socket event comment
  const marker = isEmit ? '// @socket-out' : '// @socket-in';
  const lines = [marker, `// ${description}`];

  if (payloadVars.length > 0) {
    lines.push(`// Payload: { ${payloadVars.join(', ')} }`);
  }

  return lines;
}

function hasMarker(lines, index, markerType) {
  // Check previous lines for marker
  for (let i = index - 1; i >= 0 && i >= index - 10; i--) {
    const line = lines[i].trim();

    // If we hit a non-comment line, no marker found
    if (line && !line.startsWith('//')) {
      return false;
    }

    // Found the marker
    if (markerType === 'endpoint' && line.includes('@endpoint')) {
      return true;
    }
    if (markerType === 'socket-in' && line.includes('@socket-in')) {
      return true;
    }
    if (markerType === 'socket-out' && line.includes('@socket-out')) {
      return true;
    }
    if (markerType === 'route' && line.includes('@route')) {
      return true;
    }
  }

  return false;
}

function processServerFile(filePath) {
  console.log(`${colors.blue}Processing server file:${colors.reset} ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`${colors.yellow}  File not found, skipping${colors.reset}\n`);
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines = [];
  let endpointsAdded = 0;
  let socketInAdded = 0;
  let socketOutAdded = 0;

  const socketOutEvents = new Set();

  // First pass: find already-marked socket-out events
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('@socket-out')) {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const emitMatch = lines[j].trim().match(SOCKET_EMIT_PATTERN);
        if (emitMatch) {
          const [, fullMatch, eventName] = emitMatch;
          socketOutEvents.add(eventName);
          break;
        }
      }
    }
  }

  // Second pass: add markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for HTTP endpoints
    const routeMatch = trimmedLine.match(ROUTE_PATTERN);
    if (routeMatch) {
      const [, fullMatch, method, route] = routeMatch;

      if (!hasMarker(lines, i, 'endpoint')) {
        const nextLines = lines.slice(i, Math.min(i + 15, lines.length));
        const markerLines = analyzeEndpoint(method, route, nextLines);
        markerLines.forEach(l => newLines.push(l));
        endpointsAdded++;
        console.log(`${colors.green}  + HTTP endpoint: ${method.toUpperCase()} ${route}${colors.reset}`);
      }
    }

    // Check for socket.on (incoming events)
    const socketOnMatch = trimmedLine.match(SOCKET_ON_PATTERN);
    if (socketOnMatch) {
      const [, fullMatch, eventName] = socketOnMatch;

      if (!hasMarker(lines, i, 'socket-in')) {
        const nextLines = lines.slice(i, Math.min(i + 15, lines.length));
        const markerLines = analyzeSocketEvent(eventName, false, nextLines);
        markerLines.forEach(l => newLines.push(l));
        socketInAdded++;
        console.log(`${colors.cyan}  + Socket.in: ${eventName}${colors.reset}`);
      }
    }

    // Check for socket.emit (outgoing events)
    const socketEmitMatch = trimmedLine.match(SOCKET_EMIT_PATTERN);
    if (socketEmitMatch) {
      const [, fullMatch, eventName] = socketEmitMatch;

      if (!socketOutEvents.has(eventName) && !hasMarker(lines, i, 'socket-out')) {
        const nextLines = lines.slice(i, Math.min(i + 15, lines.length));
        const markerLines = analyzeSocketEvent(eventName, true, nextLines);
        markerLines.forEach(l => newLines.push(l));
        socketOutAdded++;
        socketOutEvents.add(eventName);
        console.log(`${colors.magenta}  + Socket.out: ${eventName}${colors.reset}`);
      }
    }

    newLines.push(line);
  }

  const totalAdded = endpointsAdded + socketInAdded + socketOutAdded;

  if (totalAdded > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    console.log(`${colors.green}  ✓ Added ${totalAdded} marker(s)${colors.reset}\n`);
  } else {
    console.log(`${colors.dim}  ✓ Already documented${colors.reset}\n`);
  }

  return totalAdded;
}

// ============================================================================
// CLIENT-SIDE PATTERNS (React Router)
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

function getRoutePathForComponent(componentName, appTsxContent) {
  // Match: <Route path="/something" element={<ComponentName />} />
  const routeRegex = new RegExp(`<Route\\s+path=["']([^"']+)["']\\s+element=\\{<${componentName}[^>]*>\\}`, 'i');
  const match = appTsxContent.match(routeRegex);
  return match ? match[1] : null;
}

function getComponentNameFromFile(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

function addRouteMarker(filePath, routePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  if (/@route\s+\/\S+/.test(content)) {
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

function processClientFiles() {
  console.log(`${colors.blue}Processing client files:${colors.reset} ${CONFIG.clientDir}`);

  const clientDir = path.join(__dirname, CONFIG.clientDir);
  if (!fs.existsSync(clientDir)) {
    console.log(`${colors.yellow}  Client directory not found, skipping${colors.reset}\n`);
    return 0;
  }

  // Read App.tsx to get route definitions
  const appTsxPath = path.join(__dirname, CONFIG.routeDefinitionFile);
  if (!fs.existsSync(appTsxPath)) {
    console.log(`${colors.yellow}  Route definition file not found: ${CONFIG.routeDefinitionFile}${colors.reset}\n`);
    return 0;
  }

  const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');
  const tsxFiles = getTsxFiles(clientDir);

  let modifiedCount = 0;
  let skippedCount = 0;

  tsxFiles.forEach(filePath => {
    const componentName = getComponentNameFromFile(filePath);

    // Skip App.tsx and utility files
    if (componentName === 'App' || componentName === 'Main' ||
        filePath.includes('Context') || filePath.includes('Utils')) {
      return;
    }

    // Get route path from App.tsx
    const routePath = getRoutePathForComponent(componentName, appTsxContent);

    if (!routePath) {
      return;
    }

    // Add marker
    const result = addRouteMarker(filePath, routePath);

    if (result.modified) {
      const relativePath = path.relative(__dirname, filePath);
      console.log(`${colors.green}  + Route: ${routePath} → ${componentName}${colors.reset}`);
      modifiedCount++;
    } else {
      skippedCount++;
    }
  });

  if (modifiedCount > 0) {
    console.log(`${colors.green}  ✓ Added ${modifiedCount} route marker(s)${colors.reset}\n`);
  } else {
    console.log(`${colors.dim}  ✓ Already documented${colors.reset}\n`);
  }

  return modifiedCount;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}Control Flow Documentation Tool${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

  let totalAdded = 0;

  // Process server files
  console.log(`${colors.bright}SERVER-SIDE (HTTP + Socket.io)${colors.reset}\n`);
  CONFIG.serverFiles.forEach(file => {
    const serverPath = path.join(__dirname, file);
    totalAdded += processServerFile(serverPath);
  });

  // Process client files
  console.log(`${colors.bright}CLIENT-SIDE (React Routes)${colors.reset}\n`);
  totalAdded += processClientFiles();

  // Summary
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  if (totalAdded > 0) {
    console.log(`${colors.green}${colors.bright}✓ Complete! Added ${totalAdded} total marker(s)${colors.reset}`);
  } else {
    console.log(`${colors.dim}✓ No changes needed - all flows already documented${colors.reset}`);
  }
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
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

export { processServerFile, processClientFiles };
