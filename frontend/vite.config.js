import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "";

  let apiOriginRegex = /^$/;
  if (apiUrl.startsWith("http")) {
    try {
      const origin = new URL(apiUrl).origin;
      apiOriginRegex = new RegExp(
        `^${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/`,
      );
    } catch {
      apiOriginRegex = /^$/;
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["logo.svg"],
        manifest: {
          name: "Benny's Centro Automotivo",
          short_name: "Benny's",
          description: "Gestao completa do centro automotivo Benny's Motorsport.",
          theme_color: "#1e40af",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            {
              src: "/logo.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "/logo.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/index.html",
          // Nunca servir respostas antigas da API pelo SW (ex.: lista com limit=20)
          runtimeCaching: [
            ...(apiUrl.startsWith("http")
              ? [
                  {
                    urlPattern: apiOriginRegex,
                    handler: "NetworkOnly",
                  },
                ]
              : []),
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api"),
              handler: "NetworkOnly",
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    server: {
      port: 5177,
      proxy: {
        "/api": {
          target: env.VITE_DEV_PROXY_TARGET || "http://localhost:3011",
          changeOrigin: true,
        },
      },
    },
  };
});
