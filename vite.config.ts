import { defineConfig, loadEnv, defaultClientConditions } from "vite"

import react from "@vitejs/plugin-react"

import tailwindcss from "@tailwindcss/vite"

import path from "node:path"

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""))

  return {
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      watch: { ignored: ["**/.cache/**"] },
    },

    plugins: [
      react(),
      tailwindcss(),
      {
        name: "london-tech-local-api",

        configureServer(server) {
          server.middlewares.use("/api", async (req, res) => {
            try {
              const { default: handler } = await import("./server/handler.js")

              req.url = "/api" + req.url

              await handler(req, res)
            } catch (error) {
              console.error("Local API could not complete the request.")

              if (!res.headersSent) {
                res.statusCode = 500
                res.end(
                  JSON.stringify({
                    error: "This request could not be completed.",
                  }),
                )
              }
            }
          })
        },
      },
    ],

    resolve: {
      // The image-search worker loads the pinned, same-origin WASM files.

      conditions: [
        "onnxruntime-web-use-extern-wasm",
        ...defaultClientConditions,
      ],

      alias: { "@": path.resolve(import.meta.dirname, "./src") },
    },
  }
})
