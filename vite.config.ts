import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { displayUrlsPlugin } from '@transverse/shared-components/vite/display-urls-plugin'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        displayUrlsPlugin('FB Hub', {
            routes: [
                '/ (redirects to /welcome)',
                '/welcome',
                '/lobby',
                '/home',
                '/signin',
                '/profile',
                '/about',
                '/jobs',
                '/contact',
                '/help',
                '/privacy',
                '/terms',
                '/change_email_or_pw'
            ],
            backendApis: [
                'GET  {hub_backend}/api/proxy-config',
                'GET  {hub_backend}/api/health',
                'POST {game_backend}/api/verify-token',
                'POST {game_backend}/api/game-session'
            ]
        })
    ],
    // Set base path for reverse proxy mode
    // Use VITE_BASE_PATH env var, or default to '/' for direct access
    base: process.env.VITE_BASE_PATH || '/',
    server: {
        port: 11000, // Hub uses game_number=0, so 11000 for dev-vite mode
        strictPort: true,
    }
})