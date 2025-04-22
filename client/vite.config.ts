import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    envDir: '../',
    server: {
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
                ws: true,
            },
            '/db': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: true,
                ws: true,
                rewrite: (path) => path.replace(/^\/db/, ''),
            }
        },
        hmr: {
            clientPort: 443,
        },
    },
    build: {
        target: "es2015"
    }
});
