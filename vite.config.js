import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null;
          if (id.includes('/node_modules/vue/')) return 'vue-vendor';
          if (id.includes('/node_modules/primevue/config/')) return 'primevue-core';
          if (
            id.includes('/node_modules/primevue/button/') ||
            id.includes('/node_modules/primevue/radiobutton/') ||
            id.includes('/node_modules/primevue/inputtext/') ||
            id.includes('/node_modules/primevue/select/') ||
            id.includes('/node_modules/primevue/datepicker/') ||
            id.includes('/node_modules/primevue/dialog/') ||
            id.includes('/node_modules/primevue/dataview/')
          ) {
            return 'primevue-primitives';
          }
          return null;
        },
      },
    },
  },
})
