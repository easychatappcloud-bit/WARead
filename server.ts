import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // === API ROUTES ===
  // These routes mimic what will be deployed to Cloudflare Pages.
  
  app.all("/api/hello", async (req, res) => {
    if (req.method === "POST") {
      return res.status(200).json({
        success: true,
        message: "Data received successfully via POST (Local Express)",
        receivedData: req.body,
      });
    }

    return res.status(200).json({
      message: "Hello from Local API Endpoint!",
      status: "Active",
      environment: "Local Express AI Studio",
      timestamp: new Date().toISOString()
    });
  });

  // ==================

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
