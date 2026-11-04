// Lớp dữ liệu dùng chung cho gallery và admin.
// Hai backend: Supabase (thật) hoặc Demo (IndexedDB trong trình duyệt).
import { SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET } from './config.js';

export const isDemo = !(SUPABASE_URL && SUPABASE_ANON_KEY);

/* Poster dạng chuẩn trả về cho UI:
   { id, title, wall, full, width, height, published, sort_order } */

// ---------------------------------------------------------------- Supabase
let _sb = null;
async function sb() {
  if (_sb) return _sb;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm');
  _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

function publicUrl(client, path) {
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const supa = {
  async list({ includeHidden = false } = {}) {
    const c = await sb();
    let q = c.from('posters').select('*').order('sort_order', { ascending: true }).order('created_at');
    if (!includeHidden) q = q.eq('published', true);
    const { data, error } = await q;
    if (error) throw error;
    return data.map(r => ({ ...r, wall: publicUrl(c, r.wall_path), full: publicUrl(c, r.full_path) }));
  },
  async add({ title, wallBlob, fullBlob, width, height }) {
    const c = await sb();
    const id = crypto.randomUUID();
    const wall_path = `${id}/wall.jpg`, full_path = `${id}/full.jpg`;
    for (const [p, b] of [[wall_path, wallBlob], [full_path, fullBlob]]) {
      const { error } = await c.storage.from(BUCKET).upload(p, b, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
    }
    const { data: last } = await c.from('posters').select('sort_order').order('sort_order', { ascending: false }).limit(1);
    const sort_order = last && last.length ? last[0].sort_order + 1 : 0;
    const { error } = await c.from('posters').insert({ id, title, wall_path, full_path, width, height, sort_order, published: true });
    if (error) throw error;
  },
  async update(id, patch) {
    const c = await sb();
    const { error } = await c.from('posters').update(patch).eq('id', id);
    if (error) throw error;
  },
  async remove(id) {
    const c = await sb();
    const { data } = await c.from('posters').select('wall_path, full_path').eq('id', id).single();
    if (data) await c.storage.from(BUCKET).remove([data.wall_path, data.full_path]);
    const { error } = await c.from('posters').delete().eq('id', id);
    if (error) throw error;
  },
  async reorder(ids) {
    const c = await sb();
    await Promise.all(ids.map((id, i) => c.from('posters').update({ sort_order: i }).eq('id', id)));
  },
  async session() { const c = await sb(); return (await c.auth.getSession()).data.session; },
  async signIn(email, password) {
    const c = await sb();
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signOut() { const c = await sb(); await c.auth.signOut(); },
};

// ---------------------------------------------------------------- Demo
const SEEDS = [
  [634, 897], [1760, 2200], [1760, 2200], [1760, 2200], [1650, 2200], [1536, 1920],
].map(([width, height], i) => ({
  id: `example${i + 1}`,
  title: `Poster ${String(i + 1).padStart(2, '0')}`,
  wallSrc: `assets/posters/example${i + 1}_wall.jpg`,
  fullSrc: `assets/posters/example${i + 1}_full.jpg`,
  width, height, published: true, sort_order: i,
}));

let memory = null; // dùng khi IndexedDB bị chặn
function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('virtual-gallery-demo', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        const st = db.createObjectStore('posters', { keyPath: 'id' });
        SEEDS.forEach(s => st.put(s));
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
}
async function tx(mode, fn) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const t = db.transaction('posters', mode);
      const st = t.objectStore('posters');
      let out;
      Promise.resolve(fn(st, v => (out = v))).catch(reject);
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
    });
  } catch (e) {
    if (!memory) memory = new Map(SEEDS.map(s => [s.id, { ...s }]));
    return fn(memStore(), v => v, true);
  }
}
function memStore() {
  return {
    getAll: () => ({ result: [...memory.values()], set onsuccess(f) { f(); } }),
    get: id => ({ result: memory.get(id), set onsuccess(f) { f(); } }),
    put: v => memory.set(v.id, v),
    delete: id => memory.delete(id),
    clear: () => memory.clear(),
  };
}
const urlCache = new Map();
function blobUrl(key, blob) {
  if (!urlCache.has(key)) urlCache.set(key, URL.createObjectURL(blob));
  return urlCache.get(key);
}
function toPoster(r) {
  return {
    ...r,
    wall: r.wallBlob ? blobUrl(r.id + 'w', r.wallBlob) : r.wallSrc,
    full: r.fullBlob ? blobUrl(r.id + 'f', r.fullBlob) : r.fullSrc,
  };
}
function getAll(st) {
  return new Promise(res => { const q = st.getAll(); q.onsuccess = () => res(q.result); });
}

const demo = {
  async list({ includeHidden = false } = {}) {
    const rows = await tx('readonly', async (st, done) => done(await getAll(st)));
    return (rows || [])
      .filter(r => includeHidden || r.published)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(toPoster);
  },
  async add({ title, wallBlob, fullBlob, width, height }) {
    const rows = await this.list({ includeHidden: true });
    const sort_order = rows.length ? Math.max(...rows.map(r => r.sort_order)) + 1 : 0;
    await tx('readwrite', st => st.put({ id: crypto.randomUUID(), title, wallBlob, fullBlob, width, height, published: true, sort_order }));
  },
  async update(id, patch) {
    await tx('readwrite', async st => {
      const r = await new Promise(res => { const q = st.get(id); q.onsuccess = () => res(q.result); });
      if (r) st.put({ ...r, ...patch });
    });
  },
  async remove(id) { await tx('readwrite', st => st.delete(id)); },
  async reorder(ids) {
    await tx('readwrite', async st => {
      const rows = await getAll(st);
      rows.forEach(r => { const i = ids.indexOf(r.id); if (i >= 0) st.put({ ...r, sort_order: i }); });
    });
  },
  async reset() { await tx('readwrite', st => { st.clear(); SEEDS.forEach(s => st.put({ ...s })); }); },
  async session() { return { demo: true }; },
  async signIn() {},
  async signOut() {},
};

export const store = isDemo ? demo : supa;

// ---------------------------------------------------------------- Ảnh
// Tạo 2 bản từ file gốc: "wall" (nhẹ, hiển thị trên tường) và "full" (xem toàn màn hình).
export async function makeVersions(file) {
  const bmp = await createImageBitmap(file);
  const render = (longEdge, quality) => {
    const r = Math.min(1, longEdge / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * r), h = Math.round(bmp.height * r);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    return new Promise(res => cv.toBlob(res, 'image/jpeg', quality));
  };
  const [wallBlob, fullBlob] = await Promise.all([render(1100, 0.85), render(2200, 0.88)]);
  return { wallBlob, fullBlob, width: bmp.width, height: bmp.height };
}
