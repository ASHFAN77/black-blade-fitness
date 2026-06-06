import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true // Allows accessing the development server from mobile devices on the same network
  }
});
