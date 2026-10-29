/**
 * 后端同步层：博客 / 计划本等。
 * PostgreSQL 为跨设备权威源；localStorage 作缓存。
 * 写接口需登录 Cookie（credentials: 'include'）。
 */

const API_BASE = '/api';

async function fetchJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function serverAvailable() {
  return fetchJson(`${API_BASE}/health`, {}, 3000)
    .then((d) => !!d?.ok)
    .catch(() => false);
}

/** 拉取服务端数据并与本地合并。kind: 'blog' | 'planner' | 'world' | 'profile' */
export async function pullFromServer(kind, localState, mergeFn) {
  try {
    const remote = await fetchJson(`${API_BASE}/${kind}`);
    if (!remote || typeof remote !== 'object') return localState;
    return mergeFn ? mergeFn(localState, remote) : remote;
  } catch (_) {
    return localState;
  }
}

/**
 * 推送整体状态到服务端（需已登录 Cookie）
 * @returns {Promise<object|null>}
 */
export async function pushToServer(kind, state) {
  try {
    return await fetchJson(`${API_BASE}/${kind}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch (err) {
    console.warn(`[sync] push ${kind} failed:`, err?.message || err);
    window.dispatchEvent(new CustomEvent('leleo-sync-error', {
      detail: { kind, status: err?.status, message: err?.message },
    }));
    return null;
  }
}

function readLocalBlog() {
  let posts = [];
  let folders = [];
  try {
    posts = JSON.parse(localStorage.getItem('leleo-blog-posts-v3') || '[]');
  } catch (_) {}
  try {
    folders = JSON.parse(localStorage.getItem('leleo-blog-folders-v1') || '[]');
  } catch (_) {}
  return { posts: Array.isArray(posts) ? posts : [], folders: Array.isArray(folders) ? folders : [] };
}

function readLocalPlanner() {
  try {
    const raw = localStorage.getItem('leleo-planner-v1');
    if (!raw) return { topics: [], days: {}, tasks: [] };
    const parsed = JSON.parse(raw);
    return {
      topics: Array.isArray(parsed?.topics) ? parsed.topics : [],
      days: parsed?.days && typeof parsed.days === 'object' ? parsed.days : {},
      tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
    };
  } catch (_) {
    return { topics: [], days: {}, tasks: [] };
  }
}

/**
 * 登录成功后调用：把浏览器里的博客/计划本写入 PostgreSQL。
 * 若本地几乎为空而服务器已有数据，先拉服务器，避免空数据覆盖库。
 */
export async function syncLocalToServer() {
  const blog = readLocalBlog();
  const planner = readLocalPlanner();
  const results = { blog: null, planner: null };

  try {
    const remoteBlog = await fetchJson(`${API_BASE}/blog`);
    const remoteCount = (remoteBlog?.posts || []).length;
    const localCount = blog.posts.length;
    if (remoteCount > 0 && localCount === 0) {
      // 换设备登录：本地没有帖，不要用空数据覆盖 PG
      try {
        localStorage.setItem('leleo-blog-posts-v3', JSON.stringify(remoteBlog.posts || []));
        localStorage.setItem('leleo-blog-folders-v1', JSON.stringify(remoteBlog.folders || []));
      } catch (_) {}
      window.dispatchEvent(new Event('leleo-blog-updated'));
      results.blog = { ok: true, adoptedRemote: true, count: remoteCount };
    } else if (localCount || blog.folders.length) {
      results.blog = await pushToServer('blog', blog);
    }
  } catch (e) {
    if (blog.posts.length || blog.folders.length) {
      results.blog = await pushToServer('blog', blog);
    }
  }

  try {
    const remotePlanner = await fetchJson(`${API_BASE}/planner`);
    const remoteDays = Object.keys(remotePlanner?.days || {}).length;
    const localDays = Object.keys(planner.days || {}).length;
    if (remoteDays > 0 && localDays === 0 && !(planner.topics || []).length) {
      try {
        localStorage.setItem('leleo-planner-v1', JSON.stringify(remotePlanner));
      } catch (_) {}
      window.dispatchEvent(new Event('leleo-planner-updated'));
      results.planner = { ok: true, adoptedRemote: true, days: remoteDays };
    } else if ((planner.topics || []).length || localDays) {
      results.planner = await pushToServer('planner', planner);
    }
  } catch (_) {
    if ((planner.topics || []).length || Object.keys(planner.days || {}).length) {
      results.planner = await pushToServer('planner', planner);
    }
  }

  window.dispatchEvent(new CustomEvent('leleo-sync-done', { detail: results }));
  return results;
}
