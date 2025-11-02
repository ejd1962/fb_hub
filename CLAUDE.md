# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Repository Setup
- **First time setup**: `source setup.source_bash`
  - Adds command_line_scripts directory to your PATH
  - Allows running TransVerse tools from any location
  - Re-run after opening new terminal sessions

### TransVerse System Launch
- **Launch all servers and proxy**: `launch_servers.js --mode=dev-vite --deployment=ngrok wordguess`
  - Launches hub server (front and back), and wordguess game server (front and back) and proxy manager
  - Uses ngrok for external access
  - Runs in dev-vite mode with HMR
  - Note: Requires sourcing setup.source_bash first, or use `node command_line_scripts/launch_servers.js ...`

### Individual Service Commands
- **Start dev server**: `npm run dev` - Runs Vite dev server with HMR
- **Build**: `npm run build` - Compiles TypeScript and builds production bundle with Vite
- **Preview build**: `npm run preview` - Preview the production build locally

## Project Purpose

This is a reusable authentication hub intended to provide sign-up/sign-in functionality for various game servers. Once the authentication flow is working, this component will be integrated into multiple game server projects.

Uses Google Firebase Authentication with support for:
- Email/Password authentication
- Google OAuth (Google ID sign-in)

## Architecture Overview

This is a React + TypeScript + Vite application with Firebase authentication.

### Firebase Configuration

- Firebase app is initialized in `src/firebase.ts` which exports the `app` instance
- **IMPORTANT**: The Firebase config in `src/firebase.ts` contains API keys that are committed to the repository. These should be treated as public but ensure proper Firebase security rules are configured.

### Authentication Flow

The app uses FirebaseUI for authentication with a specific setup pattern:

1. **Login page** (`src/login.tsx`):
   - Uses FirebaseUI pre-built components for authentication
   - Configured with Google OAuth and Email/Password providers
   - Uses `firebase/compat/app` for compatibility with FirebaseUI (which doesn't support Firebase v9+ modular SDK)
   - The Google OAuth client ID is hardcoded in the component
   - Redirects to `/home` after successful sign-in

2. **Protected routes** (`src/home.tsx`):
   - Uses Firebase v9+ modular SDK (`getAuth`, `onAuthStateChanged`)
   - Implements auth state listener that redirects to `/login` if user is not authenticated
   - Sign-out functionality is handled via `auth.signOut()`

### Key Technical Details

- **Mixed Firebase SDK usage**: The app uses both `firebase/compat/app` (for FirebaseUI compatibility) and the modern modular Firebase SDK (for auth state management). This is intentional due to FirebaseUI's compatibility requirements.

- **Routing**: Uses React Router v7 with BrowserRouter. Root path `/` redirects to `/home`.

- **TypeScript configuration**: Strict mode enabled with additional linting rules (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)

### File Structure

- `src/main.tsx` - App entry point, renders App component with React StrictMode
- `src/App.tsx` - Main app component with routing configuration
- `src/firebase.ts` - Firebase initialization and config
- `src/login.tsx` - Login page with FirebaseUI
- `src/home.tsx` - Protected home page with sign-out functionality
- `src/App.css` - Shared styles
- `src/index.css` - Global styles
- `command_line_scripts/` - TransVerse command line tools (see below)
- `setup.source_bash` - Repository setup script to add tools to PATH
- `CLAUDE_TOOLS_MD/` - Claude Code configuration files (see below)
- `CLAUDE_GEN_MD/` - Context files (cottage, family, personal info)

## TransVerse Command Line Tools

The `command_line_scripts/` directory contains all TransVerse command line utilities:

### System Management
- `launch_servers.js` - Launch hub and game servers with proxy
- `launch_all_games.js` - Launch all registered games
- `launch_ngrok.js` - Start ngrok tunnel
- `launch_localtunnel.js` - Start localtunnel
- `launch_portforward.js` - Port forwarding utility
- `launch_proxy.js` - Proxy manager

### Development Tools
- `scan_api_inventory.cjs` - Scan codebase for socket messages and HTTP endpoints
- `show-routes.js` - Display all routes in application
- `show-doc-flow.js` - Show documentation flow
- `doc-flow.js` - Documentation flow utility
- `add-route-markers.js` - Add route markers to code

### Project Management
- `clone_project.js` - Clone project structure for new games
- `copy-game-info-to-hub.js` - Sync game info to hub
- `copy-hub-elements-to-game.js` - Sync hub elements to games
- `sync-game-data.js` - Sync data between hub and games

### Utilities
- `increment-build.js` - Increment build version
- `git-backup.js` - Git backup utility
- `replace-in-files.js` - Bulk find/replace in files
- `generate-snapshot-info.cjs` - Generate project snapshots
- `get-public-ip.js` - Get public IP address

**Usage**: enter "source setup.source_bash" first to add these tools to your PATH, then run them directly by name.

## Claude Code Configuration

**IMPORTANT:** Claude Code configuration files are now stored in this repository.

**Location:** `/c/_projects/p23_fb_hub/fb_hub/CLAUDE_TOOLS_MD/`

**Files:**
- `CLAUDE_COMMON.md` - Common preferences across all Claude tools
- `CLAUDE_CODE.md` - Claude Code specific preferences
- `CLAUDE_CHAT.md` - Claude Chat specific preferences
- `CLAUDE_API.md` - Claude API specific preferences
- `TEMPLATES/` - Templates for MASR requests and other patterns

**Reading Configuration:**
```bash
cat /c/_projects/p23_fb_hub/fb_hub/CLAUDE_TOOLS_MD/CLAUDE_COMMON.md
cat /c/_projects/p23_fb_hub/fb_hub/CLAUDE_TOOLS_MD/CLAUDE_CODE.md
```

**Context Files Location:** `/c/_projects/p23_fb_hub/fb_hub/CLAUDE_GEN_MD/`
- `TO_DO_LIST.md` - Current tasks and priorities
- `DONE_OR_ABANDONED_LIST.md` - Completed/abandoned tasks
- `OTTER_LAKE_COTTAGE_COMPOUND_INFO.md` - Property layout and context
- `FAMILY_AND_FRIENDS.md` - Family members and contacts
- `PERSONAL_INFO.md` - Personal health and medication info

**Backup to Google Drive:**
A pre-push git hook automatically syncs:
- `CLAUDE_TOOLS_MD/` → `/g/My Drive/CLAUDE_TOOLS_MD/`
- `CLAUDE_GEN_MD/` (includes all context files + TODO/DONE lists) → `/g/My Drive/CLAUDE_GEN_MD/`

This ensures all configuration and context files are available across devices.

**Note:** Always use Unix-style paths (e.g., `/c/_projects/...`). Windows-style paths (`C:\...`) should only be used when absolutely necessary for Windows-specific tools.

