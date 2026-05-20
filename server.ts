import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gemini Initialization
let genAIInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAIInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    genAIInstance = new GoogleGenAI({ apiKey });
  }
  return genAIInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  app.post("/api/recommendations", async (req, res) => {
    try {
      const { likedBooks, dislikedBooks, likedAuthors, dislikedAuthors } = req.body;
      const genAI = getGenAI();
      const model = "gemini-3-flash-preview";
      
      const likedBooksStr = likedBooks.map((b: any) => `${b.title} by ${b.authorName}`).join(', ');
      const dislikedBooksStr = dislikedBooks.map((b: any) => `${b.title} by ${b.authorName}`).join(', ');
      const likedAuthorsStr = likedAuthors.map((a: any) => a.name).join(', ');
      const dislikedAuthorsStr = dislikedAuthors.map((a: any) => a.name).join(', ');

      const prompt = `
        I am a reader looking for new book recommendations.
        
        Books I've enjoyed: ${likedBooksStr || 'None listed yet'}
        Books I didn't like or got bored of: ${dislikedBooksStr || 'None listed yet'}
        Authors I strongly admire (Liked Authors): ${likedAuthorsStr || 'None listed yet'}
        Authors I don't like: ${dislikedAuthorsStr || 'None listed yet'}
        
        Based on my preferences, please recommend 5 books I might enjoy. 
        IMPORTANT: If I have liked authors, please prioritize recommending other books by them that I haven't read, or books that are very similar in style to theirs.
        
        In your reasoning, explicitly mention if a book is recommended because it's by an author I like or similar to an author I like.
        
        Explain why you are recommending each one based on my specific tastes.
      `;

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["title", "author", "reason"]
            }
          }
        }
      });

      res.status(200).json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("Gemini API Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/check-releases", async (req, res) => {
    try {
      const { authors, series } = req.body;
      const genAI = getGenAI();
      const model = "gemini-3-flash-preview";
      
      const authorNames = authors.slice(0, 10).map((a: any) => a.name).join(", ");
      const seriesNames = series.slice(0, 10).join(", ");

      const prompt = `
        Current date: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
        
        Please search for and identify any REAL upcoming or recently released book releases for the following authors and book series.
        
        Authors: ${authorNames}
        Series: ${seriesNames}
        
        Return a list of discovered releases with the message: "A new work titled '[Book Title]' from [Author] is materializing soon (Release: [Date])."
        
        If no specific new releases are found, do not hallucinate; instead, suggest a book that is often associated with these authors/series that might be a "hidden gem" recently discussed in literary circles.
      `;

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                message: { type: Type.STRING },
                date: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["release", "milestone"] }
              },
              required: ["id", "message", "date", "type"]
            }
          }
        }
      });

      res.status(200).json(JSON.parse(response.text));
    } catch (error: any) {
      console.error("Gemini Releases Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  console.log(`Server environment: ${process.env.NODE_ENV}`);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(__dirname, "dist");
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
