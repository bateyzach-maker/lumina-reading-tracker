const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const express = require('express');
const fs = require('fs');

// Disable hardware acceleration to prevent "black window" issues on some Windows systems
app.disableHardwareAcceleration();

let server;

function getGeminiApiKey() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.geminiApiKey || process.env.GEMINI_API_KEY || '';
  } catch {
    return process.env.GEMINI_API_KEY || '';
  }
}

async function geminiRequest(apiKey, model, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

function startLocalServer() {
  const expressApp = express();
  const distPath = path.join(__dirname, 'dist');

  expressApp.use(express.json());

  expressApp.post('/api/recommendations', async (req, res) => {
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) return res.status(200).json([]);

      const { likedBooks, dislikedBooks, likedAuthors, dislikedAuthors } = req.body;
      const likedBooksStr = likedBooks.map(b => `${b.title} by ${b.authorName}`).join(', ');
      const dislikedBooksStr = dislikedBooks.map(b => `${b.title} by ${b.authorName}`).join(', ');
      const likedAuthorsStr = likedAuthors.map(a => a.name).join(', ');
      const dislikedAuthorsStr = dislikedAuthors.map(a => a.name).join(', ');

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

      const result = await geminiRequest(apiKey, 'gemini-3-flash-preview', {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                author: { type: 'STRING' },
                reason: { type: 'STRING' },
              },
              required: ['title', 'author', 'reason'],
            },
          },
        },
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  expressApp.post('/api/check-releases', async (req, res) => {
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) return res.status(200).json([]);

      const { authors, series } = req.body;
      const authorNames = authors.slice(0, 10).map(a => a.name).join(', ');
      const seriesNames = series.slice(0, 10).join(', ');

      const prompt = `
        Current date: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.

        Please search for and identify any REAL upcoming or recently released book releases for the following authors and book series.

        Authors: ${authorNames}
        Series: ${seriesNames}

        Return a list of discovered releases with the message: "A new work titled '[Book Title]' from [Author] is materializing soon (Release: [Date])."

        If no specific new releases are found, do not hallucinate; instead, suggest a book that is often associated with these authors/series that might be a "hidden gem" recently discussed in literary circles.
      `;

      const result = await geminiRequest(apiKey, 'gemini-3-flash-preview', {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                message: { type: 'STRING' },
                date: { type: 'STRING' },
                type: { type: 'STRING', enum: ['release', 'milestone'] },
              },
              required: ['id', 'message', 'date', 'type'],
            },
          },
        },
      });

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
