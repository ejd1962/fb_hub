// git-backup.js  (run example:   node git-backup.js --help ) 

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

// Get __filename and __dirname equivalents in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(os.homedir(), 'git-backup.json');
const LOCK_FILE = CONFIG_FILE + '.lock';
const DEFAULT_INTERVAL = 600;

// Path to git.exe
const GIT_EXE = 'C:\\Program Files\\Git\\bin\\git.exe';

// Help text
function showHelp() {
    console.log(`
git-backup.js 

Arguments: 

   --interval=NNN                or --i=NNN   : NNN is seconds. Default is 600 seconds. 
   --projects=proj1,proj2,proj3  or --p=xxx   : a list of projects to use (prior list is discarded) 
   --projects_add=proj4,proj5    or --pa=xxx  : a list of projects to add to the list. 
   --projects_remove=proj2,proj3 or --pr=xxx  : a list of projects to remove from the list.
   --kill                                     : Kill the daemon if running
   --restart                                  : Restart the daemon (kill and start new one)
   --status                                   : Show current status and configuration
   --help                        or --h       : Show this help message
   
The operation of git-backup.js is:

    It looks for a file in users root directory called "git-backup.json".  If 
    it does not already exist then create it.  The fields in the json file are "projects",
    "interval", "last_saved_time", "daemon_pid".  The default interval is 600.  All other 
    fields default to be blank. 
    
    It locks the json file by touching a file with json filename, suffixed by .lock  
	(Note this is not really atomic, so there is a small chance of a race condition.)
    
    It reads the json file to datafill an internal json variable, and modifies the fields 
    as needed.    Other fields may be added later.  
    
    If the daemon_pid value in the json file is blank, then it launches a new daemon, waits 
    for it to come alive, and reads its PID and saves it in the daemon_pid field.
    
    All arguments are processed 
        The --projectsXXX arguments are processed in order to replace, or add to,   
        or remove from the json projects list. 
        The --interval argument updates the interval value in json. 
    
    After all arguments are processed, a git commit is done of all projects. 
    
    The current time is put into the "last_time_saved" field.
    
    Then save the json data back to the json file. 
	
    Then the lock file is removed. 

	
The daemon operates autonomously as follows: 
    
    It spends most of its time sleeping.  
    
    When it wakes up, it waits for the lock file to be not present, then
    it reads the json file into an interval variable.  (This read is is not really done
    as an atomic operation, so there is a chance of a race condition.) 	
    
    It subtracts the last_saved_time from the current time to determine elapsed time.   
    
    If the elapsed exceeds the "interval", then do a git commit of all the projects.  
    
    Then update the "last_time_saved" with the current time. 
    
    Then save the json variable to the json file. 
    
    Then sleep for "interval" seconds PLUS 5.

Project paths can be specified in either Windows format (C:\\path\\to\\project) or 
GitBash format (/c/path/to/project). Both formats are supported and normalized internally.
`);
}

// Convert path to GitBash format for use in git commands
function toGitBashPath(winPath) {
    // If already in GitBash format, return as-is
    if (winPath.startsWith('/')) {
        return winPath;
    }
    
    // Convert Windows path to GitBash format
    // C:\Users\name\project -> /c/Users/name/project
    let bashPath = winPath.replace(/\\/g, '/');
    
    // Handle drive letter (C: -> /c)
    if (bashPath.match(/^[A-Za-z]:/)) {
        bashPath = '/' + bashPath[0].toLowerCase() + bashPath.substring(2);
    }
    
    return bashPath;
}

// Convert path to Windows format for file system operations
function toWindowsPath(bashPath) {
    // If already in Windows format, return as-is
    if (bashPath.match(/^[A-Za-z]:/)) {
        return bashPath;
    }
    
    // Convert GitBash path to Windows format
    // /c/Users/name/project -> C:\Users\name\project
    if (bashPath.match(/^\/[a-z]\//)) {
        const drive = bashPath[1].toUpperCase();
        const restPath = bashPath.substring(2).replace(/\//g, '\\');
        return drive + ':' + restPath;
    }
    
    // If it's a relative path or other format, return as-is
    return bashPath;
}

// Normalize path - store in Windows format internally
function normalizePath(inputPath) {
    return toWindowsPath(inputPath);
}

// Validate if a path is a git repository
function isGitRepository(projectPath) {
    const winPath = toWindowsPath(projectPath);
    
    if (!fs.existsSync(winPath)) {
        return { valid: false, error: 'Path does not exist' };
    }
    
    const gitDir = path.join(winPath, '.git');
    if (!fs.existsSync(gitDir)) {
        return { valid: false, error: 'Not a git repository (no .git directory found)' };
    }
    
    return { valid: true };
}

// Get last commit info for a project
function getLastCommitInfo(projectPath) {
    try {
        const winPath = toWindowsPath(projectPath);
        
        // Get last commit hash
        const hash = execSync(`"${GIT_EXE}" -C "${winPath}" rev-parse HEAD`, {
            encoding: 'utf8',
            windowsHide: true
        }).trim();
        
        // Get last commit date
        const date = execSync(`"${GIT_EXE}" -C "${winPath}" log -1 --format=%ai`, {
            encoding: 'utf8',
            windowsHide: true
        }).trim();
        
        // Get last commit message
        const message = execSync(`"${GIT_EXE}" -C "${winPath}" log -1 --format=%s`, {
            encoding: 'utf8',
            windowsHide: true
        }).trim();
        
        return { hash, date, message };
    } catch (error) {
        return { hash: 'N/A', date: 'N/A', message: 'Error: ' + error.message };
    }
}

// Parse command line arguments - maintaining order and detecting unrecognized args
function parseArgs() {
    const args = {
        interval: null,
        projectOperations: [], // Ordered list of operations
        help: false,
        kill: false,
        restart: false,
        status: false,
        unrecognizedArgs: []
    };

    process.argv.slice(2).forEach(arg => {
        if (arg === '--help' || arg === '--h') {
            args.help = true;
        } else if (arg === '--kill') {
            args.kill = true;
        } else if (arg === '--restart') {
            args.restart = true;
        } else if (arg === '--status') {
            args.status = true;
        } else if (arg.startsWith('--interval=') || arg.startsWith('--i=')) {
            args.interval = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--projects=') || arg.startsWith('--p=')) {
            const projects = arg.split('=')[1].split(',')
                .map(p => normalizePath(p.trim()))
                .filter(p => p);
            args.projectOperations.push({
                type: 'replace',
                projects: projects
            });
        } else if (arg.startsWith('--projects_add=') || arg.startsWith('--pa=')) {
            const projects = arg.split('=')[1].split(',')
                .map(p => normalizePath(p.trim()))
                .filter(p => p);
            projects.forEach(proj => {
                args.projectOperations.push({
                    type: 'add',
                    project: proj
                });
            });
        } else if (arg.startsWith('--projects_remove=') || arg.startsWith('--pr=')) {
            const projects = arg.split('=')[1].split(',')
                .map(p => normalizePath(p.trim()))
                .filter(p => p);
            projects.forEach(proj => {
                args.projectOperations.push({
                    type: 'remove',
                    project: proj
                });
            });
        } else if (arg === '--daemon') {
            // Internal flag, ignore
        } else {
            // Unrecognized argument
            args.unrecognizedArgs.push(arg);
        }
    });

    return args;
}

// Lock file operations  -- not really atomic, so still a small chance of a race condition, live with it. 
function acquireLock() {
    let attempts = 0;
    while (fs.existsSync(LOCK_FILE) && attempts < 30) {
        attempts++;
        sleepSync(100); // Wait 100ms
    }
    if (attempts >= 30) {
        throw new Error('Could not acquire lock after 3 seconds');
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
}

function releaseLock() {
    if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
    }
}

function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
}

// Config file operations
function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        return {
            projects: [],
            interval: DEFAULT_INTERVAL,
            last_saved_time: '',
            daemon_pid: '',
            last_commits: {}
        };
    }
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    
    // Ensure last_commits field exists
    if (!config.last_commits) {
        config.last_commits = {};
    }
    
    return config;
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Git operations - using git.exe directly with windowsHide
function gitCommitProjects(projects, config) {
    const timestamp = new Date().toISOString();
    let success = 0;
    let failed = 0;

    projects.forEach(proj => {
        try {
            // Use Windows path for file system checks
            const winPath = toWindowsPath(proj);
            
            if (!fs.existsSync(winPath)) {
                console.error(`[ERROR] Project path does not exist: ${proj}`);
                failed++;
                return;
            }

            // Check if it's a git repo
            const gitDir = path.join(winPath, '.git');
            if (!fs.existsSync(gitDir)) {
                console.error(`[ERROR] Not a git repository: ${proj}`);
                failed++;
                return;
            }

            // Check for changes first using git.exe directly
            const status = execSync(`"${GIT_EXE}" -C "${winPath}" status --porcelain`, {
                encoding: 'utf8',
                windowsHide: true
            });
            
            if (!status.trim()) {
                console.log(`[OK] No changes in: ${proj}`);
                success++;
                return;
            }

            // Add and commit using git.exe directly
            execSync(`"${GIT_EXE}" -C "${winPath}" add -A`, {
                encoding: 'utf8',
                windowsHide: true
            });
            
            execSync(`"${GIT_EXE}" -C "${winPath}" commit -m "Auto-backup: ${timestamp}"`, {
                encoding: 'utf8',
                windowsHide: true
            });
            
            // Get the commit hash that was just created
            const commitHash = execSync(`"${GIT_EXE}" -C "${winPath}" rev-parse HEAD`, {
                encoding: 'utf8',
                windowsHide: true
            }).trim();
            
            // Store commit info
            config.last_commits[proj] = {
                hash: commitHash,
                timestamp: timestamp,
                message: `Auto-backup: ${timestamp}`
            };
            
            console.log(`[COMMITTED] ${proj} (${commitHash.substring(0, 8)})`);
            success++;
        } catch (error) {
            console.error(`[ERROR] Failed to commit ${proj}:`, error.message);
            failed++;
        }
    });

    console.log(`\nCommit summary: ${success} successful, ${failed} failed`);
}

// Check if daemon is running
function isDaemonRunning(pid) {
    if (!pid) return false;
    try {
        process.kill(pid, 0); // Signal 0 checks if process exists
        return true;
    } catch (e) {
        return false;
    }
}

// Kill daemon
function killDaemon(pid) {
    if (!pid) return false;
    try {
        process.kill(pid, 'SIGTERM');
        // Wait a moment for daemon to terminate
        sleepSync(500);
        return true;
    } catch (e) {
        return false;
    }
}

// Spawn daemon
function spawnDaemon() {
    const daemon = spawn(process.execPath, [__filename, '--daemon'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    daemon.unref();
    
    // Wait a moment for daemon to start
    sleepSync(500);
    
    return daemon.pid;
}

// Daemon mode
function runDaemon() {
    console.log(`[DAEMON] Started with PID ${process.pid}`);
    
    const daemonLoop = () => {
        try {
            // Wait for lock to be released
            while (fs.existsSync(LOCK_FILE)) {
                sleepSync(100);
            }

            // Atomic read of config
            const config = loadConfig();
            const interval = config.interval || DEFAULT_INTERVAL;
            const lastSaved = config.last_saved_time ? new Date(config.last_saved_time) : new Date(0);
            const now = new Date();
            const elapsed = (now - lastSaved) / 1000; // seconds

            console.log(`[DAEMON] Check at ${now.toISOString()} - Elapsed: ${Math.floor(elapsed)}s / Interval: ${interval}s`);

            if (elapsed >= interval) {
                console.log(`[DAEMON] Interval exceeded, committing projects...`);
                
                if (config.projects && config.projects.length > 0) {
                    gitCommitProjects(config.projects, config);
                    
                    // Update last_saved_time
                    config.last_saved_time = now.toISOString();
                    saveConfig(config);
                } else {
                    console.log(`[DAEMON] No projects configured`);
                }
            }

            // Sleep for interval + 5 seconds
            setTimeout(daemonLoop, (interval + 5) * 1000);

        } catch (error) {
            console.error(`[DAEMON ERROR]`, error);
            setTimeout(daemonLoop, 60000); // Retry in 1 minute on error
        }
    };

    daemonLoop();
}

// Show status
function showStatus() {
    console.log('\n========== GIT BACKUP STATUS ==========\n');
    
    const config = loadConfig();
    
    // Daemon status
    const daemonRunning = isDaemonRunning(config.daemon_pid);
    console.log('DAEMON STATUS:');
    console.log(`  Running: ${daemonRunning ? 'YES' : 'NO'}`);
    console.log(`  PID: ${config.daemon_pid || 'N/A'}`);
    console.log('');
    
    // Configuration
    console.log('CONFIGURATION:');
    console.log(`  Config File: ${CONFIG_FILE}`);
    console.log(`  Interval: ${config.interval} seconds`);
    console.log(`  Last Save Time: ${config.last_saved_time || 'Never'}`);
    console.log(`  Number of Projects: ${config.projects.length}`);
    console.log('');
    
    // Projects and their last commits
    console.log('PROJECTS:');
    if (config.projects.length === 0) {
        console.log('  No projects configured');
    } else {
        config.projects.forEach((proj, index) => {
            console.log(`\n  [${index + 1}] ${proj}`);
            
            // Get actual last commit from git
            const commitInfo = getLastCommitInfo(proj);
            console.log(`      Last Commit Hash: ${commitInfo.hash}`);
            console.log(`      Last Commit Date: ${commitInfo.date}`);
            console.log(`      Last Commit Message: ${commitInfo.message}`);
            
            // Show last auto-backup commit if tracked
            if (config.last_commits && config.last_commits[proj]) {
                const lastBackup = config.last_commits[proj];
                console.log(`      Last Auto-Backup: ${lastBackup.timestamp}`);
                console.log(`      Auto-Backup Hash: ${lastBackup.hash.substring(0, 8)}`);
            } else {
                console.log(`      Last Auto-Backup: Never`);
            }
        });
    }
    
    console.log('\n');
    console.log('FULL CONFIGURATION (JSON):');
    console.log(JSON.stringify(config, null, 2));
    console.log('\n=======================================\n');
}

// Process project operations and validate
function processProjectOperations(operations, currentProjects) {
    console.log('\n[MANAGER] Processing project operations...');
    
    // Create a working copy of current projects
    let workingProjects = [...currentProjects];
    let hasErrors = false;
    let errorDetails = [];
    let operationLog = [];
    let opNum = 0;
    
    // Process each operation in order
    for (const op of operations) {
        if (op.type === 'replace') {
            // Replace entire list
            console.log('\n[VALIDATE] Replacing entire project list:');
            const validProjects = [];
            
            for (const proj of op.projects) {
                opNum++;
                const validation = isGitRepository(proj);
                
                if (validation.valid) {
                    validProjects.push(proj);
                    console.log(`  [OK] Operation ${opNum}: Will add ${proj}`);
                    operationLog.push({ opNum, type: 'replace-add', project: proj, status: 'ok' });
                } else {
                    console.error(`  [ERROR] Operation ${opNum}: Cannot add ${proj} - ${validation.error}`);
                    operationLog.push({ opNum, type: 'replace-add', project: proj, status: 'error', error: validation.error });
                    errorDetails.push(`Operation ${opNum}: ${proj} - ${validation.error}`);
                    hasErrors = true;
                }
            }
            
            // Update working copy
            workingProjects = validProjects;
            
        } else if (op.type === 'add') {
            opNum++;
            const proj = op.project;
            
            // Check if already in list
            if (workingProjects.includes(proj)) {
                console.log(`  [SKIP] Operation ${opNum}: Already in list - ${proj}`);
                operationLog.push({ opNum, type: 'add', project: proj, status: 'skip' });
                continue;
            }
            
            // Validate the project
            const validation = isGitRepository(proj);
            if (validation.valid) {
                console.log(`  [OK] Operation ${opNum}: Will add ${proj}`);
                operationLog.push({ opNum, type: 'add', project: proj, status: 'ok' });
                workingProjects.push(proj);
            } else {
                console.error(`  [ERROR] Operation ${opNum}: Cannot add ${proj} - ${validation.error}`);
                operationLog.push({ opNum, type: 'add', project: proj, status: 'error', error: validation.error });
                errorDetails.push(`Operation ${opNum}: ${proj} - ${validation.error}`);
                hasErrors = true;
            }
            
        } else if (op.type === 'remove') {
            opNum++;
            const proj = op.project;
            
            // Check if in list
            if (!workingProjects.includes(proj)) {
                console.error(`  [ERROR] Operation ${opNum}: Cannot remove ${proj} - Not in the projects list`);
                operationLog.push({ opNum, type: 'remove', project: proj, status: 'error', error: 'Not in the projects list' });
                errorDetails.push(`Operation ${opNum}: ${proj} - Not in the projects list`);
                hasErrors = true;
            } else {
                console.log(`  [OK] Operation ${opNum}: Will remove ${proj}`);
                operationLog.push({ opNum, type: 'remove', project: proj, status: 'ok' });
                workingProjects = workingProjects.filter(p => p !== proj);
            }
        }
    }
    
    return { workingProjects, hasErrors, errorDetails, operationLog };
}

// Main function
function main() {
    // Check if running in daemon mode
    if (process.argv.includes('--daemon')) {
        runDaemon();
        return;
    }

    // Parse arguments first to check for help
    const args = parseArgs();

    // Show help and exit if requested
    if (args.help) {
        showHelp();
        return;
    }

    // Check for unrecognized arguments first
    if (args.unrecognizedArgs.length > 0) {
        console.error('[ERROR] Unrecognized argument(s): ' + args.unrecognizedArgs.join(', '));
        console.error('[ERROR] No actions will be performed');
        console.log('\nUse --help or --h to see valid arguments');
        process.exit(1);
    }

    // Handle --status (read-only operation, no lock needed)
    if (args.status) {
        showStatus();
        return;
    }

    let exitCode = 0;

    try {
        acquireLock();

        // Load config
        let config = loadConfig();

        // Handle --kill
        if (args.kill) {
            if (config.daemon_pid) {
                const wasRunning = isDaemonRunning(config.daemon_pid);
                if (wasRunning) {
                    console.log(`[MANAGER] Killing daemon (PID ${config.daemon_pid})...`);
                    killDaemon(config.daemon_pid);
                    console.log('[MANAGER] Daemon killed');
                } else {
                    console.log(`[MANAGER] Daemon (PID ${config.daemon_pid}) is not running`);
                }
                config.daemon_pid = '';
                saveConfig(config);
                console.log(`[MANAGER] Configuration saved to ${CONFIG_FILE}`);
            } else {
                console.log('[MANAGER] No daemon PID in configuration');
            }
            releaseLock();
            return;
        }

        // Handle --restart
        if (args.restart) {
            if (config.daemon_pid) {
                const wasRunning = isDaemonRunning(config.daemon_pid);
                if (wasRunning) {
                    console.log(`[MANAGER] Killing daemon (PID ${config.daemon_pid})...`);
                    killDaemon(config.daemon_pid);
                    console.log('[MANAGER] Daemon killed');
                } else {
                    console.log(`[MANAGER] Old daemon (PID ${config.daemon_pid}) was not running`);
                }
            }
            console.log('[MANAGER] Starting new daemon...');
            config.daemon_pid = spawnDaemon();
            config.last_saved_time = new Date().toISOString();
            saveConfig(config);
            console.log(`[MANAGER] Daemon started with PID ${config.daemon_pid}`);
            console.log(`[MANAGER] Configuration saved to ${CONFIG_FILE}`);
            releaseLock();
            return;
        }

        // Normal operation continues below...
        const originalConfig = JSON.parse(JSON.stringify(config)); // Deep copy for comparison

        // Validate all arguments before making any changes
        let validationErrors = [];
        let validatedProjects = config.projects;
        let intervalChanged = false;

        // Check daemon status first (don't start yet if there might be errors)
        const daemonRunning = isDaemonRunning(config.daemon_pid);
        if (!daemonRunning && config.daemon_pid) {
            console.log('[MANAGER] Previous daemon (PID ' + config.daemon_pid + ') is not running');
        }

        // Validate project operations if any
        if (args.projectOperations.length > 0) {
            const result = processProjectOperations(args.projectOperations, config.projects);
            
            if (result.hasErrors) {
                validationErrors.push(...result.errorDetails);
            } else {
                validatedProjects = result.workingProjects;
            }
        }

        // Check if interval changed
        if (args.interval !== null && args.interval !== config.interval) {
            intervalChanged = true;
            console.log(`\n[MANAGER] Interval will change from ${config.interval} to ${args.interval} seconds`);
        }

        // If there are any validation errors, abort everything
        if (validationErrors.length > 0) {
            console.error('\n[MANAGER] ERRORS DETECTED - No changes will be made');
            console.error('[MANAGER] Please fix the errors and try again');
            console.log(`[MANAGER] Configuration remains unchanged`);
            
            // Print final error summary
            const errorSummary = validationErrors.join('; ');
            console.error(`\n[ERROR] Failed with ${validationErrors.length} error(s): ${errorSummary}`);
            exitCode = 1;
        } else {
            // All validations passed - now apply all changes
            console.log('\n[MANAGER] All validations passed - Applying changes...');

            // Apply project changes
            if (args.projectOperations.length > 0) {
                config.projects = validatedProjects;
                console.log(`[MANAGER] Projects list updated to ${config.projects.length} project(s)`);
            }

            // Apply interval change
            if (args.interval !== null) {
                config.interval = args.interval;
                console.log(`[MANAGER] Interval set to: ${config.interval} seconds`);
            }

            // Handle daemon management
            if (!daemonRunning) {
                console.log('[MANAGER] Starting new daemon...');
                config.daemon_pid = spawnDaemon();
                console.log(`[MANAGER] Daemon started with PID ${config.daemon_pid}`);
            } else if (intervalChanged) {
                console.log(`[MANAGER] Interval changed - Restarting daemon (old PID ${config.daemon_pid})...`);
                killDaemon(config.daemon_pid);
                config.daemon_pid = spawnDaemon();
                console.log(`[MANAGER] Daemon restarted with new PID ${config.daemon_pid}`);
            } else {
                console.log(`[MANAGER] Daemon already running with PID ${config.daemon_pid}`);
            }

            // Commit all projects
            if (config.projects.length > 0) {
                console.log('\n[MANAGER] Committing all projects...');
                gitCommitProjects(config.projects, config);
            } else {
                console.log('\n[MANAGER] No projects configured, skipping commit');
            }

            // Update last_saved_time
            config.last_saved_time = new Date().toISOString();

            // Save config
            saveConfig(config);
            console.log(`\n[MANAGER] Configuration saved to ${CONFIG_FILE}`);
        }

    } catch (error) {
        console.error('[ERROR]', error);
        exitCode = 1;
    } finally {
        releaseLock();
    }

    process.exit(exitCode);
}

main();