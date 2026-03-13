import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const featureChunkGroups: Record<string, string> = {
  'src/ui/scene/': 'ui-scene',
  'src/core/events/': 'core-events',
  'src/sandbox/': 'sandbox'
};

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }

            return 'vendor';
          }

          for (const [featurePath, chunkName] of Object.entries(featureChunkGroups)) {
            if (id.includes(featurePath)) {
              return chunkName;
            }
          }
        }
      }
    }
  }
});
