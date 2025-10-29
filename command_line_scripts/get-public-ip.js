/**
 * get-public-ip.js
 *
 * Utility to fetch your current public IP address and optionally update portforward-config.json
 *
 * Usage:
 *   node get-public-ip.js                    // Just display current public IP
 *   node get-public-ip.js --residence=erics_cottage  // Update config for residence
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Fetch public IP from multiple services (fallback support)
 */
async function fetchPublicIP() {
  const services = [
    'https://api.ipify.org?format=text',
    'https://api.my-ip.io/ip',
    'https://ifconfig.me/ip',
  ];

  for (const service of services) {
    try {
      const response = await fetch(service, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const ip = (await response.text()).trim();
        // Basic IPv4 validation
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
          return ip;
        }
      }
    } catch (error) {
      // Try next service
      continue;
    }
  }

  throw new Error('Failed to fetch public IP from all services');
}

/**
 * Update portforward-config.json with current IP for a residence
 */
function updateConfig(residence, publicIP) {
  const configPath = join(__dirname, 'portforward-config.json');

  let config;
  try {
    const configContent = readFileSync(configPath, 'utf8');
    config = JSON5.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to read portforward-config.json: ${error.message}`);
  }

  if (!config[residence]) {
    throw new Error(`Residence "${residence}" not found in portforward-config.json. Available: ${Object.keys(config).join(', ')}`);
  }

  // Update the residence config
  config[residence].external_ip = publicIP;
  config[residence].last_updated = new Date().toISOString();

  // Write back to file (preserve comments by using JSON5)
  writeFileSync(configPath, JSON5.stringify(config, null, 2), 'utf8');

  return config[residence];
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    residence: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--residence=')) {
      options.residence = arg.split('=')[1];
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('Fetching public IP address...\n');

  try {
    const publicIP = await fetchPublicIP();

    console.log(`Public IP: ${publicIP}`);

    if (options.residence) {
      console.log(`\nUpdating portforward-config.json for residence: ${options.residence}`);
      const residenceConfig = updateConfig(options.residence, publicIP);

      console.log('\nUpdated configuration:');
      console.log(`  Residence: ${options.residence}`);
      console.log(`  External IP: ${residenceConfig.external_ip}`);
      console.log(`  External Port: ${residenceConfig.external_port}`);
      console.log(`  Last Updated: ${residenceConfig.last_updated}`);
      console.log(`  Notes: ${residenceConfig.notes || 'N/A'}`);
      console.log('\nConfiguration saved to portforward-config.json');
    } else {
      console.log('\nTo update a residence configuration, use:');
      console.log('  node get-public-ip.js --residence=erics_cottage');
    }

  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
