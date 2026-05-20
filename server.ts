import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Claude Initialization
let anthropicInstance: Anthropic | null = null;
function getAnthropic() {
  if (!anthropicInstance) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error("CLAUDE_API_KEY is not defined in environment variables.");
    }
    anthropicInstance = new Anthropic({ apiKey });
  }
  return anthropicInstance;
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
      const client = getAnthropic();

      const likedBooksStr = likedBooks.map((b: any) => `${b.title} by ${b.authorName}`).join(', ');
      const dislikedBooksStr = dislikedBooks.map((b: any) => `${b.title} by ${b.authorName}`).join(', ');
      const likedAuthorsStr = likedAuthors.map((a: any) => a.name).join(', ');
      const dislikedAuthorsStr = dislikedAuthors.map((a: any) => a.name).join(', ');

      const message = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 8192,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: "You are a book recommendation expert. Respond with raw JSON only — no markdown fences, no explanation text, just a valid JSON array.",
        messages: [{
          role: "user",
          content: `
            I am a reader looking for new book recommendations.

            Books I've enjoyed: ${likedBooksStr || 'None listed yet'}
            Books I didn't like or got bored of: ${dislikedBooksStr || 'None listed yet'}
            Authors I strongly admire (Liked Authors): ${likedAuthorsStr || 'None listed yet'}
            Authors I don't like: ${dislikedAuthorsStr || 'None listed yet'}

            Based on my preferences, recommend 5 books I might enjoy.
            IMPORTANT: If I have liked authors, prioritize recommending other books by them that I haven't read, or books very similar in style to theirs.
            Explicitly mention in your reasoning if a book is recommended because it's by an author I like or similar to an author I like.

            Respond with a JSON array only. Each element must have: title (string), author (string), reason (string).
          `
        }]
      } as any);

      const textBlock = message.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined;
      if (!textBlock) throw new Error("No text block in Claude response");

      res.status(200).json(JSON.parse(textBlock.text));
    } catch (error: any) {
      console.error("Claude API Route Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/check-releases", async (req, res) => {
    try {
      const { authors, series } = req.body;
      const client = getAnthropic();

      const authorNames = authors.slice(0, 10).map((a: any) => a.name).join(", ");
      const seriesNames = series.slice(0, 10).join(", ");

      const message = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 8192,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: "You are a knowledgeable literary assistant. Respond with raw JSON only — no markdown fences, no explanation text, just a valid JSON array.",
        messages: [{
          role: "user",
          content: `
            Current date: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.

            Identify any upcoming or recently released books for these authors and series, using your knowledge.

            Authors: ${authorNames}
            Series: ${seriesNames}

            Return a JSON array of release notifications. Each element must have:
            - id (string): a unique identifier (e.g. "release-1")
            - message (string): formatted as "A new work titled '[Book Title]' from [Author] is materializing soon (Release: [Date])."
            - date (string): the release date or approximate timeframe
            - type (string): either "release" or "milestone"

            If no specific new releases are known, suggest books often associated with these authors/series that might be hidden gems. Do not fabricate release dates — use "TBD" if unknown.
          `
        }]
      } as any);

      const textBlock = message.content.find(b => b.type === "text") as Anthropic.TextBlock | undefined;
      if (!textBlock) throw new Error("No text block in Claude response");

      res.status(200).json(JSON.parse(textBlock.text));
    } catch (error: any) {
      console.error("Claude API Route Error:", error);
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
