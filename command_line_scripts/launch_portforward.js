#\!/usr/bin/env node
/**
 * launch_portforward.js
 *
 * Automatically fetches current public IP, updates configuration, and returns the public URL.
 * This script handles all port forwarding logic internally:
 *   1. Calls get-public-ip.js to fetch current IP
 *   2. Updates portforward-config.json with new IP
 *   3. Returns the public URL for use by the reverse proxy
 *
 * This script assumes you have already configured port forwarding on your router.
 *
 * Usage:
 *   launch_portforward.js --residence=erics_cottage
 *   launch_portforward.js --residence=erics_cottage --json
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { networkInterfaces } from 'os';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect local IP address on the LAN
 * Returns the first non-internal IPv4 address found
 */
function getLocalIP() {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
      if (net.family === familyV4Value && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

/**
 * Update internal IP in the config file
 */
function updateInternalIP(residence, internalIP) {
  const configPath = join(__dirname, 'portforward-config.json');
  const configContent = readFileSync(configPath, 'utf8');
  const config = JSON5.parse(configContent);

  if (config[residence]) {
    config[residence].internal_ip = internalIP;
    writeFileSync(configPath, JSON5.stringify(config, null, 2), 'utf8');
  }
}

/**
 * Update public IP for a residence by calling get-public-ip.js
 */
async function updatePublicIP(residence) {
  return new Promise((resolve, reject) => {
    const getIP = spawn('node', ['get-public-ip.js', `--residence=${residence}`]);

    let output = '';
    let errorOutput = '';

    getIP.stdout.on('data', (data) => {
      output += data.toString();
    });

    getIP.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    getIP.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to update public IP (exit code: ${code}): ${errorOutput}`));
      } else {
        resolve(output);
      }
    });
  });
}

/**
 * Load portforward configuration for a specific residence
 */
function loadPortforwardConfig(residence) {
  const configPath = join(__dirname, 'portforward-config.json');

  if (!existsSync(configPath)) {
    throw new Error(`Port forward config file not found: ${configPath}`);
  }

  const configContent = readFileSync(configPath, 'utf8');
  const config = JSON5.parse(configContent);

  if (!config[residence]) {
    const available = Object.keys(config).join(', ');
    throw new Error(`Residence "${residence}" not found in portforward-config.json. Available: ${available}`);
  }

  const residenceConfig = config[residence];

  if (!residenceConfig.external_ip) {
    throw new Error(`Residence "${residence}" has no external_ip configured. Run this script to auto-fetch it.`);
  }

  if (!residenceConfig.external_port) {
    throw new Error(`Residence "${residence}" has no external_port configured in portforward-config.json`);
  }

  if (!residenceConfig.internal_port) {
    throw new Error(`Residence "${residence}" has no internal_port configured in portforward-config.json`);
  }

  // Build public URL using external IP and port (what users connect to)
  const publicUrl = `http://${residenceConfig.external_ip}:${residenceConfig.external_port}`;

  return {
    publicUrl,
    externalIP: residenceConfig.external_ip,
    internalIP: residenceConfig.internal_ip || null,
    externalPort: residenceConfig.external_port,
    internalPort: residenceConfig.internal_port,
    lastUpdated: residenceConfig.last_updated,
    notes: residenceConfig.notes
  };
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    residence: null,
    json: false
  };

  for (const arg of args) {
    if (arg.startsWith('--residence=')) {
      options.residence = arg.split('=')[1];
    } else if (arg === '--json') {
      options.json = true;
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.residence) {
    console.error('ERROR: --residence parameter is required');
    console.error('Usage: launch_portforward.js --residence=RESIDENCE_NAME [--json]');
    console.error('Example: launch_portforward.js --residence=erics_cottage');
    process.exit(1);
  }

  try {
    // Step 1: Detect and update internal IP
    const internalIP = getLocalIP();
    if (internalIP) {
      updateInternalIP(options.residence, internalIP);
      if (!options.json) {
        console.log(`\nDetected internal IP: ${internalIP}`);
      }
    }

    // Step 2: Automatically update public IP
    if (!options.json) {
      console.log(`Fetching current public IP for residence: ${options.residence}...`);
    }
    await updatePublicIP(options.residence);

    // Step 3: Load the updated configuration
    const config = loadPortforwardConfig(options.residence);

    if (options.json) {
      // JSON output for programmatic use
      const jsonOutput = {
        success: true,
        publicUrl: config.publicUrl,
        externalIP: config.externalIP,
        internalIP: config.internalIP,
        externalPort: config.externalPort,
        internalPort: config.internalPort,
        residence: options.residence,
        lastUpdated: config.lastUpdated,
        notes: config.notes
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
    } else {
      // Human-readable output
      console.log('\n' + '━'.repeat(80));
      console.log('');
      console.log('Port Forwarding Configuration Loaded');
      console.log('');
      console.log(`Residence: ${options.residence}`);
      console.log(`Public URL: ${config.publicUrl}`);
      console.log(`External IP: ${config.externalIP} (public internet)`);
      if (config.internalIP) {
        console.log(`Internal IP: ${config.internalIP} (local LAN)`);
      }
      console.log(`External Port: ${config.externalPort} (what users connect to)`);
      console.log(`Internal Port: ${config.internalPort} (where proxy listens)`);
      if (config.lastUpdated) {
        console.log(`Last Updated: ${config.lastUpdated}`);
      }
      if (config.notes) {
        console.log(`Notes: ${config.notes}`);
      }
      console.log('');
      console.log('IMPORTANT: Configure port forwarding on your router:');
      if (config.internalIP) {
        console.log(`  External ${config.externalPort} -> Internal ${config.internalIP}:${config.internalPort}`);
      } else {
        console.log(`  External ${config.externalPort} -> Internal YOUR_INTERNAL_IP:${config.internalPort}`);
      }
      console.log('');
      console.log('━'.repeat(80) + '\n');
    }

  } catch (error) {
    if (options.json) {
      const jsonOutput = {
        success: false,
        error: error.message,
        residence: options.residence
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
      process.exit(1);
    } else {
      console.error(`\nERROR: ${error.message}\n`);
      process.exit(1);
    }
  }
}

main();
