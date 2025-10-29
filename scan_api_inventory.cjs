#!/usr/bin/env node

/**
 * TransVerse API Inventory Scanner
 * 
 * Scans codebase for:
 * - Socket.IO messages (socket.on, socket.emit, io.emit, socket.to().emit)
 * - HTTP endpoints (app.get/post/put/delete)
 * - HTTP client calls (fetch, axios)
 * - TransVerse comment tags (@context, @purpose, @params, etc.)
 * 
 * Detects orphans: emit without on, endpoint without caller, etc.
 * Generates JSON inventory and human-readable reports.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: process.cwd(),
  outputDir: './api_inventory_reports',
  files: {
    server: 'server/index.js',
    client: 'src/components/game-room.tsx',
    reference: 'SOCKET_MESSAGES_REFERENCE.md'
  },
  patterns: {
    socketOn: /socket\.on\s*\(\s*['"]([^'"]+)['"]/g,
    socketEmit: /socket\.emit\s*\(\s*['"]([^'"]+)['"]/g,
    ioEmit: /io\.emit\s*\(\s*['"]([^'"]+)['"]/g,
    socketToEmit: /socket\.to\([^)]+\)\.emit\s*\(\s*['"]([^'"]+)['"]/g,
    httpEndpoint: /(app|router)\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g,
    fetch: /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
    axios: /axios\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    commentTag: /\/\/@(\w+):?\s*(.*)/
  }
};

// Data structures
const inventory = {
  sockets: {
    listeners: [],    // socket.on
    emitters: [],     // socket.emit, io.emit, socket.to().emit
    orphans: []       // emit without on, or on without emit
  },
  http: {
    endpoints: [],    // app.get/post/put/delete
    clients: [],      // fetch, axios
    orphans: []       // endpoint without client, or client without endpoint
  },
  tags: {},          // Indexed by file → line → tags
  stats: {
    totalSocketListeners: 0,
    totalSocketEmitters: 0,
    totalHttpEndpoints: 0,
    totalHttpClients: 0,
    totalOrphans: 0,
    filesScanned: 0
  }
};


// Parse TransVerse comment tags
function parseCommentTags(lines, startLine) {
  const tags = {};
  let currentTag = null;
  let currentContent = [];
  
  for (let i = startLine; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Stop if we hit a non-comment line
    if (!trimmed.startsWith('//')) {
      break;
    }
    
    // Check for tag
    const tagMatch = trimmed.match(CONFIG.patterns.commentTag);
    if (tagMatch) {
      // Save previous tag if exists
      if (currentTag) {
        tags[currentTag] = currentContent.reverse().join('\n');
        currentContent = [];
      }
      
      currentTag = tagMatch[1];
      if (tagMatch[2]) {
        currentContent.push(tagMatch[2]);
      }
    } else if (currentTag) {
      // Continuation of current tag
      const content = trimmed.replace(/^\/\/\s*/, '');
      if (content) {
        currentContent.push(content);
      }
    }
  }
  
  // Save last tag
  if (currentTag) {
    tags[currentTag] = currentContent.reverse().join('\n');
  }
  
  return tags;
}

// Scan a file for socket messages
function scanSocketMessages(filePath, fileType) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find socket.on (listeners)
  let match;
  const onRegex = new RegExp(CONFIG.patterns.socketOn.source, 'g');
  while ((match = onRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.sockets.listeners.push({
      message: match[1],
      file: filePath,
      line: lineNum,
      type: fileType,
      tags: tags
    });
    inventory.stats.totalSocketListeners++;
  }
  
  // Find socket.emit (emitters)
  const emitRegex = new RegExp(CONFIG.patterns.socketEmit.source, 'g');
  while ((match = emitRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.sockets.emitters.push({
      message: match[1],
      file: filePath,
      line: lineNum,
      type: fileType,
      emitType: 'socket.emit',
      tags: tags
    });
    inventory.stats.totalSocketEmitters++;
  }
  
  // Find io.emit (broadcast to all)
  const ioEmitRegex = new RegExp(CONFIG.patterns.ioEmit.source, 'g');
  while ((match = ioEmitRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.sockets.emitters.push({
      message: match[1],
      file: filePath,
      line: lineNum,
      type: fileType,
      emitType: 'io.emit',
      tags: tags
    });
    inventory.stats.totalSocketEmitters++;
  }
  
  // Find socket.to().emit (room broadcast)
  const socketToEmitRegex = new RegExp(CONFIG.patterns.socketToEmit.source, 'g');
  while ((match = socketToEmitRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.sockets.emitters.push({
      message: match[1],
      file: filePath,
      line: lineNum,
      type: fileType,
      emitType: 'socket.to().emit',
      tags: tags
    });
    inventory.stats.totalSocketEmitters++;
  }
}


// Scan a file for HTTP endpoints and clients
function scanHttpMessages(filePath, fileType) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Find HTTP endpoints (app.get/post/put/delete)
  let match;
  const endpointRegex = new RegExp(CONFIG.patterns.httpEndpoint.source, 'g');
  while ((match = endpointRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.http.endpoints.push({
      method: match[2].toUpperCase(),
      path: match[3],
      file: filePath,
      line: lineNum,
      type: fileType,
      tags: tags
    });
    inventory.stats.totalHttpEndpoints++;
  }
  
  // Find fetch calls
  const fetchRegex = new RegExp(CONFIG.patterns.fetch.source, 'g');
  while ((match = fetchRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.http.clients.push({
      method: 'FETCH',
      path: match[1],
      file: filePath,
      line: lineNum,
      type: fileType,
      tags: tags
    });
    inventory.stats.totalHttpClients++;
  }
  
  // Find axios calls
  const axiosRegex = new RegExp(CONFIG.patterns.axios.source, 'g');
  while ((match = axiosRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    const tags = parseCommentTags(lines, lineNum - 2);
    
    inventory.http.clients.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: filePath,
      line: lineNum,
      type: fileType,
      tags: tags
    });
    inventory.stats.totalHttpClients++;
  }
}

// Detect orphans
function detectOrphans() {
  // Socket orphans: emit without on, or on without emit
  const listenerMessages = new Set(inventory.sockets.listeners.map(l => l.message));
  const emitterMessages = new Set(inventory.sockets.emitters.map(e => e.message));
  
  // Emitters without listeners
  inventory.sockets.emitters.forEach(emitter => {
    if (!listenerMessages.has(emitter.message)) {
      inventory.sockets.orphans.push({
        type: 'emit_without_listener',
        message: emitter.message,
        location: `${emitter.file}:${emitter.line}`
      });
      inventory.stats.totalOrphans++;
    }
  });
  
  // Listeners without emitters
  inventory.sockets.listeners.forEach(listener => {
    if (!emitterMessages.has(listener.message)) {
      inventory.sockets.orphans.push({
        type: 'listener_without_emit',
        message: listener.message,
        location: `${listener.file}:${listener.line}`
      });
      inventory.stats.totalOrphans++;
    }
  });
  
  // HTTP orphans: endpoint without client call, or client without endpoint
  // (Simple path matching - may have false positives/negatives)
  const endpointPaths = new Set(inventory.http.endpoints.map(e => e.path));
  const clientPaths = new Set(inventory.http.clients.map(c => c.path));
  
  inventory.http.clients.forEach(client => {
    const pathMatch = Array.from(endpointPaths).some(ep => {
      return client.path.includes(ep) || ep.includes(client.path);
    });
    if (!pathMatch) {
      inventory.http.orphans.push({
        type: 'client_without_endpoint',
        method: client.method,
        path: client.path,
        location: `${client.file}:${client.line}`
      });
      inventory.stats.totalOrphans++;
    }
  });
}


// Generate reports
function generateJsonReport() {
  const outputPath = path.join(CONFIG.outputDir, 'api_inventory.json');
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2));
  console.log(`JSON report saved to: ${outputPath}`);
}

function generateTextReport() {
  const lines = [];
  
  lines.push('='.repeat(80));
  lines.push('TransVerse API Inventory Report');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('='.repeat(80));
  lines.push('');
  
  // Statistics
  lines.push('STATISTICS');
  lines.push('-'.repeat(80));
  lines.push(`Files Scanned:           ${inventory.stats.filesScanned}`);
  lines.push(`Socket Listeners (on):   ${inventory.stats.totalSocketListeners}`);
  lines.push(`Socket Emitters (emit):  ${inventory.stats.totalSocketEmitters}`);
  lines.push(`HTTP Endpoints:          ${inventory.stats.totalHttpEndpoints}`);
  lines.push(`HTTP Clients:            ${inventory.stats.totalHttpClients}`);
  lines.push(`Orphans Detected:        ${inventory.stats.totalOrphans}`);
  lines.push('');
  
  // Socket Messages
  lines.push('SOCKET MESSAGES');
  lines.push('-'.repeat(80));
  lines.push('');
  
  lines.push('Listeners (socket.on):');
  inventory.sockets.listeners.forEach(l => {
    lines.push(`  ${l.message}`);
    lines.push(`    Location: ${l.file}:${l.line}`);
    if (Object.keys(l.tags).length > 0) {
      Object.entries(l.tags).forEach(([tag, value]) => {
        lines.push(`    @${tag}: ${value}`);
      });
    }
    lines.push('');
  });
  
  lines.push('Emitters (socket.emit, io.emit, socket.to().emit):');
  inventory.sockets.emitters.forEach(e => {
    lines.push(`  ${e.message} [${e.emitType}]`);
    lines.push(`    Location: ${e.file}:${e.line}`);
    if (Object.keys(e.tags).length > 0) {
      Object.entries(e.tags).forEach(([tag, value]) => {
        lines.push(`    @${tag}: ${value}`);
      });
    }
    lines.push('');
  });
  
  // HTTP Endpoints
  lines.push('HTTP ENDPOINTS');
  lines.push('-'.repeat(80));
  lines.push('');
  
  lines.push('Server Endpoints:');
  inventory.http.endpoints.forEach(ep => {
    lines.push(`  ${ep.method} ${ep.path}`);
    lines.push(`    Location: ${ep.file}:${ep.line}`);
    if (Object.keys(ep.tags).length > 0) {
      Object.entries(ep.tags).forEach(([tag, value]) => {
        lines.push(`    @${tag}: ${value}`);
      });
    }
    lines.push('');
  });
  
  lines.push('Client Calls:');
  inventory.http.clients.forEach(c => {
    lines.push(`  ${c.method} ${c.path}`);
    lines.push(`    Location: ${c.file}:${c.line}`);
    if (Object.keys(c.tags).length > 0) {
      Object.entries(c.tags).forEach(([tag, value]) => {
        lines.push(`    @${tag}: ${value}`);
      });
    }
    lines.push('');
  });
  
  // Orphans
  if (inventory.stats.totalOrphans > 0) {
    lines.push('ORPHANS (POTENTIAL ISSUES)');
    lines.push('-'.repeat(80));
    lines.push('');
    
    lines.push('Socket Orphans:');
    inventory.sockets.orphans.forEach(o => {
      lines.push(`  [${o.type}] ${o.message}`);
      lines.push(`    Location: ${o.location}`);
      lines.push('');
    });
    
    lines.push('HTTP Orphans:');
    inventory.http.orphans.forEach(o => {
      lines.push(`  [${o.type}] ${o.method} ${o.path}`);
      lines.push(`    Location: ${o.location}`);
      lines.push('');
    });
  }
  
  lines.push('='.repeat(80));
  lines.push('END OF REPORT');
  lines.push('='.repeat(80));
  
  const outputPath = path.join(CONFIG.outputDir, 'api_inventory.txt');
  fs.writeFileSync(outputPath, lines.join('\n'));
  console.log(`Text report saved to: ${outputPath}`);
}


// Main execution
function main() {
  console.log('TransVerse API Inventory Scanner');
  console.log('='.repeat(80));
  console.log('');
  
  // Check if files exist
  const serverPath = path.join(CONFIG.rootDir, CONFIG.files.server);
  const clientPath = path.join(CONFIG.rootDir, CONFIG.files.client);
  
  if (!fs.existsSync(serverPath)) {
    console.error(`ERROR: Server file not found: ${serverPath}`);
    console.error('Please run this script from the project root directory.');
    process.exit(1);
  }
  
  if (!fs.existsSync(clientPath)) {
    console.error(`ERROR: Client file not found: ${clientPath}`);
    console.error('Please run this script from the project root directory.');
    process.exit(1);
  }
  
  console.log(`Scanning server: ${serverPath}`);
  scanSocketMessages(serverPath, 'server');
  scanHttpMessages(serverPath, 'server');
  inventory.stats.filesScanned++;
  
  console.log(`Scanning client: ${clientPath}`);
  scanSocketMessages(clientPath, 'client');
  scanHttpMessages(clientPath, 'client');
  inventory.stats.filesScanned++;
  
  console.log('Detecting orphans...');
  detectOrphans();
  
  console.log('Generating reports...');
  generateJsonReport();
  generateTextReport();
  
  console.log('');
  console.log('='.repeat(80));
  console.log('SCAN COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Summary:');
  console.log(`  Socket listeners: ${inventory.stats.totalSocketListeners}`);
  console.log(`  Socket emitters:  ${inventory.stats.totalSocketEmitters}`);
  console.log(`  HTTP endpoints:   ${inventory.stats.totalHttpEndpoints}`);
  console.log(`  HTTP clients:     ${inventory.stats.totalHttpClients}`);
  console.log(`  Orphans found:    ${inventory.stats.totalOrphans}`);
  console.log('');
  
  if (inventory.stats.totalOrphans > 0) {
    console.log('WARNING: Orphans detected. Review the report for details.');
    console.log('');
  }
  
  console.log('Reports generated in: ' + CONFIG.outputDir);
  console.log('  - api_inventory.json (machine-readable)');
  console.log('  - api_inventory.txt (human-readable)');
  console.log('');
}

// Run the scanner
try {
  main();
} catch (error) {
  console.error('ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
