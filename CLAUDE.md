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
