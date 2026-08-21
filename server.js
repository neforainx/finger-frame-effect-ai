import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files from the project root
app.use(express.static(__dirname));

// Config endpoint to expose GEMINI_API_KEY to client if provided via env
app.get("/api/config", (req, res) => {
  res.json({
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
  });
});

// Fallback to index.html for SPA/HTML serving
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Finger Frame AI server running on http://0.0.0.0:${PORT}`);
});
