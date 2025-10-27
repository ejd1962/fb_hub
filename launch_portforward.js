/**
 * launch_portforward.js
 *
 * Loads port forwarding configuration for a specific residence and returns the public URL.
 * This script assumes you have already configured port forwarding on your router.
 *
 * Usage:
 *   node launch_portforward.js --residence=erics_cottage
 *   node launch_portforward.js --residence=erics_cottage --json
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  if (!residenceConfig.public_host) {
    throw new Error(`Residence "${residence}" has no public_host configured. Run: node get-public-ip.js --residence=${residence}`);
  }

  if (!residenceConfig.public_port) {
    throw new Error(`Residence "${residence}" has no public_port configured in portforward-config.json`);
  }

  // Build public URL
  const publicUrl = `http://${residenceConfig.public_host}:${residenceConfig.public_port}`;

  return {
    publicUrl,
    publicHost: residenceConfig.public_host,
    publicPort: residenceConfig.public_port,
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
    console.error('Usage: node launch_portforward.js --residence=RESIDENCE_NAME [--json]');
    console.error('Example: node launch_portforward.js --residence=erics_cottage');
    process.exit(1);
  }

  try {
    const config = loadPortforwardConfig(options.residence);

    if (options.json) {
      // JSON output for programmatic use
      const jsonOutput = {
        success: true,
        publicUrl: config.publicUrl,
        publicHost: config.publicHost,
        publicPort: config.publicPort,
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
      console.log(`Public Host: ${config.publicHost}`);
      console.log(`Public Port: ${config.publicPort}`);
      if (config.lastUpdated) {
        console.log(`Last Updated: ${config.lastUpdated}`);
      }
      if (config.notes) {
        console.log(`Notes: ${config.notes}`);
      }
      console.log('');
      console.log('IMPORTANT: Ensure port forwarding is configured on your router:');
      console.log(`  External Port: ${config.publicPort} -> Internal: YOUR_LOCAL_IP:${config.publicPort}`);
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
