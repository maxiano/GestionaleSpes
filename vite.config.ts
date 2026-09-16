// Polyfill global crypto & diagnostics_channel for older Node.js versions (< 19 / 20)
try {
  if (typeof globalThis.crypto === 'undefined') {
    const nodeCrypto = await import('node:crypto');
    globalThis.crypto = (nodeCrypto.default || nodeCrypto) as any;
  }
} catch {
  // Ignora se non disponibile
}

try {
  const dc = await import('node:diagnostics_channel');
  const dcModule: any = dc.default || dc;
  if (dcModule && typeof dcModule.tracingChannel !== 'function') {
    dcModule.tracingChannel = function (name: string): any {
      const channel = (nameOrChannel: string): any => {
        if (typeof dcModule.channel === 'function') return dcModule.channel(nameOrChannel);
        return {
          hasSubscribers: false,
          publish: () => {},
          subscribe: () => {},
          unsubscribe: () => {},
        };
      };
      return {
        start: channel(`tracing:${name}:start`),
        end: channel(`tracing:${name}:end`),
        asyncStart: channel(`tracing:${name}:asyncStart`),
        asyncEnd: channel(`tracing:${name}:asyncEnd`),
        error: channel(`tracing:${name}:error`),
        hasSubscribers: false,
        subscribe: () => {},
        unsubscribe: () => {},
        traceSync: (fn: any) => fn(),
        tracePromise: (fn: any) => fn(),
        traceCallback: (fn: any) => fn,
      };
    };
  }
} catch {
  // Ignora se non disponibile
}

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  // Use relative base by default so the build works everywhere (GitHub Pages subfolder, custom domain, or preview)
  const base = process.env.BASE_URL || './';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          '404.html',
          'logo.svg',
          'favicon.ico',
          'icon-192.png',
          'icon-512.png',
          'icon-maskable-192.png',
          'icon-maskable-512.png',
          'screenshot-wide.png',
          'screenshot-mobile.png',
          'sw-push.js'
        ],
        manifest: {
          name: 'Spes Montesacro Gestionale',
          short_name: 'SpesApp',
          start_url: './index.html',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#01411C',
          icons: [
            {
              src: './icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: './icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: './icon-maskable-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: './icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: './screenshot-wide.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Schermata Desktop del Gestionale'
            },
            {
              src: './screenshot-mobile.png',
              sizes: '750x1334',
              type: 'image/png',
              label: 'Schermata Mobile del Gestionale'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          importScripts: ['./sw-push.js'],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
