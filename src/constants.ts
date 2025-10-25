// Web App Constants

// Debug Control
// Set to true to show debug slider in banner and allow debug mode toggling
// Set to false to hide debug slider and force debug mode off (for production)
export const ALLOW_DEBUG = true;

/**
 * PUBLIC_DIR - Base path for accessing static assets from public/ directory in FRONTEND code
 *
 * This will be:
 * - '' (empty string) when running without proxy (direct access)
 * - '/localhost_11000' when running with proxy in dev-vite mode
 *
 * Usage in frontend:
 *   import { PUBLIC_DIR } from './constants';
 *   fetch(`${PUBLIC_DIR}/games/wordguess/game_info.json`)
 *   <img src={`${PUBLIC_DIR}/images/logo.png`} />
 *
 * NOTE: NO trailing slash (always ends with either '' or '/localhost_XXXXX')
 */
export const PUBLIC_DIR = import.meta.env.BASE_URL.replace(/\/$/, '');
