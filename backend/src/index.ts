import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import imageRoutes from './routes/images';
import videoRoutes from './routes/videos';
import thumbnailRoutes from './routes/thumbnails';
import sketchRoutes from './routes/sketches';
import textRoutes from './routes/texts';
import storyboardRoutes from './routes/storyboards';
import uploadRoutes from './routes/upload';
import geminiRoutes from './routes/gemini';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) or from allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/sketches', sketchRoutes);
app.use('/api/texts', textRoutes);
app.use('/api/storyboards', storyboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/gemini', geminiRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[labs-api] Running on port ${PORT}`);
  console.log(`[labs-api] DB: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@')}`);
});
