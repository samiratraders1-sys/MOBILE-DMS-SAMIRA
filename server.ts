import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Forecasting endpoint
  app.post("/api/forecast", async (req, res) => {
    try {
      const { product, summaries } = req.body;
      const prompt = `Analyze this product sales history and suggest an optimal reorder quantity.
      Product: ${JSON.stringify(product)}
      Sales History: ${JSON.stringify(summaries)}
      Return only the suggested quantity as a simple number.`;
      
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const qty = parseInt(response.text || "0");
      res.json({ suggestedQuantity: isNaN(qty) ? 0 : qty });
    } catch (error) {
      console.error("Forecast AI Error:", error);
      res.status(500).json({ error: "AI forecasting failed" });
    }
  });

  // AI Business Insights / Advice endpoint
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { data } = req.body;
      const { products = [], summaries = [] } = data || {};

      const prompt = `You are an expert distribution business consultant specializing in the Bangladeshi FMCG / distribution sector (specifically local distributor houses, with SRs, DSRs, Routes, and retail shop customers). 
Analyze the following high-level stats of "Samira Traders" and provide a highly useful diagnostic report, advisory feedback, and action plans in elegant, professional, clear, and encouraging Bengali.

Data details:
- Number of products in inventory: ${products.length}
- Number of completed/open route settlement summaries: ${summaries.length}
- Sample Products (up to 5): ${JSON.stringify(products.slice(0, 5))}
- Sample Settlements (up to 5): ${JSON.stringify(summaries.slice(0, 5))}

Provide your output under these distinct headings using neat paragraph blocks:
১. সার্বিক ব্যবসা মূল্যায়ন (Core business evaluation)
২. সেলস ও রুট পারফরম্যান্স (Route sales evaluation & practical improvements)
৩. ইনভেন্টরি ও প্রোডাক্ট মুভমেন্ট (Stock rotation & management advice)
৪. ডিএসআর এবং এসআরদের দক্ষতা বৃদ্ধি (Empowering SRs and DSRs to boost conversion)

Ensure the language is encouraging, professional, and directly actionable. Direct the user as "আপনি". Have no technical programming jargon, talk like a warm expert business friend who understands local Bangladeshi distribution business challenges.`;

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ insight: response.text || "দুঃখিত, এই মুহূর্তে পরামর্শ জেনারেট করা সম্ভব হয়নি।" });
    } catch (error: any) {
      console.error("AI Insights Error:", error);
      res.status(500).json({ error: "AI insights generation failed" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const importDynamic = new Function("specifier", "return import(specifier)");
    const { createServer: createViteServer } = await importDynamic("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
