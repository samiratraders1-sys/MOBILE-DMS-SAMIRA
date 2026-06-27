var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var aiClient = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
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
        contents: prompt
      });
      const qty = parseInt(response.text || "0");
      res.json({ suggestedQuantity: isNaN(qty) ? 0 : qty });
    } catch (error) {
      console.error("Forecast AI Error:", error);
      res.status(500).json({ error: "AI forecasting failed" });
    }
  });
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
\u09E7. \u09B8\u09BE\u09B0\u09CD\u09AC\u09BF\u0995 \u09AC\u09CD\u09AF\u09AC\u09B8\u09BE \u09AE\u09C2\u09B2\u09CD\u09AF\u09BE\u09AF\u09BC\u09A8 (Core business evaluation)
\u09E8. \u09B8\u09C7\u09B2\u09B8 \u0993 \u09B0\u09C1\u099F \u09AA\u09BE\u09B0\u09AB\u09B0\u09AE\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8 (Route sales evaluation & practical improvements)
\u09E9. \u0987\u09A8\u09AD\u09C7\u09A8\u09CD\u099F\u09B0\u09BF \u0993 \u09AA\u09CD\u09B0\u09CB\u09A1\u09BE\u0995\u09CD\u099F \u09AE\u09C1\u09AD\u09AE\u09C7\u09A8\u09CD\u099F (Stock rotation & management advice)
\u09EA. \u09A1\u09BF\u098F\u09B8\u0986\u09B0 \u098F\u09AC\u0982 \u098F\u09B8\u0986\u09B0\u09A6\u09C7\u09B0 \u09A6\u0995\u09CD\u09B7\u09A4\u09BE \u09AC\u09C3\u09A6\u09CD\u09A7\u09BF (Empowering SRs and DSRs to boost conversion)

Ensure the language is encouraging, professional, and directly actionable. Direct the user as "\u0986\u09AA\u09A8\u09BF". Have no technical programming jargon, talk like a warm expert business friend who understands local Bangladeshi distribution business challenges.`;
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json({ insight: response.text || "\u09A6\u09C1\u0983\u0996\u09BF\u09A4, \u098F\u0987 \u09AE\u09C1\u09B9\u09C2\u09B0\u09CD\u09A4\u09C7 \u09AA\u09B0\u09BE\u09AE\u09B0\u09CD\u09B6 \u099C\u09C7\u09A8\u09BE\u09B0\u09C7\u099F \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AD\u09AC \u09B9\u09DF\u09A8\u09BF\u0964" });
    } catch (error) {
      console.error("AI Insights Error:", error);
      res.status(500).json({ error: "AI insights generation failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const importDynamic = new Function("specifier", "return import(specifier)");
    const { createServer: createViteServer } = await importDynamic("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
