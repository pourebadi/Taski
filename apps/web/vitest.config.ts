import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: 'antd-jalali-plus', replacement: path.resolve(__dirname, 'test/jalali-shim.ts') }],
  },
  test: { environment: 'jsdom', globals: true, include: ['test/**/*.test.tsx'] },
});
