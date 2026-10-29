import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return structuredClone(fallback);
  }
}

function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

const EMPTY_BLOG = { posts: [], folders: [] };
const EMPTY_PLANNER = { topics: [], days: {}, tasks: [] };

export async function createStore() {
  const forceJson = process.env.FORCE_JSON_STORE === '1' || !process.env.DATABASE_URL;
  if (!forceJson) {
    try {
      const pg = await createPrismaStore();
      await pg.ping();
      console.log('[store] using PostgreSQL (Prisma)');
      return pg;
    } catch (err) {
      console.warn('[store] PostgreSQL unavailable, fallback to JSON:', err.message);
    }
  } else {
    console.log('[store] FORCE_JSON_STORE / no DATABASE_URL → JSON files');
  }
  return createJsonStore();
}

async function createPrismaStore() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  return {
    kind: 'postgres',
    async ping() {
      await prisma.$queryRaw`SELECT 1`;
    },
    async ensureAdmin(username, password) {
      const existing = await prisma.adminUser.findUnique({ where: { username } });
      if (existing) return;
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.adminUser.create({ data: { username, passwordHash } });
    },
    async verifyAdmin(username, password) {
      const user = await prisma.adminUser.findUnique({ where: { username } });
      if (!user) return false;
      return bcrypt.compare(password, user.passwordHash);
    },
    async getBlog() {
      const [folders, posts] = await Promise.all([
        prisma.blogFolder.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.blogPost.findMany({ orderBy: { updatedAt: 'desc' } }),
      ]);
      return {
        folders: folders.map((f) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          createdAt: f.createdAt.getTime(),
        })),
        posts: posts.map((p) => ({
          id: p.id,
          title: p.title,
          summary: p.summary,
          content: p.content,
          tags: p.tags,
          projectUrl: p.projectUrl,
          kind: p.kind,
          folderId: p.folderId,
          createdAt: p.createdAt.getTime(),
          updatedAt: p.updatedAt.getTime(),
        })),
      };
    },
    async saveBlog({ posts = [], folders = [] }) {
      await prisma.$transaction(async (tx) => {
        await tx.blogPost.deleteMany();
        await tx.blogFolder.deleteMany();
        // 先插无父级依赖的文件夹：多轮插入
        const remaining = [...folders];
        const placed = new Set();
        let guard = remaining.length + 5;
        while (remaining.length && guard-- > 0) {
          const next = [];
          for (const f of remaining) {
            const parentOk = !f.parentId || placed.has(f.parentId);
            if (!parentOk) {
              next.push(f);
              continue;
            }
            await tx.blogFolder.create({
              data: {
                id: String(f.id),
                name: String(f.name || '未命名').slice(0, 40),
                parentId: f.parentId || null,
                createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
              },
            });
            placed.add(f.id);
          }
          if (next.length === remaining.length) {
            // 断开环：强制无 parent
            for (const f of next) {
              await tx.blogFolder.create({
                data: {
                  id: String(f.id),
                  name: String(f.name || '未命名').slice(0, 40),
                  parentId: null,
                  createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
                },
              });
              placed.add(f.id);
            }
            break;
          }
          remaining.splice(0, remaining.length, ...next);
        }
        for (const p of posts) {
          if (!p?.id || !p.folderId || !placed.has(p.folderId)) continue;
          await tx.blogPost.create({
            data: {
              id: String(p.id),
              title: String(p.title || '未命名').slice(0, 120),
              summary: String(p.summary || '').slice(0, 200),
              content: String(p.content || ''),
              tags: Array.isArray(p.tags) ? p.tags : [],
              projectUrl: String(p.projectUrl || ''),
              kind: p.kind === 'project' ? 'project' : 'note',
              folderId: String(p.folderId),
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            },
          });
        }
      });
      return this.getBlog();
    },
    async getPlanner() {
      const [topics, days] = await Promise.all([
        prisma.plannerTopic.findMany({ orderBy: { createdAt: 'asc' } }),
        prisma.plannerDay.findMany(),
      ]);
      const dayMap = {};
      days.forEach((d) => {
        dayMap[d.dateKey] = {
          topicIds: d.topicIds,
          plan: d.plan,
          diary: d.diary,
          updatedAt: d.updatedAt.getTime(),
        };
      });
      return {
        topics: topics.map((t) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          startDate: t.startDate,
          endDate: t.endDate,
        })),
        days: dayMap,
        tasks: [],
      };
    },
    async savePlanner({ topics = [], days = {} }) {
      await prisma.$transaction(async (tx) => {
        await tx.plannerDay.deleteMany();
        await tx.plannerTopic.deleteMany();
        for (const t of topics) {
          await tx.plannerTopic.create({
            data: {
              id: String(t.id),
              name: String(t.name || '').slice(0, 24),
              color: String(t.color || '#5ec8ff'),
              startDate: String(t.startDate || ''),
              endDate: String(t.endDate || ''),
            },
          });
        }
        for (const [dateKey, entry] of Object.entries(days || {})) {
          await tx.plannerDay.create({
            data: {
              dateKey,
              topicIds: Array.isArray(entry?.topicIds) ? entry.topicIds : [],
              plan: String(entry?.plan || ''),
              diary: String(entry?.diary || ''),
              updatedAt: entry?.updatedAt ? new Date(entry.updatedAt) : new Date(),
            },
          });
        }
      });
      return this.getPlanner();
    },
    async getWorld() {
      const rows = await prisma.worldModule.findMany({ orderBy: { sortOrder: 'asc' } });
      return { modules: rows };
    },
    async saveWorld(body) {
      const modules = Array.isArray(body?.modules) ? body.modules : [];
      await prisma.$transaction(async (tx) => {
        await tx.worldModule.deleteMany();
        for (let i = 0; i < modules.length; i += 1) {
          const m = modules[i];
          await tx.worldModule.create({
            data: {
              id: String(m.id || `w-${i}`),
              moduleKey: String(m.moduleKey || m.key || 'life'),
              title: String(m.title || ''),
              content: String(m.content || ''),
              media: m.media || {},
              sortOrder: Number(m.sortOrder) || i,
            },
          });
        }
      });
      return this.getWorld();
    },
    async getProfile() {
      const row = await prisma.profileState.findUnique({ where: { id: 'default' } });
      return row?.data || {};
    },
    async saveProfile(data) {
      await prisma.profileState.upsert({
        where: { id: 'default' },
        create: { id: 'default', data },
        update: { data },
      });
      return data;
    },
    async saveUploadMeta(meta) {
      return prisma.upload.create({ data: meta });
    },
    async getReviews() {
      const rows = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          content: r.content,
          rating: r.rating,
          createdAt: r.createdAt.getTime(),
        })),
      };
    },
    async addReview({ name, content, rating }) {
      const row = await prisma.review.create({
        data: {
          name: String(name || '匿名').trim().slice(0, 24) || '匿名',
          content: String(content || '').trim().slice(0, 200),
          rating: Math.max(1, Math.min(5, Number(rating) || 5)),
        },
      });
      return {
        id: row.id,
        name: row.name,
        content: row.content,
        rating: row.rating,
        createdAt: row.createdAt.getTime(),
      };
    },
    async deleteReview(id) {
      await prisma.review.delete({ where: { id: String(id) } });
      return { ok: true };
    },
  };
}

function createJsonStore() {
  const BLOG = path.join(DATA_DIR, 'blog.json');
  const PLANNER = path.join(DATA_DIR, 'planner.json');
  const WORLD = path.join(DATA_DIR, 'world.json');
  const PROFILE = path.join(DATA_DIR, 'profile.json');
  const ADMIN = path.join(DATA_DIR, 'admin.json');
  const UPLOADS = path.join(DATA_DIR, 'uploads.json');
  const REVIEWS = path.join(DATA_DIR, 'reviews.json');

  return {
    kind: 'json',
    async ensureAdmin(username, password) {
      const cur = readJson(ADMIN, null);
      if (cur?.passwordHash) return;
      writeJson(ADMIN, {
        username,
        passwordHash: await bcrypt.hash(password, 10),
      });
    },
    async verifyAdmin(username, password) {
      const cur = readJson(ADMIN, null);
      if (!cur?.passwordHash) return password === (process.env.ADMIN_PASSWORD || '0313');
      if (cur.username && cur.username !== username) return false;
      return bcrypt.compare(password, cur.passwordHash);
    },
    async getBlog() {
      return readJson(BLOG, EMPTY_BLOG);
    },
    async saveBlog(data) {
      writeJson(BLOG, data);
      return data;
    },
    async getPlanner() {
      return readJson(PLANNER, EMPTY_PLANNER);
    },
    async savePlanner(data) {
      writeJson(PLANNER, data);
      return data;
    },
    async getWorld() {
      return readJson(WORLD, { modules: [] });
    },
    async saveWorld(data) {
      writeJson(WORLD, data);
      return data;
    },
    async getProfile() {
      return readJson(PROFILE, {});
    },
    async saveProfile(data) {
      writeJson(PROFILE, data);
      return data;
    },
    async saveUploadMeta(meta) {
      const list = readJson(UPLOADS, []);
      const row = { id: `u-${Date.now()}`, ...meta, createdAt: Date.now() };
      list.push(row);
      writeJson(UPLOADS, list);
      return row;
    },
    async getReviews() {
      const items = readJson(REVIEWS, []);
      return { items: Array.isArray(items) ? items.slice(0, 100) : [] };
    },
    async addReview({ name, content, rating }) {
      const items = readJson(REVIEWS, []);
      const row = {
        id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: String(name || '匿名').trim().slice(0, 24) || '匿名',
        content: String(content || '').trim().slice(0, 200),
        rating: Math.max(1, Math.min(5, Number(rating) || 5)),
        createdAt: Date.now(),
      };
      items.unshift(row);
      writeJson(REVIEWS, items.slice(0, 200));
      return row;
    },
    async deleteReview(id) {
      const items = readJson(REVIEWS, []);
      writeJson(REVIEWS, items.filter((r) => r.id !== String(id)));
      return { ok: true };
    },
  };
}
