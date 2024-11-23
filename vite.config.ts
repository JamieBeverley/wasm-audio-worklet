import { defineConfig } from 'vite'
import { resolve } from 'path'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        wasm(),            // Allows importing .wasm files
        topLevelAwait(),   // Enables using top-level await with .wasm modules if needed
        dts(), // TypeScript types
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'), // Set entry point
            name: 'wasm-audio-worklet',
            fileName: 'wasm-audio-worklet',
        },
        copyPublicDir: true,
        sourcemap: true,
        assetsInlineLimit: 0, // Prevents wasm files from being inlined, ensuring they are included as separate assets
        assetsDir: "public",
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'), // Optional alias for cleaner imports
        },
    },
    //   publicDir: 'rust-wasm/pkg', // Includes static assets from rust-wasm/pkg/*.wasm
})
