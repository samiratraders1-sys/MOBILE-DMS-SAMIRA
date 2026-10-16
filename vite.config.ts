import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
        react(), 
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // Set to 10MB to handle large bundle sizes
            },
            manifest: {
                name: 'Samira Traders DMS',
                short_name: 'Samira DMS',
                description: 'Distribution Management System',
                theme_color: '#ffffff',
                icons: [
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
                ]
            }
        })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'firebase/app': path.resolve(__dirname, './node_modules/firebase/app'),
        'firebase/auth': path.resolve(__dirname, './node_modules/firebase/auth'),
        'firebase/firestore': path.resolve(__dirname, './node_modules/firebase/firestore'),
        '@firebase/app': path.resolve(__dirname, './node_modules/@firebase/app'),
        '@firebase/auth': path.resolve(__dirname, './node_modules/@firebase/auth'),
        '@firebase/firestore': path.resolve(__dirname, './node_modules/@firebase/firestore'),
      },
      dedupe: [
        'react',
        'react-dom',
        'firebase',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        '@firebase/app',
        '@firebase/auth',
        '@firebase/firestore',
        '@firebase/component',
        '@firebase/util'
      ],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-hot-toast',
        'motion/react',
        'lucide-react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
