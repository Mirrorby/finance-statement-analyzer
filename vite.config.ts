import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Оптимизация для production
  build: {
    // Увеличиваем лимит для больших библиотек
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // Разделяем большие библиотеки в отдельные чанки
        manualChunks: {
          'pdf-lib': ['pdfjs-dist'],
          'ocr-lib': ['tesseract.js'],
          'vendor': ['react', 'react-dom', 'lucide-react']
        }
      }
    }
  },
  
  // Оптимизация зависимостей для dev
  optimizeDeps: {
    include: ['pdfjs-dist', 'tesseract.js', 'localforage']
  },
  
  // CORS для CDN ресурсов
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});
