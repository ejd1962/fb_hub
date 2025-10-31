#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read and increment snapshot counter
const counterPath = path.join(__dirname, 'snapshot_counter');
let snapshotNumber = 1;
if (fs.existsSync(counterPath)) {
  snapshotNumber = parseInt(fs.readFileSync(counterPath, 'utf-8').trim()) || 1;
}

// Format snapshot number as NNN (e.g., 001, 002, etc.)
const snapshotNumberStr = snapshotNumber.toString().padStart(3, '0');

console.log('\n' + '='.repeat(60));
console.log('Starting Snapshot #' + snapshotNumberStr);
console.log('='.repeat(60) + '\n');

// Create commit message
const commitMessage = 'About to do snapshot ' + snapshotNumberStr;

try {
  // Check if there are changes to commit
  const status = execSync('git status --porcelain', { encoding: 'utf-8' });

  if (status.trim()) {
    console.log('Changes detected, creating git commit...');

    // Add all changes
    execSync('git add .', { stdio: 'inherit' });

    // Create commit
    execSync('git commit -m "' + commitMessage + '"', { stdio: 'inherit' });
    console.log('Git commit created: "' + commitMessage + '"');
  } else {
    console.log('No changes to commit.');
  }

  // Get git commit info
  const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const gitCommitShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  const gitAuthor = execSync('git log -1 --format=%an', { encoding: 'utf-8' }).trim();
  const gitDate = execSync('git log -1 --format=%ai', { encoding: 'utf-8' }).trim();

  // Create snapshot info object
  const snapshotInfo = {
    snapshotNumber: snapshotNumberStr,
    snapshotTimestamp: new Date().toISOString(),
    snapshotDate: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }),
    git: {
      commit: gitCommit,
      commitShort: gitCommitShort,
      branch: gitBranch,
      author: gitAuthor,
      date: gitDate,
      message: commitMessage
    }
  };

  // Write to public directory
  const publicPath = path.join(__dirname, 'public', 'snapshot-info.json');
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, JSON.stringify(snapshotInfo, null, 2));

  console.log('\nSnapshot info generated:');
  console.log('  Snapshot #' + snapshotNumberStr);
  console.log('  Date: ' + snapshotInfo.snapshotDate);
  console.log('  Git commit: ' + gitCommitShort);
  console.log('  Branch: ' + gitBranch);

  // Increment and save snapshot counter
  fs.writeFileSync(counterPath, (snapshotNumber + 1).toString());

} catch (error) {
  console.error('Error during snapshot info generation:', error.message);
  process.exit(1);
}
