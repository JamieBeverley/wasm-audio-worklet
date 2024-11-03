import { defineConfig } from 'vite'
import { resolve } from 'path'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
    plugins: [
        wasm(),            // Allows importing .wasm files
        topLevelAwait(),   // Enables using top-level await with .wasm modules if needed
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.js'), // Set entry point
            name: 'mynode',
            fileName: 'mynode',
        },
        copyPublicDir: true,
        sourcemap: true,
        rollupOptions: {
            input: resolve(__dirname, 'src/index.js'),
            output: [
                {
                    dir: 'dist', // Output directory for npm package
                    format: 'es', // ES module format
                    entryFileNames: 'mynode.mjs', // Output filename for UMD
                },
                {
                    format: 'umd', // UMD format for compatibility
                    name: 'mynode', // Name for UMD export
                    dir: 'dist',
                    entryFileNames: 'mynode.umd.js', // Output filename for UMD
                }
            ]
        },
        assetsInlineLimit: 0, // Prevents wasm files from being inlined, ensuring they are included as separate assets
        assetsDir: "public",
        assetsInclude: [
            "**/*.static.js",
            "src/assets/*",
            "src/pkg/*",
            "./src/worklet.static.js",  
            "public/*",
        ],
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'), // Optional alias for cleaner imports
        },
    },
    //   publicDir: 'rust-wasm/pkg', // Includes static assets from rust-wasm/pkg/*.wasm
})
