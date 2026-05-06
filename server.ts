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

  // In-memory log penyimpanan sementara untuk webhook di mode lokal
  const webhookLogs: any[] = [];

  // Simulasi Endpoint Webhook
  app.post("/api/webhook", async (req, res) => {
    const signature = req.headers["x-webhook-signature"] || req.headers["stripe-signature"] || "none";
    const body = req.body;

    // Simpan ke log
    webhookLogs.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      method: "POST",
      path: "/api/webhook",
      payload: body,
      headers: req.headers
    });

    // Batasi log maksimal 50
    if (webhookLogs.length > 50) {
      webhookLogs.pop();
    }

    return res.status(200).json({
      status: "success",
      message: "Webhook payload received safely (Local Express)",
      signature_received: !!req.headers["x-webhook-signature"],
      received_payload: body,
    });
  });

  // Endpoint untuk mengambil log webhook dari client
  app.get("/api/webhook/logs", (req, res) => {
    return res.status(200).json(webhookLogs);
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
