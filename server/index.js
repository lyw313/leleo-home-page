/**
 * leleo-home-page API
 * - Express + Cookie Session
 * - PostgreSQL via Prisma（优先）；连不上则降级 JSON 文件（server/data）
 *
 *   cd server && npm install && npm run dev
 */
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { createStore } from './lib/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 2;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0313';
const SESSION_SECRET = process.env.SESSION_SECRET || 'leleo-dev-secret-change-me';
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const store = await createStore();
await store.ensureAdmin(ADMIN_USERNAME, ADMIN_PASSWORD);

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 12 * 1024 * 1024 },
});

const app = express();
app.set('trust proxy', 1);
app.use(cookieParser());
app.use(express.json({ limit: '12mb' }));
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(session({
  name: 'leleo.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    // HTTP 部署时设 COOKIE_SECURE=0；有 HTTPS 再设 COOKIE_SECURE=1
    secure: process.env.COOKIE_SECURE === '1',
    maxAge: SESSION_HOURS * 60 * 60 * 1000,
  },
}));
app.use('/uploads', express.static(UPLOAD_DIR));

function requireAdmin(req, res, next) {
  if (req.session?.admin) return next();
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

app.get('/api/health', async (_req, res) => {
  res.json({
    ok: true,
    ts: Date.now(),
    store: store.kind,
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    ok: true,
    admin: !!req.session?.admin,
    username: req.session?.username || null,
    expiresAt: req.session?.cookie?.expires
      ? new Date(req.session.cookie.expires).getTime()
      : null,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username || ADMIN_USERNAME).trim();
  const password = String(req.body?.password || '');
  const ok = await store.verifyAdmin(username, password);
  if (!ok) {
    return res.status(401).json({ ok: false, error: 'invalid credentials' });
  }
  req.session.admin = true;
  req.session.username = username;
  res.json({
    ok: true,
    admin: true,
    username,
    expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('leleo.sid');
    res.json({ ok: true });
  });
});

// ---- Blog (兼容旧 PUT 整体覆盖 + REST) ----
app.get('/api/blog', async (_req, res) => {
  res.json(await store.getBlog());
});

app.put('/api/blog', requireAdmin, async (req, res) => {
  const data = await store.saveBlog({
    posts: Array.isArray(req.body?.posts) ? req.body.posts : [],
    folders: Array.isArray(req.body?.folders) ? req.body.folders : [],
  });
  res.json({ ok: true, savedAt: Date.now(), ...data });
});

// ---- Planner ----
app.get('/api/planner', async (_req, res) => {
  res.json(await store.getPlanner());
});

app.put('/api/planner', requireAdmin, async (req, res) => {
  const data = await store.savePlanner({
    topics: Array.isArray(req.body?.topics) ? req.body.topics : [],
    days: req.body?.days && typeof req.body.days === 'object' && !Array.isArray(req.body.days) ? req.body.days : {},
    tasks: Array.isArray(req.body?.tasks) ? req.body.tasks : [],
  });
  res.json({ ok: true, savedAt: Date.now(), ...data });
});

// ---- World / Profile ----
app.get('/api/world', async (_req, res) => {
  res.json(await store.getWorld());
});

app.put('/api/world', requireAdmin, async (req, res) => {
  const data = await store.saveWorld(req.body || {});
  res.json({ ok: true, savedAt: Date.now(), data });
});

app.get('/api/profile', async (_req, res) => {
  res.json(await store.getProfile());
});

app.put('/api/profile', requireAdmin, async (req, res) => {
  const data = await store.saveProfile(req.body || {});
  res.json({ ok: true, savedAt: Date.now(), data });
});

// ---- Reviews（访客可写，管理员可删）----
app.get('/api/reviews', async (_req, res) => {
  res.json(await store.getReviews());
});

app.post('/api/reviews', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const content = String(req.body?.content || '').trim();
  if (content.length < 2) {
    return res.status(400).json({ ok: false, error: 'content too short' });
  }
  const item = await store.addReview({
    name,
    content,
    rating: req.body?.rating,
  });
  res.json({ ok: true, item });
});

app.delete('/api/reviews/:id', requireAdmin, async (req, res) => {
  await store.deleteReview(req.params.id);
  res.json({ ok: true });
});

// ---- Upload ----
app.post('/api/uploads', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'no file' });
  const record = await store.saveUploadMeta({
    originalName: req.file.originalname,
    mime: req.file.mimetype,
    size: req.file.size,
    path: `/uploads/${req.file.filename}`,
  });
  res.json({ ok: true, file: record });
});

app.use((err, _req, res, _next) => {
  console.error('[leleo-server]', err);
  res.status(500).json({ ok: false, error: String(err.message || err) });
});

app.listen(PORT, () => {
  console.log(`[leleo-server] http://localhost:${PORT}`);
  console.log(`[leleo-server] store=${store.kind}`);
});
