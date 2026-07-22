import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "start-proxy",

      configureServer(server) {
        const proxy = spawn("node", ["proxy/proxy.js"], {
          stdio: "inherit"
        });

        server.httpServer.on("close", () => {
          proxy.kill();
        });
      }
    }
  ],
})
