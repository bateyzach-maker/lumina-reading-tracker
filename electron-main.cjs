const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');

// Disable hardware acceleration to prevent "black window" issues on some Windows systems
app.disableHardwareAcceleration();

let server;

function getClaudeApiKey() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.claudeApiKey || process.env.CLAUDE_API_KEY || '';
  } catch {
    return process.env.CLAUDE_API_KEY || '';
  }
}

async function claudeRequest(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const textBlock = data.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text block in Claude response');
  return JSON.parse(textBlock.text);
}

function startLocalServer() {
  const expressApp = express();
  const distPath = path.join(__dirname, 'dist');

  expressApp.use(express.json());

  expressApp.post('/api/recommendations', async (req, res) => {
    try {
      const apiKey = getClaudeApiKey();
      if (!apiKey) return res.status(200).json([]);

      const { likedBooks, dislikedBooks, likedAuthors, dislikedAuthors } = req.body;
      const likedBooksStr = likedBooks.map(b => `${b.title} by ${b.authorName}${b.rating ? ` (${b.rating}/5 stars)` : ''}`).join(', ');
      const dislikedBooksStr = dislikedBooks.map(b => `${b.title} by ${b.authorName}${b.rating ? ` (${b.rating}/5 stars)` : ''}`).join(', ');
      const likedAuthorsStr = likedAuthors.map(a => a.name).join(', ');
      const dislikedAuthorsStr = dislikedAuthors.map(a => a.name).join(', ');

      const systemPrompt = `You are a book recommendation expert. Respond with raw JSON only — no markdown fences, no explanation text, just a valid JSON array.`;

      const userPrompt = `
        I am a reader looking for new book recommendations.

        Books I've enjoyed: ${likedBooksStr || 'None listed yet'}
        Books I didn't like or got bored of: ${dislikedBooksStr || 'None listed yet'}
        Authors I strongly admire (Liked Authors): ${likedAuthorsStr || 'None listed yet'}
        Authors I don't like: ${dislikedAuthorsStr || 'None listed yet'}

        Based on my preferences, recommend 5 books I might enjoy.
        IMPORTANT: If I have liked authors, prioritize recommending other books by them that I haven't read, or books very similar in style to theirs.
        Explicitly mention in your reasoning if a book is recommended because it's by an author I like or similar to an author I like.

        Respond with a JSON array only. Each element must have: title (string), author (string), reason (string).
      `;

      const result = await claudeRequest(apiKey, systemPrompt, userPrompt);
      res.status(200).json(result);
    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.post('/api/check-releases', async (req, res) => {
    try {
      const apiKey = getClaudeApiKey();
      if (!apiKey) return res.status(200).json([]);

      const { authors, series } = req.body;
      const authorNames = authors.slice(0, 10).map(a => a.name).join(', ');
      const seriesNames = series.slice(0, 10).join(', ');

      const systemPrompt = `You are a knowledgeable literary assistant. Respond with raw JSON only — no markdown fences, no explanation text, just a valid JSON array.`;

      const userPrompt = `
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
      `;

      const result = await claudeRequest(apiKey, systemPrompt, userPrompt);
      res.status(200).json(result);
    } catch (error) {
      console.error('Check releases error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.use(express.static(distPath));

  // SPA fallback
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Use a stable port so users can whitelist it in Firebase
  const PORT = 3005;
  return new Promise((resolve, reject) => {
    server = expressApp.listen(PORT, '127.0.0.1', () => {
      console.log(`Production server running at http://localhost:${PORT}`);
      resolve(PORT);
    });
    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    try {
      const port = await startLocalServer();
      win.loadURL(`http://localhost:${port}`);
    } catch (err) {
      dialog.showErrorBox('Server Error', `Failed to start local production server: ${err.message}`);
    }
  }

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (!isDev) {
      dialog.showErrorBox('Page Load Failed', `Error ${errorCode}: ${errorDescription}`);
    }
  });

  win.webContents.on('render-process-gone', (event, details) => {
    dialog.showErrorBox('Process Crash', `The renderer process crashed: ${details.reason}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (server) {
    server.close();
  }
});
