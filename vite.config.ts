import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 11000, // Hub uses game_number=0, so 11000 for dev-vite mode
        strictPort: true,
    }
})