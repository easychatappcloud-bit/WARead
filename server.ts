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
  let GOOGLE_SHEETS_URL = "";

  app.post("/api/settings/google-sheets", (req, res) => {
    GOOGLE_SHEETS_URL = req.body.url;
    res.json({ success: true });
  });

  app.get("/api/settings/google-sheets", (req, res) => {
    res.json({ url: GOOGLE_SHEETS_URL });
  });

  app.post("/api/send-message", async (req, res) => {
    try {
      const { to, text } = req.body;
      const response = await fetch('https://n8n-wexrffsqeapb.sate.sumopod.my.id/webhook-test/terima-pengiriman-pesan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, text })
      });
      if (response.ok) {
        res.json({ success: true });
      } else {
        res.status(response.status).json({ error: "Failed to send to n8n" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Simulasi Endpoint Webhook
  app.post("/api/webhook", async (req, res) => {
    const signature = req.headers["x-webhook-signature"] || req.headers["stripe-signature"] || "none";
    const body = req.body;

    // Simpan ke log lokal memory
    webhookLogs.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      method: "POST",
      path: "/api/webhook",
      payload: body,
      headers: req.headers
    });

    if (webhookLogs.length > 50) {
      webhookLogs.pop();
    }

    let sheetStatus = "Local memory log only";

    if (GOOGLE_SHEETS_URL) {
       try {
         await fetch(GOOGLE_SHEETS_URL, {
            method: "POST",
            body: JSON.stringify({
              method: "POST",
              path: "/api/webhook",
              payload: body
            })
         });
         sheetStatus = "Data forwarded to Google Sheets";
       } catch (e: any) {
         sheetStatus = "Failed saving to Google Sheets: " + e.message;
       }
    }

    return res.status(200).json({
      status: "success",
      message: "Webhook payload received safely (Local Express)",
      signature_received: !!req.headers["x-webhook-signature"],
      received_payload: body,
      sheet_status: sheetStatus
    });
  });

  // Endpoint untuk mengambil log webhook dari client
  app.get("/api/webhook/logs", async (req, res) => {
    if (GOOGLE_SHEETS_URL) {
      try {
        const resp = await fetch(GOOGLE_SHEETS_URL, { redirect: 'follow' });
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          return res.status(200).json(data);
        } catch (e: any) {
          return res.status(200).json([{
            id: "error",
            timestamp: new Date().toISOString(),
            method: "ERROR",
            payload: { notice: "Google Sheets membalas dengan format HTML (bukan JSON). Ini biasanya terjadi jika di Apps Script 'Who has access' BUKAN 'Anyone' (masih private/butuh login), atau URL salah. Response: " + text.substring(0, 150) + "..." }
          }]);
        }
      } catch(e) {
        // Fallback or ignore
      }
    }
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
