import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3000' } },
  build: {
    outDir: 'dist',
    // تکه‌تکه کردن باندل تا بارگذاری اول سبک‌تر شود
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['antd', '@ant-design/icons'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          dates: ['dayjs'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
