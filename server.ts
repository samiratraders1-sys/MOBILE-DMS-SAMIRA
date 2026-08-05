import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

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

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.post("/api/log-error", (req, res) => {
    console.error("=== CLIENT-SIDE RUNTIME ERROR ===");
    console.error(JSON.stringify(req.body, null, 2));
    console.error("=================================");
    try {
      const logLine = `[${new Date().toISOString()}] ${JSON.stringify(req.body, null, 2)}\n\n`;
      fs.appendFileSync(path.join(process.cwd(), "client_errors.log"), logLine);
    } catch (err) {
      console.error("Failed to write client_errors.log:", err);
    }
    res.json({ ok: true });
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

  // AI OCR Document processing (Invoice / Challan)
  app.post("/api/ai/ocr", async (req, res) => {
    try {
      const { image, mimeType = "image/jpeg" } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Remove header if present (e.g. data:image/jpeg;base64,)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `You are a professional DMS OCR document processor. Extract details from this Bangladeshi FMCG/distribution physical sales invoice or supplier delivery challan. 
      Analyze the text on the document. Extract the following fields as JSON:
      {
        "invoiceNumber": "string or empty",
        "date": "YYYY-MM-DD or empty",
        "partyName": "string or empty",
        "items": [
          {
            "productName": "string",
            "quantity": number,
            "rate": number,
            "total": number
          }
        ],
        "grandTotal": number,
        "documentType": "invoice" | "challan" | "unknown"
      }
      Provide ONLY the raw JSON block. No markdown, no triple backticks, and no conversation.`;

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              }
            },
            {
              text: prompt
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
        }
      });

      let jsonText = response.text || "{}";
      // Clean up markdown block code formatting if returned
      jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedData = JSON.parse(jsonText);
      res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error("OCR AI Error:", error);
      res.status(500).json({ error: "OCR processing failed", details: error.message });
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
