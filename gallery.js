import { store } from './data.js';

// ------------------------------------------------------------ Thông số (đơn vị: chiều rộng sân khấu W)
const FRAME_MS = 200;          // 200ms / frame như sprite
const SPEED = 0.42;            // W mỗi giây
const FIRST_X = 1.0;           // tâm poster đầu tiên
const SPACING = 1.0;           // khoảng cách giữa tâm các poster
const START_X = 0.45;          // vị trí bắt đầu của nhân vật
const ACTIVE_RANGE = 0.2;      // lệch tối đa so với tâm poster để được highlight
const POSTER_MAX_W = 0.6;      // so với W
const POSTER_MAX_H = 0.44;     // so với H
const POSTER_CY = 0.43;        // tâm dọc poster, so với H
const HERO_H = 0.5;            // chiều cao nhân vật, so với H
const HERO_RATIO = 543 / 720;  // tỉ lệ khung sprite
const IDLE_FRAME = 1;          // frame đứng yên (walk_02)

const stage = document.getElementById('stage');
const wall = document.getElementById('wall');
const world = document.getElementById('world');
const hero = document.getElementById('hero');
const hint = document.getElementById('hint');
const counter = document.getElementById('counter');
const viewer = document.getElementById('viewer');
const viewerImg = document.getElementById('viewer-img');
const viewerTitle = document.getElementById('viewer-title');
const closeBtn = document.getElementById('close');

const touchUI = matchMedia('(pointer: coarse)').matches;
hint.innerHTML = touchUI
  ? 'Chạm giữ bên trái / phải để đi<br>Chạm vào poster sáng viền để xem'
  : 'Giữ <kbd>←</kbd> <kbd>→</kbd> để đi · <kbd>Space</kbd> để xem poster';

// ------------------------------------------------------------ Sprite: 4 frame đi tới + 4 frame đã lật
const frames = { 1: [], [-1]: [] };
const spriteLoads = [];
for (const [dir, name] of [[1, 'right'], [-1, 'left']]) {
  for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `assets/sprite/walk_${name}_0${i}.png`;
    img.alt = '';
    img.draggable = false;
    spriteLoads.push(img.decode().catch(() => {}));
    hero.appendChild(img);
    frames[dir].push(img);
  }
}

// ------------------------------------------------------------ Trạng thái
let W = 0, H = 0;
let posters = [];     // { data, el, cx, w, h }
let x = START_X, dir = 1, walkT = 0, shown = null;
let active = -1;
let maxX = 1;
const input = { keyL: false, keyR: false, ptr: 0 }; // ptr: -1 trái, 1 phải, 0 không
let hintTimer = null;

function layout() {
  const r = stage.getBoundingClientRect();
  W = r.width; H = r.height;
  const hh = H * HERO_H;
  hero.style.height = hh + 'px';
  hero.style.width = hh * HERO_RATIO + 'px';
  for (const p of posters) placePoster(p);
  render();
}

function placePoster(p) {
  const ratio = (p.data.width && p.data.height) ? p.data.width / p.data.height : 0.8;
  let w = W * POSTER_MAX_W, h = w / ratio;
  if (h > H * POSTER_MAX_H) { h = H * POSTER_MAX_H; w = h * ratio; }
  p.w = w; p.h = h;
  Object.assign(p.el.style, {
    width: w + 'px', height: h + 'px',
    left: (p.cx * W - w / 2) + 'px',
    top: (H * POSTER_CY - h / 2) + 'px',
  });
}

function buildPosters(list) {
  world.textContent = '';
  posters = list.map((data, i) => {
    const el = document.createElement('div');
    el.className = 'poster';
    el.dataset.index = i;
    const img = new Image();
    img.src = data.wall;
    img.alt = data.title || '';
    img.decoding = 'async';
    img.draggable = false;
    img.onload = () => {
      // dùng tỉ lệ thật của ảnh nếu dữ liệu thiếu kích thước
      if (!data.width) { data.width = img.naturalWidth; data.height = img.naturalHeight; placePoster(p); }
    };
    el.appendChild(img);
    world.appendChild(el);
    const p = { data, el, cx: FIRST_X + i * SPACING, w: 0, h: 0 };
    return p;
  });
  maxX = posters.length ? posters[posters.length - 1].cx + 0.75 : 1;
  document.getElementById('empty').hidden = posters.length > 0;
}

// ------------------------------------------------------------ Vòng lặp
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (viewer.hidden) {
    const move = (input.keyR || input.ptr === 1 ? 1 : 0) - (input.keyL || input.ptr === -1 ? 1 : 0);
    if (move) {
      dir = move;
      const nx = Math.max(0.25, Math.min(maxX, x + move * SPEED * dt));
      walkT = nx !== x ? walkT + dt * 1000 : 0;
      x = nx;
      dismissHint();
    } else {
      walkT = 0;
    }
  }
  render();
  requestAnimationFrame(tick);
}

function render() {
  const offset = -x * W + W / 2;
  world.style.transform = `translate3d(${offset}px,0,0)`;
  wall.style.backgroundPositionX = offset + 'px';

  const fi = walkT > 0 ? Math.floor(walkT / FRAME_MS) % 4 : IDLE_FRAME;
  const img = frames[dir][fi];
  if (img !== shown) {
    if (shown) shown.classList.remove('on');
    img.classList.add('on');
    shown = img;
  }

  let a = -1;
  for (let i = 0; i < posters.length; i++) {
    if (Math.abs(posters[i].cx - x) < ACTIVE_RANGE) { a = i; break; }
  }
  if (a !== active) {
    if (active >= 0) posters[active].el.classList.remove('active');
    if (a >= 0) {
      posters[a].el.classList.add('active');
      const pre = new Image(); pre.src = posters[a].data.full; // tải trước bản lớn
    }
    active = a;
    counter.textContent = posters.length
      ? `${String((a >= 0 ? a : nearest()) + 1).padStart(2, '0')} / ${String(posters.length).padStart(2, '0')}`
      : '';
  }
}

function nearest() {
  let best = 0;
  posters.forEach((p, i) => { if (Math.abs(p.cx - x) < Math.abs(posters[best].cx - x)) best = i; });
  return best;
}

function dismissHint() {
  if (hintTimer || hint.classList.contains('gone')) return;
  hintTimer = setTimeout(() => hint.classList.add('gone'), 2500);
}

// ------------------------------------------------------------ Xem poster
let lastFocus = null;
function openViewer() {
  if (active < 0) return;
  const d = posters[active].data;
  input.keyL = input.keyR = false; input.ptr = 0;
  viewerImg.src = d.full;
  viewerImg.alt = d.title || '';
  viewerTitle.textContent = d.title || '';
  viewer.hidden = false;
  lastFocus = document.activeElement;
  closeBtn.focus();
}
function closeViewer() {
  viewer.hidden = true;
  viewerImg.removeAttribute('src');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
closeBtn.addEventListener('click', closeViewer);
viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });

// ------------------------------------------------------------ Bàn phím (desktop)
addEventListener('keydown', e => {
  if (!viewer.hidden) {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); closeViewer(); }
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { input.keyL = true; e.preventDefault(); }
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { input.keyR = true; e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) openViewer(); }
});
addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.keyL = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.keyR = false;
});
addEventListener('blur', () => { input.keyL = input.keyR = false; input.ptr = 0; });

// ------------------------------------------------------------ Chạm / chuột
// Giữ nửa trái / phải để đi. Chạm nhanh vào poster đang sáng viền để mở.
let ptrId = null, holdTimer = null, pendingOpen = false;
stage.addEventListener('pointerdown', e => {
  if (!viewer.hidden || ptrId !== null) return;
  if (e.target.closest('a')) return;
  ptrId = e.pointerId;
  try { stage.setPointerCapture(e.pointerId); } catch {}
  const side = e.clientX < stage.getBoundingClientRect().left + W / 2 ? -1 : 1;
  const onActive = active >= 0 && e.target.closest('.poster') === posters[active].el;
  if (onActive) {
    pendingOpen = true;
    holdTimer = setTimeout(() => { pendingOpen = false; input.ptr = side; }, 220);
  } else {
    input.ptr = side;
  }
});
function endPointer(e, cancelled) {
  if (e.pointerId !== ptrId) return;
  clearTimeout(holdTimer);
  const open = pendingOpen && !cancelled;
  pendingOpen = false; ptrId = null; input.ptr = 0;
  if (open) openViewer();
}
stage.addEventListener('pointerup', e => endPointer(e, false));
stage.addEventListener('pointercancel', e => endPointer(e, true));
stage.addEventListener('contextmenu', e => e.preventDefault());

// ------------------------------------------------------------ Khởi động
addEventListener('resize', layout);
(async () => {
  let list = [];
  try { list = await store.list(); }
  catch (err) { console.error(err); }
  buildPosters(list);
  layout();
  await Promise.all(spriteLoads);
  document.getElementById('loading').classList.add('done');
  requestAnimationFrame(t => { last = t; tick(t); });
})();
