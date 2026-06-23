import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Lazy initialize Gemini API Client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // Real translation API endpoint using Gemini API
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, sourceLang, targetLang } = req.body;

      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Text to translate is required and must be a string." });
        return;
      }

      if (!targetLang || typeof targetLang !== "string") {
        res.status(400).json({ error: "Target language is required." });
        return;
      }

      const client = getGeminiClient();
      const sourceIndicator = sourceLang && sourceLang !== "auto" ? `from the language '${sourceLang}'` : "by auto-detecting the source language";

      const prompt = `You are a professional translator. Translate the text below ${sourceIndicator} into '${targetLang}'.
Provide ONLY the translated text as the output. Do not include any meta-explanations, prefaces, warning tags, or quotes. Keep all original formatting and spacing if possible.

Text to translate:
"""
${text}
"""`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const translatedText = response.text || "";
      res.json({ translatedText: translatedText.trim() });
    } catch (error: any) {
      console.error("Translation API error:", error);
      res.status(500).json({ error: error?.message || "An error occurred during translation." });
    }
  });

  // Integration of Vite Dev Server / Static Files
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server in development mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production build from /dist");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
