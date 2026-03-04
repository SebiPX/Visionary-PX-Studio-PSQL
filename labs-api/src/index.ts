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
import models3dRoutes from './routes/models3d';
import voiceRoutes from './routes/voices';
import inventarItemRoutes       from './routes/inventar/items';
import inventarLoanRoutes        from './routes/inventar/loans';
import inventarVerleihRoutes     from './routes/inventar/verleihscheine';
import inventarLinkRoutes        from './routes/inventar/links';
import inventarLoginRoutes       from './routes/inventar/logins';
import inventarKreditRoutes      from './routes/inventar/kreditkarten';
import inventarHandyRoutes       from './routes/inventar/handyvertraege';
import inventarFirmaRoutes       from './routes/inventar/firmendaten';
import inventarDashboardRoutes   from './routes/inventar/dashboard-config';
import inventarProfileRoutes     from './routes/inventar/profiles';
import geminiRoutes from './routes/gemini';
import ragRoutes from './routes/rag';
import chatRoutes from './routes/chats';
import proxyRoutes from './routes/proxy';
import creativeAgentRoutes from './routes/creativeAgent';

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
app.use('/api/models3d', models3dRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/creative', creativeAgentRoutes);
// Inventar
app.use('/api/inventar/items',            inventarItemRoutes);
app.use('/api/inventar/loans',            inventarLoanRoutes);
app.use('/api/inventar/verleihscheine',   inventarVerleihRoutes);
app.use('/api/inventar/links',            inventarLinkRoutes);
app.use('/api/inventar/logins',           inventarLoginRoutes);
app.use('/api/inventar/kreditkarten',     inventarKreditRoutes);
app.use('/api/inventar/handyvertraege',   inventarHandyRoutes);
app.use('/api/inventar/firmendaten',      inventarFirmaRoutes);
app.use('/api/inventar/dashboard-config', inventarDashboardRoutes);
app.use('/api/inventar/profiles',         inventarProfileRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[labs-api] Running on port ${PORT}`);
  console.log(`[labs-api] DB: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@')}`);
});
