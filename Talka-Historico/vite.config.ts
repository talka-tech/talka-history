import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 300000, // 5 minutos de timeout
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxying request:', {
              method: req.method,
              url: req.url,
              headers: req.headers
            });
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📡 Proxy response:', {
              statusCode: proxyRes.statusCode,
              statusMessage: proxyRes.statusMessage,
              headers: proxyRes.headers
            });
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('❌ Proxy error:', err);
          });
        }
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
