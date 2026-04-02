import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            minify: false,
            rollupOptions: {
              external: [
                'sqlite3', 
                'bindings', 
                'better-sqlite3',
                'playwright',
                'playwright-core',
                'winston',
                'fs-extra',
                'chromium-bidi',
                'mongodb',
                'kerberos',
                '@mongodb-js/zstd',
                '@aws-sdk/credential-providers',
                'gcp-metadata',
                'snappy',
                'socks',
                'aws4',
                'bson'
              ],
            },
          },
        },
      },
      preload: {
        // Shortcut of `build.lib.entry`.
        input: 'electron/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            minify: false,
          },
        },
      },
      // Ployfill the Electron and Node.js built-in modules for Renderer process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
