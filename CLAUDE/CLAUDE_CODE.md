# CLAUDE_CODE.md
# Claude Code (CC) Specific Guidelines
====================================================================


Last Updated: 2025-10-27 11:59:22 pm -- by Eric (manually) 

This file contains preferences specific to **Claude Code (CC)** interactions.

**IMPORTANT**: Always read `CLAUDE_COMMON.md` first - it contains shared guidelines for all Claude interaction modes. This file only covers Claude Code specific preferences.

Current Tools in the Claude Clan include:
- Claude Chat (CChat)
- Claude Code (CC)
- Claude API  (CApi)

Mode-specific preferences are documented in their respective files (in this directory on google drive):
- `CLAUDE_CHAT.md`    - Claude Chat specific preferences
- `CLAUDE_CODE.md`    - Claude Code specific preferences
- `CLAUDE_API.md`     - Claude API specific preferences
- `CLAUDE_COMMON.md`  - Common preferences across Claude tools




## CC Startup Procedure

**At the start of EVERY Claude Code session, you MUST:**

1. **Read global configuration files:**
   ```bash
   cat "/c/_projects/p23_fb_hub/fb_hub/CLAUDE/CLAUDE_COMMON.md"
   cat "/c/_projects/p23_fb_hub/fb_hub/CLAUDE/CLAUDE_CODE.md"
   ```

2. **Source the PATH setup script:**
   ```bash
   source /c/_projects/p23_fb_hub/fb_hub/setup.source_bash
   ```
   **CRITICAL:** Use `source` (not just running the script) to avoid creating a subshell that would lose the PATH changes. This adds command_line_scripts to your PATH so you can run scripts directly by name.

3. **Check git-backup daemon status:**

4. **Check for active TO_DO_LIST.md file:**
   ```bash
   if [ -f /c/_projects/p23_fb_hub/fb_hub/TO_DO_LIST.md ]; then
     cat /c/_projects/p23_fb_hub/fb_hub/TO_DO_LIST.md
   fi
   ```
   This file contains Eric's current triage list with RED/YELLOW/GREEN priorities and deadlines. If it exists, read it to understand current priorities and help keep Eric on track.
   ```bash
   cd /c/_projects/p23_fb_hub/fb_hub/command_line_scripts && node git-backup.js --status
   ```
   If not running, restart it and inform Eric.

4. **Remind Eric of the standard launch command:**
   ```bash
   cd /c/_projects/p23_fb_hub/fb_hub
   launch_servers.js --mode=dev-vite --deployment=ngrok wordguess
   ```

---



## ═══════════════════════════════════════════════════════════════════════
## CRITICAL PATH RULE - READ THIS FIRST
## ═══════════════════════════════════════════════════════════════════════

**ABSOLUTE RULE: ALWAYS USE UNIX-STYLE PATHS**

### The Rule
- **ALWAYS use Unix-style paths**: `/c/Users/ericd/...` or `/g/My Drive/...`
- **NEVER use Windows-style paths**: NO `C:\Users\...` or `/c/Users/...`
- **NEVER use backslashes**: Not in bash, not in sed, not in grep, not anywhere
- **NEVER use escaped backslashes**: Not `C:\` or `C:\_`

### When to Use Windows Paths
**ONLY when using PowerShell AND there is LITERALLY no other way to achieve the goal**

Before using Windows-style paths:
1. Stop and ask Eric for explicit approval
2. Explain why Unix-style paths will not work
3. Explain why bash cannot be used
4. Wait for approval before proceeding

### Examples

✅ CORRECT - Always use these:
```bash
cd /c/_projects/p23_fb_hub/fb_hub
cat "/c/_projects/p23_fb_hub/fb_hub/CLAUDE/CLAUDE_COMMON.md"
sed 's/old/new/' /c/Users/ericd/file.txt
grep "pattern" /c/_projects/myproject/src/file.js
```

❌ WRONG - Never use these:
```bash
cd C:\_projects\p23_fb_hub\fb_hub
cat "G:\My Drive\CLAUDE\CLAUDE_COMMON.md"
sed 's|C:\Users\ericd|/c/Users/ericd|' file.txt
grep "C:\\" /c/Users/ericd/file.txt
```

### Why This Matters
- Eric lives in Git Bash (Unix environment)
- Windows paths break bash commands
- Escaped backslashes are error-prone and hard to read
- Unix paths work in both bash and most Windows tools
- Consistency prevents confusion and errors

**This rule has been explained multiple times. Follow it without exception.**

## ═══════════════════════════════════════════════════════════════════════


## Editing These Configuration Files

**For detailed instructions on editing CLAUDE configuration files (CLAUDE_COMMON.md, CLAUDE_CODE.md, etc.):**
- See the "Editing CLAUDE Files" section in CLAUDE_COMMON.md
- **Recommended method:** Use sed script files for reliable updates
- **Never use:** Python open/read/write, Claude Code Read/Write/Edit tools
- **Always use:** bash commands (cat, sed, awk) with temp files in /c/Users/ericd/.claude/


# Global Claude Code Rules

## Path Notation Standards

### Bash/Git Bash Commands
When generating commands for bash, Git Bash, or any Unix-like shell:
- ALWAYS use forward slashes for paths
- ALWAYS use Unix-style absolute paths with drive letter notation: `/c/Users/blah` or `/c/_projects/myproject`
- Example: `cd /c/Users/ericd/Documents`
- Example: `git clone /c/_projects/repo`

### Windows Native Commands
When generating commands for Windows CMD, PowerShell, or Windows-native tools:
- ALWAYS use backslashes for paths
- ALWAYS use Windows-style absolute paths: `C:\Users\blah` or `C:\_projects\myproject`
- Example: `cd C:\Users\ericd\Documents`
- Example: `copy C:\source\file.txt C:\destination\`

### Determining Context
- If using Bash tool or git commands → use forward slash notation
- If using Windows-specific commands (cmd, PowerShell scripts) → use backslash notation
- When in doubt for the current environment (Windows with Git Bash), prefer forward slash notation for maximum compatibility

---

## Additional Rules

## TransVerse Project Management

### Server and Proxy Launching
**CRITICAL: For all TransVerse projects (fb_hub, wordguess, shared_components), Eric ALWAYS uses standard launch scripts**

- Eric uses `launch_servers.js` and `setup-reverse-proxy.js` to manage all servers and proxies

**STANDARD LAUNCH COMMAND:**
```bash
cd /c/_projects/p23_fb_hub/fb_hub
launch_servers.js --mode=dev-vite --deployment=ngrok wordguess
```

**NOTE:** No "node" prefix needed - launch_servers.js is executable. This launches:
- Hub backend (port 10001) + Hub frontend Vite (port 11001)
- WordGuess backend (port 10002) + WordGuess frontend Vite (port 11002)
- Reverse proxy with ngrok for external access

**IMPORTANT:** When you read CLAUDE_CODE.md at the start of a session, remind Eric of this launch command.

- Each server runs in its own Git Bash shell in a separate Windows Terminal tab
- Servers are launched via Eric's custom launch tab configuration in Windows Terminal
- **NEVER attempt to kill or restart servers** - This won't work because:
  - Servers are not running in Claude Code's bash sessions
  - Each server has its own independent shell managed by Windows Terminal
  - Only Eric can stop/restart servers through his terminal tabs
- **If a server needs to be restarted**: Ask Eric to restart it manually
- **If environment variables are wrong**: Tell Eric what needs to change, don't try to restart servers yourself
- **Focus on code changes only** - Server management is entirely Eric's domain

### TransVerse Project Structure
- `/c/_projects/p23_fb_hub/fb_hub` - Hub/lobby for all games
- `/c/_projects/p27_wordguess/wordguess` - WordGuess game
- `/c/_projects/p20_shared_components/shared` - Shared components library
- All projects use coordinated launch scripts with proper environment variable configuration

### Project Commits
**Definition**: A PROJECT COMMIT is a coordinated milestone commit across ALL repos in the TransVerse project that uses the same comprehensive commit message in each repository.

**The Three Repos:**
- `/c/_projects/p23_fb_hub/fb_hub` (Hub/Lobby)
- `/c/_projects/p27_wordguess/wordguess` (WordGuess game)
- `/c/_projects/p20_shared_components/shared` (Shared components library)

**When to create PROJECT COMMITS:**
- At major milestones (big features complete, major refactors done)
- When Eric explicitly requests "PROJECT COMMIT" or "do a project commit"
- Before major architectural changes
- When wrapping up a significant work session
- After completing complex multi-repo features

**PROJECT COMMIT Process:**

1. **Gather all changes since last PROJECT COMMIT** in each repo:
   - Check git log for each repo
   - Identify last PROJECT COMMIT by searching for "PROJECT COMMIT:" prefix in commit messages
   - If no previous PROJECT COMMIT found, use the last significant manual commit as baseline
   - Collect all commits and changes since then using `git log`

2. **Create comprehensive commit message**:
   - Analyze ALL changes across ALL three repos
   - Write a detailed, structured commit message following the format below
   - Cover overview, changes by repo, bug fixes, new features, architecture improvements
   - Prefix message with "PROJECT COMMIT: "
   - Save message to: `/c/Users/ericd/Desktop/project_commit_message.txt`
   - This allows Eric to review/edit before committing

3. **Commit to each repository with --allow-empty flag**:
   - Use `git commit --allow-empty -F /c/Users/ericd/Desktop/project_commit_message.txt` for each repo
   - The `--allow-empty` flag forces commit even if no changes exist in a particular repo
   - This ensures the PROJECT COMMIT marker appears in all repos with identical messages
   - Execute for: fb_hub, wordguess, and shared (in that order)

4. **Push all repositories**:
   - Run `git push` for each repo after committing
   - Verify all pushes succeeded

5. **Confirm completion** to Eric:
   - Summarize what was committed
   - Confirm all 3 repos committed and pushed
   - Note the commit message location on Desktop

**PROJECT COMMIT Message Format:**
```
PROJECT COMMIT: [Brief summary title]

Date: YYYY-MM-DD HH:MM:SS
Repos: fb_hub, wordguess, shared_components

Commit Range Covered:
- fb_hub: [old_hash] (YYYY-MM-DD HH:MM) → [new_hash] (YYYY-MM-DD HH:MM)
- wordguess: [old_hash] (YYYY-MM-DD HH:MM) → [new_hash] (YYYY-MM-DD HH:MM)
- shared: [old_hash] (YYYY-MM-DD HH:MM) → [new_hash] (YYYY-MM-DD HH:MM)

[Detailed summary organized by functional area, covering changes across all repos]

Example sections:
- Phase Tracking Architecture (wordguess)
- Message Sending Centralization (wordguess)
- Bug Fixes (specify repo)
- Refactoring (specify repo)
- New Features (specify repos)
```

**Key Points:**
- Same message goes to ALL 3 repos (that's the point of PROJECT COMMIT)
- Use `--allow-empty` to force commit even if a repo has no changes
- Message file saved to Desktop for review/editing before applying
- Always push after committing
### Command-Line Argument Delimiter Standard
For ALL scripts in the hub and game system (current and future):
- ALWAYS use `=` as the delimiter for command-line arguments
- Format: `--flag=value` NOT `--flag value`
- Example: `--proxy=yes --deployment=ngrok --mode=dev-vite`
- Reason: Clear association, easier parsing, handles complex values, industry standard

### Full Absolute Paths in Chat Transcript
When discussing files in the chat transcript:
- ALWAYS use full absolute paths (e.g., `/c/_projects/p23_fb_hub/fb_hub/src/lobby.tsx`)
- NEVER use relative paths or truncated paths in explanations
- This helps Eric clearly identify which file is being read, analyzed, or modified
- Especially important when similarly-named files exist across multiple projects

### Personal Address and Tone
- Address Eric as "Eric" or "you" (as appropriate in context)
- NEVER use "the user"
- Treat interactions as professional colleagues in a friendly, respectful manner

**The Non-Static Duo:**
- Eric: "Big Eric"
- Claude: "Sickick Claude"
- We are the "Non-Static Duo" (a deliberately non-alliterative play on "Dynamic Duo" with an inside wink to programmers)
- This self-referential, meta-humor is welcome and keeps Eric smiling

**Banter Guidelines:**
- **Light-hearted moments**: Witty, playful banter is encouraged and appreciated
  - Use the "Non-Static Duo" names when celebrating victories
  - Self-referential humor, wordplay, and programming puns are welcome
  - Keep it fun and engaging
- **Debugging/problem-solving mode**: Be clear, unambiguous, and direct
  - When hunting "the Lord of the Bugs," no cleverness - just clarity
  - Technical precision over wit
  - Save the jokes for after the bugs are squashed

**Example:**
- ✅ After fixing a bug: "The Non-Static Duo strikes again! That race condition didn't stand a chance."
- ✅ During debugging: "The proxy config at line 450 is missing the mode field. This causes the health check to fail because..."
- ❌ During debugging: "Looks like this code is having an identity crisis about whether it's in proxy mode or not! 😄"

### Autonomous Actions - Permission Policy
**Claude is authorized to perform non-destructive actions autonomously without asking permission**

#### Actions that DO NOT require permission (always proceed):
- **Reading any file on the computer** (Read tool)
  - You have permission to read ANY file anywhere on the system
  - **NEVER ask permission to read files - just read them**
  - This includes the global CLAUDE.md file itself - always read it directly
  - Reading is non-destructive and always allowed
  - If Eric asks you to update CLAUDE.md, read it first WITHOUT asking
- Searching for files (Glob tool)
- Searching file contents (Grep tool)
- Running bash commands that only READ data:
  - `ls`, `cat`, `head`, `tail`, `find`, `grep`, `git status`, `git log`, `git diff`
  - `npm list`, `which`, `pwd`, `echo`, `env`
  - Any command that displays information without modifying files
- Web searches and web fetches
- Analyzing code structure and dependencies
- Creating todo lists for planning
- Launching background agents for research or exploration
- **Git read-only operations**: You do NOT need permission to read git information
  - `git status`, `git log`, `git diff`, `git show`, `git branch`, `git remote -v`
  - `git fetch` (fetching remote changes to inspect)
  - Any git command that only reads or displays information
  - You DO need permission for `git commit`, `git push`, `git pull`, `git merge`, etc.

#### Actions that DO require permission (ask first):
- Writing new files (Write tool)
- Modifying existing files (Edit tool)
- Running bash commands that MODIFY data:
  - `git commit`, `git push`, `npm install`, `rm`, `mv`, `cp`
  - Any command with `>` or `>>` redirection
  - Any command that changes filesystem state
- Creating or modifying configuration files
- Making architectural decisions that affect multiple files
- Choosing between multiple valid implementation approaches

#### Guidelines:
- When in doubt about whether something is destructive, err on the side of proceeding (if it's just reading/analyzing)
- For major architectural decisions: Present options and ask Eric to choose
- Batch related file modifications together rather than asking permission for each individual edit
- Use judgment: If Eric gave a clear instruction to implement something, proceed with the implementation without asking for permission at every step


#### Git Backup Daemon Management
**ALWAYS check and ensure the git-backup.js daemon is running at the start of every work session**

- Eric uses `/c/_projects/p23_fb_hub/fb_hub/command_line_scripts/git-backup.js` as an autonomous daemon for auto-commits
- The daemon monitors multiple projects and auto-commits every 10 minutes (600 seconds by default)
- Configuration stored in `/c/Users/ericd/git-backup.json`

**At the START of EVERY work session, you MUST:**
1. Check daemon status: `cd /c/_projects/p23_fb_hub/fb_hub/command_line_scripts && node git-backup.js --status`
2. Look for "Running: YES" or "Running: NO" in the output
3. If daemon is NOT running:
   - Automatically launch it: `cd /c/_projects/p23_fb_hub/fb_hub/command_line_scripts && node git-backup.js --restart`
   - Inform Eric: "✓ git-backup daemon was not running - I've restarted it (PID: XXXXX)"
4. If daemon IS running:
   - Inform Eric that you have confirmed the git-backup.js daemon is running and show him the --status results

**How to check if daemon is running:**
```bash
cd /c/_projects/p23_fb_hub/fb_hub/command_line_scripts && node git-backup.js --status
```

**How to restart the daemon:**
```bash
cd /c/_projects/p23_fb_hub/fb_hub/command_line_scripts && node git-backup.js --restart
```

**Notes:**
- The daemon handles ALL auto-commit functionality - no manual commits needed
- Git will not create empty commits if no changes exist (this is normal and desired)
- The daemon monitors: fb_hub, wordguess, and shared_components projects
- Default interval: 600 seconds (10 minutes)
- This ensures Eric never loses more than 10 minutes of work across all projects

### Proactive Time Checking
**CRITICAL RULE: Always know the current time without asking Eric**

- **Use the `date` command to check current time** - Do this proactively, never ask Eric for the time
- **No permission needed** - Time checks are non-destructive and always allowed
- **Check time at conversation turns** when time-sensitive tasks are involved
- **Timestamp Eric's inputs** when relevant for tracking elapsed time
- **Use for reminders and scheduling** - Calculate time until deadlines, set up time-based alerts

#### When to Check Time:
- Start of time-sensitive conversations
- Before/after tasks with duration estimates
- When tracking multi-step processes with time constraints
- For calculating countdowns to deadlines
- When Eric mentions a time in the future (set mental reminders)

#### Example Usage:
```bash
# Check current time
date
# Output: Sat, Nov  1, 2025  9:54:49 PM
```

#### Benefits:
- Removes cognitive load from Eric (no need to tell you the time)
- Enables accurate time tracking and countdown reminders
- Improves coordination on time-sensitive tasks
- Makes collaboration more autonomous and efficient

**Protocol established 2025-11-01 during Jeep antifreeze emergency**






### Git File Recovery Naming Convention
**CRITICAL RULE: When recovering files from git, always use .recovered suffix**

When recovering old versions of files from git commits (for comparison, reference, or restoration):
- **ALWAYS use the `.recovered` suffix** - Never overwrite the current working file
- Format: `original_filename.ext.recovered`
- Examples:
  - `launch_ngrok.js.recovered`
  - `setup-reverse-proxy.js.recovered`
  - `index.tsx.recovered`
- Command pattern: `git show COMMIT_HASH:path/to/file.js > path/to/file.js.recovered`
- This allows safe side-by-side comparison without losing current work
- Eric can then manually merge changes or choose which version to use
- **NEVER** use commands like `git checkout COMMIT -- file.js` which overwrite the current file

#### Example:
```bash
# ✅ CORRECT - Safe recovery with .recovered suffix
git show 1bc6336:launch_ngrok.js > launch_ngrok.js.recovered
git show 1bc6336:setup-reverse-proxy.js > setup-reverse-proxy.js.recovered

# ❌ WRONG - Overwrites current file, loses work
git checkout 1bc6336 -- launch_ngrok.js
```

### Git Revert and File Recovery Safety Protocol
**CRITICAL: Never discard work without explicit approval and backup**

#### Before ANY Reversion or Recovery Operation
When Eric requests or you suggest reverting/recovering from:
- Git commits (`git reset`, `git checkout`, `git revert`)
- Backup files
- Snapshots
- Any operation that would overwrite current files

You MUST:

1. **Analyze and Report**:
   - Check timestamp of recovery source (commit date, file modification time)
   - Compare file sizes if recovering from file backup
   - Show git log to display recent commits
   - Report findings: "Last commit was [X hours/days] ago at [timestamp]"
   - If file backup: "Backup file is [size], current file is [size]"
   - Highlight if backup is stale or suspiciously different

2. **Create Pre-Reversion Backup**:
   - Create timestamped directory: `.backup/pre-reversion-YYYYMMDDHHMMSS/`
   - Copy ALL files that would be overwritten to this directory
   - Preserve directory structure
   - Example: `.backup/pre-reversion-20251025143022/server/index.js`
   - Confirm backup location to Eric

3. **Get Explicit Approval**:
   - Present findings from step 1
   - Show backup location from step 2
   - Ask: "The last commit/backup is from [timestamp]. Current work will be saved to [backup dir]. Proceed with reversion?"
   - **DO NOT proceed without explicit "yes" or "proceed"**

4. **After Reversion**:
   - Confirm what was recovered
   - Remind Eric of backup location if they need to recover current work
   - Suggest reviewing changes: `git diff HEAD .backup/pre-reversion-YYYYMMDDHHMMSS/`

#### Example Protocol:
```
Eric: "Revert index.js from git"

Claude:
"Before reverting, I've checked:
- Last git commit: 2025-10-20 13:18:59 (5 days ago)
- Commit message: 'About to do snapshot 001'
- Current index.js: 2,845 lines
- That commit's index.js: ~2,200 lines (estimated from diff)

WARNING: Last commit is 5 DAYS OLD. You may lose significant recent work.

I will save current work to:
  .backup/pre-reversion-20251025143022/server/index.js

Do you want to proceed with the reversion?"

[Wait for explicit approval before proceeding]
```

#### Never Skip This Protocol
- Even if Eric seems certain, ALWAYS show timestamps and create backup
- Better to pause Eric for 30 seconds than lose hours of work
- Err on the side of being overly cautious with reversions

### JSON5 Parser Standard
**CRITICAL RULE: ALWAYS use JSON5 for ALL JSON file operations**

- **NEVER use `JSON.parse()` or `JSON.stringify()`** - Use `JSON5.parse()` and `JSON5.stringify()` instead
- **File extensions remain `.json`** - Do NOT rename files to `.json5`
- **Import JSON5 in every file** that reads or writes JSON: `import JSON5 from 'json5';`
- **Benefits**:
  - Comments are supported and encouraged in all JSON files
  - Trailing commas are allowed
  - More forgiving syntax matches JavaScript object literals
- **Rationale**: JSON should have supported comments from the start. JSON5 fixes this limitation.
- **Apply everywhere**: Servers, scripts, utilities, build tools - any JavaScript/TypeScript code that touches JSON

Examples:
```javascript
// ✅ CORRECT - Always use JSON5
import JSON5 from 'json5';
const config = JSON5.parse(fs.readFileSync('config.json', 'utf8'));
fs.writeFileSync('output.json', JSON5.stringify(data, null, 2));

// ❌ WRONG - Never use native JSON
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
```

### Persistent Context Across Sessions
- Treat all interactions across Claude and Claude Code sessions as persistent
- Remember and use information learned about Eric from ANY previous conversation
- Apply knowledge from other contexts when relevant to current work
- Behave as a colleague with continuous memory, not amnesia between sessions

### No Fallbacks - Hard Fail on Errors
**CRITICAL RULE: Never allow fallbacks or silent failures**
- When data is missing, out of range, or invalid: HARD FAIL immediately
- NEVER guess, assume, or use default values when expected data is missing
- NEVER silently continue when an error occurs
- Always provide clear, explicit error messages explaining:
  - What data was expected
  - What was actually received (or missing)
  - Where the error occurred (file path, line number if applicable)
  - What needs to be fixed
- Log errors to appropriate location:
  - Console logs for backend/server errors
  - Alert boxes or error UI for frontend/user-facing errors
  - Error logs for file operations
- After logging the error, abort in an obvious way:
  - `throw new Error()` with descriptive message
  - `process.exit(1)` for scripts
  - Display error UI and halt execution for frontend
- Error messages should start with "FATAL:" or "ERROR:" to make severity clear
- Include context in error messages (what operation was being attempted)
- No silent failures - every error must be visible and obvious

### Splash Message Formatting Standards
**CRITICAL RULE: All splash messages must be copy-paste friendly**

When displaying splash messages (success banners, error messages, informational output):

#### Format Rules:
- **Top and bottom borders ONLY**: Use `═` or `━` characters for horizontal lines
- **NO left/right edges**: Never use `║` or vertical border characters
- **NO decorative symbols**: Never use emojis or Unicode symbols like:
  - ❌ Pointing fingers: 👉
  - ❌ Keys: 🔑
  - ❌ Checkmarks: ✅ ✓
  - ❌ Rockets: 🚀
  - ❌ Warning symbols: ⚠️
  - ❌ Any other emojis or decorative Unicode
- **Reason**: Copy-paste into text editors corrupts or hides these symbols, making messages hard to share

#### Example:
```javascript
// ✅ CORRECT - Clean, copy-paste friendly
console.log('\n' + '═'.repeat(80));
console.log('');
console.log('LAUNCH SUCCESSFUL!');
console.log('');
console.log('Hub URL:');
console.log('https://example.com');
console.log('');
console.log('═'.repeat(80) + '\n');

// ❌ WRONG - Has decorative symbols and left/right edges
console.log('║  🚀 LAUNCH SUCCESSFUL! 🚀  ║');
console.log('║  👉 https://example.com    ║');
```

#### Apply Everywhere:
- All TransVerse project scripts (launch_servers.js, setup-reverse-proxy.js, launch_localtunnel.js)
- All shared component utilities (display-server-urls.js, display-server-environment.js)
- All future projects and utilities
- Any output meant to be shared via messaging apps or text editors

### Reverse Proxy Path Awareness
**CRITICAL RULE: All URLs, Socket.IO connections, and asset paths MUST be proxy-aware**

This system supports two modes:
1. **Direct mode**: Services accessed directly at `http://localhost:PORT`
2. **Proxy mode**: All services routed through reverse proxy with path prefixes
   - localhost proxy: `http://localhost:8999/localhost_10001`
   - ngrok proxy: `https://abc123.ngrok.io/localhost_10001`

#### Frontend Path Constants
- **ALWAYS use `PUBLIC_DIR`** for all frontend asset paths and routing
  - Import: `import { PUBLIC_DIR } from '@/constants'`
  - Definition: `PUBLIC_DIR = import.meta.env.BASE_URL.replace(/\/$/, '')`
  - Direct mode: `PUBLIC_DIR = ''` (empty string)
  - Proxy mode: `PUBLIC_DIR = '/localhost_11001'`
  - Examples:
    - Asset path: `${PUBLIC_DIR}/game/food/background.jpg`
    - React Router: `<BrowserRouter basename={PUBLIC_DIR}>`
    - Link: `<a href="${PUBLIC_DIR}/room/${roomId}">`

#### Backend Path Constants
- **ALWAYS use `BACKEND_PUBLIC_DIR`** for all backend route prefixes
  - Direct mode: `BACKEND_PUBLIC_DIR = ''` (empty string)
  - Proxy mode: `BACKEND_PUBLIC_DIR = '/localhost_10001'`
  - Examples:
    - Express routes: `app.get(\`${BACKEND_PUBLIC_DIR}/api/health\`, ...)`
    - Redirects: `res.redirect(\`${BACKEND_PUBLIC_DIR}/lobby\`)`

#### Socket.IO Configuration
**ALWAYS configure Socket.IO with `path` option when connecting**

Never use:
```typescript
// ❌ WRONG - Will fail in proxy mode
const socket = io('http://localhost:10001/lobby');
```

Always use:
```typescript
// ✅ CORRECT - Proxy-aware
const url = new URL(trueUrl);
const origin = url.origin;
const path = url.pathname || '';

const socketOptions: any = {
  path: path ? `${path}/socket.io` : '/socket.io',
};

const socket = io(`${origin}/lobby`, socketOptions);
```

#### TRUE_URL Construction (Backend)
**Backend servers MUST compute TRUE_URL from proxy configuration**

Never use:
```javascript
// ❌ WRONG - Hardcoded, not proxy-aware
const TRUE_URL = process.env.TRUE_URL;
```

Always use:
```javascript
// ✅ CORRECT - Dynamically computed from PROXY_INFO
let TRUE_URL;
if (PROXY_INFO && PROXY_INFO.base_url && PROXY_INFO.mode !== 'direct') {
  // Proxy mode: base_url + path prefix
  TRUE_URL = `${PROXY_INFO.base_url}/localhost_${PORT}`;
} else {
  // Direct mode: fallback to env or localhost
  TRUE_URL = process.env.TRUE_URL || `http://localhost:${PORT}`;
}
```

#### Checklist for ANY URL/Socket.IO Code
When adding or modifying code that involves URLs or Socket.IO:
1. ✓ Does this use `PUBLIC_DIR` or `BACKEND_PUBLIC_DIR` for paths?
2. ✓ Does Socket.IO connection include `path` option?
3. ✓ Is TRUE_URL computed from `PROXY_INFO.base_url` (backend)?
4. ✓ Will this work with both localhost proxy AND ngrok proxy?
5. ✓ Have I tested both direct mode and proxy mode?

#### Common Mistakes to Avoid
- ❌ Hardcoding URLs like `http://localhost:10001`
- ❌ Using `/socket.io/` without path prefix
- ❌ Forgetting `basename` in React Router
- ❌ Absolute paths without `PUBLIC_DIR` prefix
- ❌ Assuming window.location.port is the actual service port (it's the proxy port!)
- ❌ Constructing TRUE_URL from environment variable only


---

# TransVerse Architectural Patterns

## Overview

These are proven architectural patterns developed during the creation of the TransVerse multiplayer game platform. They solve fundamental challenges in building phase-based multiplayer games and represent institutional knowledge that should be applied across all TransVerse games.

---

## Pattern 1: MASR (Message-Action-Sequence-Report)

### What is MASR?

MASR (Message-Action-Sequence-Report) is a documentation format that makes complex async client-server interactions instantly comprehensible. It linearizes the chaos of distributed systems into a clear, sequential narrative that reveals bugs, race conditions, and architectural issues at a glance.

### When to Use MASR

Request a MASR whenever you need to:
- **Understand** complex client-server interactions
- **Debug** async messaging issues, race conditions, or state synchronization problems
- **Document** how a feature works across client/server boundaries
- **Design** new multi-client features before implementing
- **Review** existing code to find hidden bugs or edge cases

MASR is especially valuable for:
- Multiple clients interacting (player joins while another plays)
- Phase transitions (waiting → guessing → reveal)
- State synchronization (highlights, scores, game state)
- Real-time features (decay bars, timers, animations)

### Magic Words to Generate MASR

```
Generate a MASR for: [scenario description]
Entry point: [user action, e.g., "User clicks Join Game button"]
Actors: [list all players/clients involved]
Files: [list of relevant files]
Focus: [specific aspect, e.g., "highlight synchronization", "phase catchup"]
Initial state: [optional - describe starting conditions]
```

### MASR Format Structure

A complete MASR includes:

1. **Scenario Description** - What is happening, who is involved, why this matters
2. **Initial State** - Current state of all actors (clients, server, room state)
3. **Message-Action Sequence** - The core of the MASR, step by step:
   - **CLIENT ACTION** (with file:line references)
     - What the user did
     - What code executed
     - What state changed locally
   - **SERVER RECEIVES** (handler details)
     - Which message handler activated
     - Validation checks performed
   - **SERVER ACTIONS** (what it does, what it stores)
     - State modifications
     - Data stored for future use
     - Logic decisions made
   - **SERVER SENDS** (to whom, what message)
     - Which clients receive messages
     - Message contents and format
     - Broadcast vs targeted sends
   - **CLIENT RECEIVES** (what each client does)
     - How each client processes the message
     - UI updates triggered
     - Local state changes
4. **Final State** - Resulting state of all actors after sequence completes
5. **Key Design Points** - Why this works, what to watch out for, architectural insights

### Example MASR Request

```
Generate a MASR for: Player joins game while another player is in guessing phase
Entry point: Cranberry clicks "Join Game" button (game-room.tsx:2148)
Actors: BigEric (active player in guessing phase), Cranberry (joining from welcome phase)
Files: server/index.js (cs_join_game handler), game-room.tsx (join button, sc_set_phase handlers)
Focus: How highlights and game state are synchronized to late-joining player
Initial state: BigEric has clicked 2 wrong images (yellow, red highlights), Cranberry is in welcome phase
```

### Why MASR Works

- **Linearizes async chaos** - Turns parallel, async events into sequential narrative
- **Shows causality** - Each step clearly triggers the next
- **Reveals hidden assumptions** - Makes implicit dependencies explicit
- **Exposes race conditions** - Timing issues become obvious
- **File:line references** - No guessing where code lives
- **Human-readable** - Non-programmers can follow the logic
- **Instantly debuggable** - Bugs jump out when sequence is laid bare

### Real Example

The "Join Game Bug" was instantly solved by creating a MASR:
- BigEric was in guessing phase with 2 wrong guesses
- Cranberry clicked "Join Game"
- Server sent ONLY sc_set_phase (guessing) to Cranberry
- Cranberry's client initialized highlights to all 'none'
- **BUG REVEALED**: Cranberry couldn't see BigEric's yellow/red highlights!
- **SOLUTION**: Implement phase catchup (see Pattern 2)

---

## Pattern 2: Phase Catchup for Late-Joining Players

### The Problem

In multiplayer phase-based games, players can join at any time. A player joining during phase N needs to see the same state as players who progressed naturally from phase 1.

**Example:**
- BigEric is in "guessing" phase, has clicked 2 images (yellow, red highlights)
- Cranberry clicks "Join Game" while BigEric is mid-turn
- If Cranberry only receives "guessing" phase message, she sees:
  - ✓ The 4 images (from choices_list)
  - ✗ All highlights as 'none' (should be yellow, red)
  - ✗ Decay bar in wrong state
  - ✗ Missing context about what's happening

### The Solution: Sequential Phase Replay

**Core Principle: Always start at the beginning and replay essential messages through each phase.**

Never shortcut directly to target phase. Even if joining "reveal" phase, send:
1. waiting phase message
2. guessing phase message + highlights
3. reveal phase message

This ensures the client builds state correctly, step by step.

### Implementation Pattern

#### Step 1: Define Phase Sequence

```javascript
// Example: Turn-based word guessing game
Phase Sequence: welcome → waiting → guessing → reveal → celebrate
```

#### Step 2: Identify Essential Messages Per Phase

For each phase, determine what messages are ESSENTIAL for a late joiner to understand that phase.

```javascript
waiting:   
  - sc_set_phase (waiting) with activePlayerId
  
guessing:  
  - sc_set_phase (guessing) with targetWord, choices_list
  - sc_set_highlights with current highlights from active player
  
reveal:    
  - sc_set_phase (reveal) with availablePoints, actualPointsEarned
  
celebrate: 
  - sc_set_phase (celebrate) with winnerUserId, winnerUsername, winnerScore
```

**Key insight**: Don't just send the target phase - send ALL the context-building messages that got other players to that phase.

#### Step 3: Store Required State for Catchup

The server must store data needed for catchup when entering each phase:

```javascript
// When entering guessing phase, store:
roomState.currentTargetWord = targetWord;
roomState.currentChoicesList = choices_list;

// When highlights change, store:
roomState.currentHighlights = highlights_list;

// When entering reveal phase, store:
roomState.lastRevealAvailablePoints = availablePoints;
roomState.lastRevealActualPointsEarned = actualPointsEarned;

// When entering celebrate phase, store:
roomState.celebrateWinnerUserId = winnerUserId;
roomState.celebrateWinnerUsername = winnerUsername;
roomState.celebrateWinnerScore = winnerScore;
```

**Pattern**: Every time the game enters a phase, immediately store the data a late joiner would need to catch up to that phase.

#### Step 4: Add Message Delay Constant

```javascript
// At top of server file with other constants
const CATCHUP_MESSAGE_DELAY_MS = 10; // Ensures message ordering
```

**Why 10ms?**
- Prevents message reordering due to async processing
- Small enough to be imperceptible to users
- Large enough to guarantee order even with network jitter
- Adjustable if future testing reveals issues

#### Step 5: Create Catchup Function

See full example in WordGuess server/index.js lines 1576-1669.

Key structure:
```javascript
async function catchupJoiningPlayer(roomId, userId, targetPhase) {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Send phase 1 message
  sendGameMessage(...);
  await sleep(CATCHUP_MESSAGE_DELAY_MS);
  if (targetPhase === 'phase1') return;
  
  // Send phase 2 message
  sendGameMessage(...);
  await sleep(CATCHUP_MESSAGE_DELAY_MS);
  // Send phase 2 additional data (e.g., highlights)
  sendMessage(...);
  await sleep(CATCHUP_MESSAGE_DELAY_MS);
  if (targetPhase === 'phase2') return;
  
  // Continue for all phases...
}
```

#### Step 6: Update Join Handler

```javascript
socket.on('cs_join_game', ({ roomId, userId }) => {
  // 1. Reorder occupants
  // 2. Broadcast occupant list to all
  // 3. Update occupant stats
  // 4. Determine target phase (active player's current phase)
  // 5. Call catchup function
  catchupJoiningPlayer(roomId, userId, targetPhase);
});
```

### Key Principles

1. **Always start at beginning** - Never shortcut directly to target phase
2. **Delay between EVERY message** - Ensures correct ordering despite network variability
3. **Store state for catchup** - When entering a phase, store data needed for future catchup
4. **If-then-endif structure** - Makes catchup logic auditable and prevents bugs
5. **10ms is usually sufficient** - Adjustable via constant if needed
6. **Comprehensive logging** - Log every catchup step for debugging

### Magic Words to Implement Catchup

```
I need to implement a phase catchup system for late-joining players.

Phase sequence: [list phases in order]
Essential messages per phase: [list what's needed for each phase]

Files to modify:
- Server: [server file path] 
- Client: [client file path] (if needed)

Please:
1. Add CATCHUP_MESSAGE_DELAY_MS constant (start with 10ms)
2. Create catchupJoiningPlayer() function with clear if-endif structure for each phase
3. Add roomState fields to store catchup data
4. Update each phase entry handler to store catchup data when entering that phase
5. Replace single-phase send in join handler with catchup call
6. Add comprehensive logging at each catchup step

Follow the TransVerse Phase Catchup Pattern from CLAUDE_CODE.md.
```

### Why This Works

- **Replays state-building sequence** - Each message builds on previous state
- **Order-preserving delays** - Prevents race conditions from async processing
- **Single source of truth** - Server decides what's sent and when
- **Auditable structure** - Clear if-endif blocks make logic obvious
- **Prevents "bug eggs"** - Systematic approach eliminates edge cases
- **Future-proof** - Adding new phases is just adding new if-endif blocks

### Testing Checklist

When implementing phase catchup, test ALL these scenarios:

- [ ] Join during waiting phase (should see waiting UI)
- [ ] Join during guessing phase (should see images, highlights, decay bar in correct state)
- [ ] Join during reveal phase (should see results, scores)
- [ ] Join during celebrate phase (should see winner, confetti if applicable)
- [ ] Multiple players join in rapid succession (no race conditions)
- [ ] Join, leave, rejoin (catchup works every time)
- [ ] Join while active player is mid-action (e.g., clicking images)
- [ ] Network lag simulation (messages still arrive in order)

### Common Pitfalls to Avoid

❌ **Sending only target phase** - Results in missing context
❌ **No delays between messages** - Can cause out-of-order processing
❌ **Forgetting to store catchup data** - Late joiners get stale or missing data
❌ **Complex branching logic** - Makes bugs hard to find
❌ **No logging** - Can't debug when things go wrong
❌ **Hardcoded values instead of roomState** - Catchup data is stale

✅ **Sequential replay with delays** - Bulletproof approach
✅ **Store data when entering each phase** - Data is always fresh
✅ **Simple if-endif structure** - Easy to audit and debug
✅ **Comprehensive logging** - Know exactly what's happening
✅ **Use stored roomState values** - Catchup data is authoritative

### Real-World Example: WordGuess

In WordGuess, when Cranberry joins while BigEric is in guessing phase:

1. **Message 1** (0ms): sc_set_phase waiting
   - Cranberry's client: Enters waiting phase
   
2. **Delay** (10ms)

3. **Message 2** (10ms): sc_set_phase guessing with targetWord="pizza", choices_list=["pizza","burger","taco","pasta"]
   - Cranberry's client: Loads images, enters guessing phase
   
4. **Delay** (10ms)

5. **Message 3** (20ms): sc_set_highlights with highlights_list=["yellow","none","red","none"]
   - Cranberry's client: Applies yellow border to image 0, red border to image 2
   
6. **Done** (30ms total) - Cranberry sees exactly what BigEric sees!

**Without catchup**: Cranberry would see all borders as 'none', completely out of sync with reality.

---

## Pattern 3: MASR-Driven Development

### The Workflow

1. **Before implementing a feature**: Generate a MASR for the intended behavior
2. **Review the MASR** with team/stakeholders to ensure design is correct
3. **Implement based on MASR** - Each step in the MASR becomes code
4. **After implementation**: Generate a MASR of actual behavior
5. **Compare MASRs** - Intended vs actual reveals bugs instantly

### Why This Works

- **Design bugs found before coding** - MASR reveals flaws in design
- **Implementation bugs obvious** - Comparing MASRs shows where code diverges from intent
- **Living documentation** - MASRs serve as precise documentation of how features work
- **Faster debugging** - Generate MASR of buggy behavior, compare to expected MASR
- **Architectural clarity** - Complex interactions become simple narratives

### Example: Fixing the Join Game Bug

1. **Bug report**: "When Cranberry joins, she doesn't see BigEric's highlights"
2. **Generate MASR**: Document actual behavior (reveals missing sc_set_highlights)
3. **Design solution**: Generate MASR for correct behavior (shows catchup needed)
4. **Implement**: Add phase catchup based on solution MASR
5. **Verify**: Generate MASR of fixed behavior, confirm it matches design

**Result**: Bug fixed correctly on first try, no regressions.

---

## Applying These Patterns to New Games

### When Building a New Multiplayer Game

1. **Define phase sequence** early in design
2. **Document essential messages per phase** in a MESSAGES_REFERENCE.md file
3. **Implement phase catchup from day one** - Don't retrofit it later
4. **Use MASR to design complex features** before coding
5. **Generate MASR for every bug** - Makes root cause obvious

### Checklist for Every New TransVerse Game

- [ ] MESSAGES_REFERENCE.md created with all cs_/sc_ messages
- [ ] Phase sequence documented
- [ ] Essential messages per phase identified
- [ ] CATCHUP_MESSAGE_DELAY_MS constant added
- [ ] catchupJoiningPlayer() function implemented
- [ ] roomState stores catchup data for each phase
- [ ] Join handler calls catchup function
- [ ] MASR generated for join feature
- [ ] All catchup scenarios tested

---

## Summary

These patterns are the **architectural DNA** of the TransVerse platform:

1. **MASR** - Makes async chaos comprehensible
2. **Phase Catchup** - Solves late-join synchronization systematically
3. **MASR-Driven Development** - Designs features correctly before coding

**They compound**: Each game built with these patterns is faster, more reliable, and more maintainable than the last.

**They scale**: Works for 2 players or 200 players, simple games or complex games.

**They prevent bugs**: Systematic approaches eliminate entire classes of bugs before they occur.

This is the **TransVerse Way**. 🚀

---


# TransVerse API Standards

**Purpose**: Standardized conventions for all TransVerse game servers and clients to ensure consistency, maintainability, and tooling support.

**Scope**: Applies to all TransVerse projects including WordGuess, TicTacToe, and future games.

---

## Socket.IO Message Standards

### Naming Convention

All socket messages follow strict naming:

- **cs_message_name** = Client to Server (request from client)
- **sc_message_name** = Server to Client (response/broadcast from server)

**Rules**:
- Use lowercase with underscores
- Name describes the action or data being communicated
- Be specific: cs_join_game not cs_join
- Use present tense: cs_request_start_game not cs_requested_start_game

### Message Handler Pattern

Server-side listener destructures parameters in function signature.
Client-side emitter passes object with all parameters.

**Key Points**:
- Always destructure parameters in the listener signature
- Use object parameter format not positional arguments
- Include all required parameters in object
- Optional parameters should have documented defaults

### Message Documentation

Every socket message MUST be documented in SOCKET_MESSAGES_REFERENCE.md with:
- Parameters
- Callback/Response format
- Sender (Client/Server and which component)
- Purpose (brief description)
- Phase (which game phase this is used in)
- Server Actions (for cs_ messages - what the server does)


---

## HTTP Endpoint Standards

### Endpoint Naming

**RESTful routes** (preferred for resources):
- GET /api/users
- GET /api/users/:id
- POST /api/users
- PUT /api/users/:id
- DELETE /api/users/:id

**Action-based routes** (for operations):
- POST /api/validate-session
- POST /api/generate-token
- GET /api/health-check

**Rules**:
- Always use /api/ prefix for API endpoints
- Use kebab-case for multi-word paths: /api/game-state not /api/gameState
- Plural nouns for resource collections: /api/rooms not /api/room
- Verbs for actions: /api/validate-session not /api/session/validate

### Path Prefix Awareness

**CRITICAL**: All backend code must use BACKEND_PUBLIC_DIR constant when constructing paths.

**Why**: Proxy servers may route requests with path prefixes (e.g., /wordguess/api/rooms). Using the constant ensures the app works behind proxies.

Server side uses: process.env.BACKEND_PUBLIC_DIR
Client side uses: import.meta.env.VITE_BACKEND_PUBLIC_DIR

### HTTP Handler Pattern

Server endpoints should:
- Use async/await for asynchronous operations
- Destructure parameters from req.body or req.params
- Validate all inputs
- Return consistent JSON format with success boolean
- Handle errors with appropriate status codes
- Log errors for debugging

Client calls should:
- Use fetch or axios
- Include proper headers (Content-Type: application/json)
- Handle both success and error responses
- Parse JSON responses


---

## TransVerse Comment Tags

### Purpose

Comment tags enable automated documentation and API scanning tools to extract metadata about endpoints and socket messages.

### Tag Format

Tags start with //@tagname or //@tagname: followed by content.

### Available Tags

**@endpoint** - Declares HTTP endpoint type and path
- Format: //@endpoint: METHOD /path/to/endpoint
- Required: Yes for HTTP endpoints
- Example: //@endpoint: POST /api/rooms

**@socket** - Declares socket message name
- Format: //@socket: cs_message_name or //@socket: sc_message_name
- Required: Yes for socket handlers
- Example: //@socket: cs_join_game

**@context** - Describes when and why this endpoint/message is used
- Format: //@context: When/where this is called
- Required: Recommended
- Example: //@context: Active player clicks Start My Turn button

**@purpose** - Brief description of functionality
- Format: //@purpose: What this does
- Required: Recommended
- Example: //@purpose: Transition from waiting phase to guessing phase

**@params** - Document expected parameters
- Format: //@params: followed by JSON5 or TypeScript-style parameter descriptions
- Required: Yes
- Example: //@params: { roomId: string, userId: string, availablePoints: number }

**@returns** - Document response structure
- Format: //@returns: followed by response format
- Required: Yes
- Example: //@returns: { success: boolean, room?: Room, message?: string }

**@phase** - Document which game phase(s) this is used in
- Format: //@phase: PhaseName or //@phase: Phase1 → Phase2
- Required: For game-specific endpoints/messages
- Example: //@phase: Guessing or //@phase: Welcome → Waiting

**@actors** - Document which roles interact with this endpoint
- Format: //@actors: Who sends/receives
- Required: Optional
- Example: //@actors: Active player → Server → All players

**@related** - Document related endpoints/messages
- Format: //@related: other_message_name, another_endpoint
- Required: Optional
- Example: //@related: cs_enter_room, sc_occupant_list

**@deprecated** - Mark old endpoints/messages
- Format: //@deprecated: Reason and alternative
- Required: When deprecating
- Example: //@deprecated: Use cs_request_start_game instead

### Tag Rules

1. Colon optional: //@tagname: with colon if text follows on same line, //@tagname without if content starts on next line
2. Contiguous comments: All consecutive // lines after a tag belong to that tag
3. Empty line ends tag: Empty line or non-comment line ends the tag block
4. Placement: Tags go immediately before the handler/endpoint declaration


---

## API Inventory Scanning

### scan_api_inventory.cjs Tool

The TransVerse scanner tool automatically extracts:
- All socket listeners (socket.on)
- All socket emitters (socket.emit, io.emit, socket.to().emit)
- All HTTP endpoints (app.get/post/put/delete)
- All HTTP clients (fetch, axios)
- All TransVerse comment tags
- Orphaned messages (emit without on, endpoint without client)

**Usage**:
From your game project directory, run:
  node /path/to/fb_hub/command_line_scripts/scan_api_inventory.cjs

Or after sourcing setup.source_bash from fb_hub:
  scan_api_inventory.cjs

**Output**:
- api_inventory_reports/api_inventory.json (machine-readable)
- api_inventory_reports/api_inventory.txt (human-readable)

**Review orphans** - The scanner detects:
- Socket emit without matching listener (potential unused code or missing implementation)
- Socket listener without matching emit (potential dead code)
- HTTP client call without matching server endpoint (will fail at runtime)

Note: Some orphans are expected (cross-boundary messages like client cs_ emit → server cs_ listener), but true orphans should be investigated.

---

## Documentation Requirements

### Every TransVerse Game Project Must Have

1. **SOCKET_MESSAGES_REFERENCE.md**
   - Complete list of all cs_/sc_ messages
   - Parameters, callbacks, purpose, phase, server actions
   - Message flow examples
   - Updated whenever messages change

2. **CLAUDE.md**
   - Project overview and purpose
   - Technology stack
   - Development commands
   - Architecture overview
   - Key technical details

3. **Phase documentation** (for phase-based games)
   - Phase sequence diagram
   - Essential messages per phase
   - Phase transition rules

### Regular Maintenance

- Run scan_api_inventory.cjs after significant changes
- Review orphans and remove dead code
- Update SOCKET_MESSAGES_REFERENCE.md when adding/removing messages
- Add TransVerse comment tags to all new endpoints/messages


---

## Standards Checklist

When creating a new TransVerse game or feature:

- [ ] All socket messages use cs_ or sc_ prefix
- [ ] All HTTP endpoints use /api/ prefix
- [ ] All paths use BACKEND_PUBLIC_DIR constant
- [ ] All handlers destructure parameters in signature
- [ ] All endpoints have TransVerse comment tags
- [ ] SOCKET_MESSAGES_REFERENCE.md created and updated
- [ ] Run scan_api_inventory.cjs and review report
- [ ] No unintentional orphans in scan report
- [ ] All API changes documented in reference files

---

**These standards ensure**:
- Consistent code across all TransVerse games
- Automated tooling can extract accurate API documentation
- Proxy-aware applications work correctly in all deployment scenarios
- New developers can quickly understand the API surface
- API drift is detected early through scanning

**The TransVerse Way**: Standards compound. Each game following these conventions becomes easier to understand, maintain, and integrate. 🚀

---

---


---

## Testing Multiplayer Functionality

### Browser Setup for Multiplayer Testing

**CRITICAL:** When testing multiplayer features (multiple users in the same game), you MUST use two different browser brands. Using different profiles of the same browser OR multiple windows/tabs will cause authentication conflicts.

**Why this matters:**
- Browser windows/tabs with the same profile share:
  - IndexedDB (where Firebase Auth stores authentication state)
  - localStorage (where profile cache is stored)
  - sessionStorage
  - Cookies
- **Even different Chrome profiles share some state** - authentication can bleed between profiles
- **Only different browser brands are truly isolated**

**Required Testing Setup:**

**Two Different Browser Brands (REQUIRED)**
- User A: Chrome
- User B: Edge (or Firefox, Safari, Brave, etc.)
- **Why:** Complete isolation - no shared storage, no shared authentication state
- **Eric's setup:** Chrome for User A, Edge for User B

**AVOID - These DO NOT work:**
- ❌ **Chrome profiles**: Even different profiles can share auth state
- ❌ **Multiple windows of the same browser**: Definitely shares everything
- ❌ **Multiple tabs**: Same problem as multiple windows
- ❌ **Incognito/Private browsing**: Too "forgetful" - doesn't save cookies, so ngrok warnings appear every time, causing 20-60 second delays

**ngrok Rate Limiting - Stagger Browser Launches:**

When using ngrok proxy, the free tier has a limit of **360 requests per minute**. Loading the game with audio preloading triggers many requests (music files, sound effects, images, JS bundles).

**Required Launch Sequence:**
1. Launch Browser 1 (Chrome for Eric)
   - Load hub lobby
   - Launch game
   - Let it fully load and cache all assets (~30-60 seconds)
2. **WAIT 1-2 MINUTES** (ngrok rate limit resets every 60 seconds)
3. Launch Browser 2 (Edge for Cathy)
   - Load hub lobby
   - Launch game
   - Should load without hitting rate limits

**Error message if you don't wait:**
```
ERR_NGROK_734
You have exceeded your limit of 360 requests per minute.
This limit will reset within 1 minute.
```

**After initial setup:** Once both browsers have cached assets, subsequent refreshes/navigations will be fast with no rate limit issues.

**Alternative: Use localhost proxy for testing (no rate limits)**
- Launch servers with `--deployment=localhost` instead of `--deployment=ngrok`
- Both browsers access via `http://localhost:8999`
- No external tunnel, no rate limits, instant loading
- Only downside: Not accessible from outside your computer (but not needed for testing)

**Testing Workflow:**
1. Launch Chrome → hub lobby → launch game as User A
2. **Wait 2 minutes**
3. Launch Edge → hub lobby → launch game as User B
4. Both users can now interact in the same game room
5. Each maintains their own identity, localStorage, and auth state

