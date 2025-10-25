/**
 * constants.js
 *
 * Shared constants for the FB Hub backend server
 */

/**
 * BACKEND_PUBLIC_DIR - Base path for serving static assets from public/ directory in BACKEND code
 *
 * This will be:
 * - '' (empty string) when running without proxy
 * - '/localhost_10000' when running with proxy
 *
 * Usage in backend:
 *   import { BACKEND_PUBLIC_DIR } from './constants.js';
 *   const filePath = join(__dirname, `../public${BACKEND_PUBLIC_DIR}/games/...`)
 *   app.use(`${BACKEND_PUBLIC_DIR}/static`, express.static(...))
 *
 * NOTE: NO trailing slash (always ends with either '' or '/localhost_XXXXX')
 */
export const BACKEND_PUBLIC_DIR = process.env.VITE_BASE_PATH?.replace(/\/$/, '') || '';
