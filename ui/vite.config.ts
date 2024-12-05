import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';


// https://vite.dev/config/
export default defineConfig({
    build: {
        rollupOptions: {
            external: /^\/app$/,
        },
    },
	plugins: [
		vue(),
		ViteImageOptimizer({
            png: { quality: 80 },
            jpeg: { quality: 75 },
            webp: { quality: 80 },
            avif: { quality: 70 },
            svg: {
                plugins: [
                    { name: 'removeViewBox' },
                    { name: 'sortAttrs' },
                ],
            },
        }),
	],
});