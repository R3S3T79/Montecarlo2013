import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // forziamo Vite a preprocessare bcryptjs (CommonJS)
    include: ['bcryptjs'],
    // continuiamo a escludere lucide-react se necessario
    exclude: ['lucide-react'],
  },
});
