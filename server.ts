import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  
  // Latency test endpoint
  app.get("/api/ping", (req: Request, res: Response) => {
    console.log(`[Server] Ping request received from ${req.ip}`);
    res.status(204).send();
  });

  // Download test endpoint - streams random data
  app.get("/api/download", (req: Request, res: Response) => {
    const size = parseInt(req.query.size as string) || 20 * 1024 * 1024; // Default 20MB for faster start
    console.log(`[Server] Download started: ${size} bytes to ${req.ip}`);
    
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", size.toString());
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    
    let sent = 0;
    const chunkSize = 64 * 1024;
    
    const sendChunk = () => {
      if (sent >= size) {
        console.log(`[Server] Download complete for ${req.ip}`);
        res.end();
        return;
      }
      const remaining = size - sent;
      const currentChunkSize = Math.min(chunkSize, remaining);
      const chunk = crypto.randomBytes(currentChunkSize);
      sent += currentChunkSize;
      
      if (res.write(chunk)) {
        process.nextTick(sendChunk);
      } else {
        res.once("drain", sendChunk);
      }
    };
    
    sendChunk();
  });

  // Upload test endpoint - consumes data
  app.post("/api/upload", (req: Request, res: Response) => {
    console.log(`[Server] Upload chunk received from ${req.ip}`);
    req.on("data", () => {});
    req.on("end", () => {
      res.status(204).send();
    });
  });

  // ISP/Server Info Mock (In a real app, this would use GeoIP)
  app.get("/api/info", (req: Request, res: Response) => {
    res.json({
      isp: "Phantom Fiber Networks",
      server: "London, UK (Primary)",
      ip: req.ip || "127.0.0.1"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
