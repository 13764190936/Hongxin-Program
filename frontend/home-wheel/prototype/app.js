/* HONGFENG · 首页纵向滚轮原型
   只负责：选择、进入、返回、键盘与减少动态效果。
   不承载任何业务规则；次级页为占位内容。 */

(() => {

const MODULES = [
  {id:'move',  name:'运动', idx:'01', eyebrow:'运动 / MOVEMENT', sub:'早起 · 步数 · 跑步',
   lede:'起床、步数与跑步都收在运动里。', items:['起床打卡','早晨步数','跑步记录']},
  {id:'read',  name:'读书', idx:'02', eyebrow:'读书 / READING', sub:'书页 · 摘录 · 感悟',
   lede:'记录读过的书，也把摘录分享出去。', items:['书籍记录','阅读分享','阅读进度']},
  {id:'visit', name:'拜访', idx:'03', eyebrow:'拜访 / VISIT', sub:'拍照 · 记录 · 回顾',
   lede:'拍一张照片，代表完成一次拜访。', items:['拍照上传','拜访记录','历史回顾']}
];

const GLYPHS = {
  move: '<path d="M24 104h40V78h40V52h34V26" fill="none" stroke="currentColor" stroke-width="6.5" stroke-linejoin="round"/><circle cx="152" cy="26" r="7" fill="#D62836"/>',
  read: '<path d="M24 34 96 24v76L24 110Z" fill="currentColor"/><path d="M104 24l72 10v76l-72-10Z" fill="currentColor"/><rect x="96" y="22" width="8" height="34" fill="#D62836"/>',
  visit:'<g fill="none" stroke="currentColor" stroke-width="6"><circle cx="46" cy="65" r="20"/><circle cx="154" cy="65" r="20"/><path d="M70 65h60"/></g><circle cx="100" cy="65" r="9" fill="#D62836"/>'
};

const homeEl = document.getElementById('home');
const wheel = document.getElementById('wheel');
const track = document.getElementById('track');
const labelsEl = document.getElementById('labels');
const labelTrack = document.getElementById('labelTrack');
const counterEl = document.getElementById('counter-current');
const liveEl = document.getElementById('live');
const detailEl = document.getElementById('detail');
const detailTitle = document.getElementById('detail-title');
const detailEyebrow = document.getElementById('detail-eyebrow');
const detailLede = document.getElementById('detail-lede');
const detailList = document.getElementById('detail-list');
const detailCounter = document.getElementById('detail-counter');
const backBtn = document.getElementById('back');

const COUNT = MODULES.length;
const state = {index:0, detail:null};

let p = 0;                 // 浮点位置，单位=项
let plateStep = 200;       // 相邻项纵向间距（px）
let labelStep = 58;
let rafId = 0;
let tweenTarget = null;
let drag = null;
let suppressNextClick = false;
let wheelAcc = 0;
let wheelLockUntil = 0;
let detailSeq = 0;

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduce = reduceQuery.matches;
if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', event => { reduce = event.matches; });

/* ---------- 构建 ---------- */
track.innerHTML = MODULES.flatMap((m, i) => [0, 1].map(copy => `
  <div class="slot" data-i="${i}" data-copy="${copy}">
    <div class="plate">
      <span class="plate-band" aria-hidden="true"><span class="plate-index">${m.idx}</span></span>
      <span class="plate-figure">
        <svg class="glyph" viewBox="0 0 200 130" aria-hidden="true">${GLYPHS[m.id]}</svg>
      </span>
    </div>
  </div>`)).join('');

labelTrack.innerHTML = [-1, 0, 1].map(slot => `
  <div class="label-slot" data-slot="${slot}">
    <span class="label-name"></span>
  </div>`).join('');

const optionsHtml = MODULES.map((m, i) =>
  `<div role="option" id="opt-${i}" aria-selected="${i === 0}">${m.name}</div>`).join('');
const optionsWrap = document.createElement('div');
optionsWrap.className = 'sr-only';
optionsWrap.innerHTML = optionsHtml;
wheel.appendChild(optionsWrap);

const slots = Array.from(track.children);
const labelSlots = Array.from(labelTrack.children);
const optionEls = Array.from(optionsWrap.children);

/* ---------- 数学 ---------- */
const mod = (n, m) => ((n % m) + m) % m;
function wrap(d) {
  const r = mod(d + COUNT / 2, COUNT) - COUNT / 2;  // [-1.5, 1.5)
  return r;
}
const opacityFor = f => f <= 1 ? 1 - 0.56 * f : Math.max(0, 0.44 * (1 - (f - 1) / 0.5));
const blurFor = f => f < 0.1 ? 0 : (f <= 1 ? f * 3.4 : 3.4 + (f - 1) / 0.5 * 2.6);
const currentIndex = () => mod(Math.round(p), COUNT);
const isSettled = () => Math.abs(p - Math.round(p)) < 0.02;

/* ---------- 渲染 ---------- */
function draw() {
  for (const el of slots) {
    const i = Number(el.dataset.i) + Number(el.dataset.copy) * COUNT;
    const d = wrap(i - p);
    const f = Math.abs(d);
    if (f > 1.5) { el.style.visibility = 'hidden'; continue; }
    el.style.visibility = 'visible';
    const rot = Math.max(-78, Math.min(78, -d * 68));
    el.style.transform =
      `translate3d(0,${(d * plateStep).toFixed(2)}px,${(-30 * f).toFixed(2)}px) ` +
      `rotateX(${rot.toFixed(2)}deg) scale(${(1 - 0.03 * f).toFixed(3)})`;
    el.style.opacity = opacityFor(f).toFixed(3);
    el.style.zIndex = String(10 - Math.round(f * 2));
    el.style.pointerEvents = f > 1.2 ? 'none' : 'auto';
    const blur = blurFor(f);
    el.firstElementChild.style.filter = blur < 0.1 ? 'none' : `blur(${blur.toFixed(2)}px)`;
  }

  const rounded = mod(Math.round(p), COUNT);
  if (rounded !== state.index) {
    state.index = rounded;
    updateLabels(rounded, true);
    counterEl.textContent = MODULES[rounded].idx;
  }
}

function updateLabels(index, animate) {
  labelSlots.forEach(el => {
    const slot = Number(el.dataset.slot);
    const moduleIndex = mod(index + slot, COUNT);
    const module = MODULES[moduleIndex];
    const nameEl = el.firstElementChild;
    if (nameEl.textContent !== module.name) nameEl.textContent = module.name;
    el.dataset.i = String(moduleIndex);
    if (animate) {
      el.animate([{ opacity: 0.15 }, { opacity: getComputedStyle(el).opacity }], { duration: 170, easing: 'ease-out' });
    }
  });
}

function settle() {
  p = mod(p, COUNT);
  draw();
  const i = currentIndex();
  state.index = i;
  counterEl.textContent = MODULES[i].idx;
  optionEls.forEach((el, k) => el.setAttribute('aria-selected', String(k === i)));
  wheel.setAttribute('aria-activedescendant', 'opt-' + i);
  updateLabels(i, false);
  labelsEl.classList.add('settled');
  liveEl.textContent = '已选择' + MODULES[i].name;
}

function measure() {
  const slot = slots[0];
  plateStep = slot.offsetWidth * 0.51;
  const cssStep = parseFloat(getComputedStyle(labelsEl).getPropertyValue('--label-step'));
  labelStep = Number.isFinite(cssStep) ? cssStep : 58;
  draw();
}

/* ---------- 动画 ---------- */
function cancelAnim() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  tweenTarget = null;
}

function tweenTo(target, duration) {
  cancelAnim();
  tweenTarget = target;
  labelsEl.classList.remove('settled');
  const from = p;
  const t0 = performance.now();
  const total = reduce ? 0 : duration;
  function tick(now) {
    const k = total <= 0 ? 1 : Math.min(1, (now - t0) / total);
    p = from + (target - from) * (1 - Math.pow(1 - k, 3));
    draw();
    if (k < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
      tweenTarget = null;
      p = target;
      settle();
    }
  }
  rafId = requestAnimationFrame(tick);
}

function stepToModule(i) {
  let best = i, bestDistance = Infinity;
  for (let k = -3; k <= 3; k++) {
    const candidate = i + k * COUNT;
    const distance = Math.abs(candidate - p);
    if (distance < bestDistance) { bestDistance = distance; best = candidate; }
  }
  tweenTo(best, 360);
}

function snap(velocity) {
  // 速度只做小幅前推，避免一次拖动跨两格；最多再进一格。
  const projected = p + Math.max(-0.34, Math.min(0.34, -velocity / plateStep * 120));
  const base = Math.round(p);
  const target = Math.max(base - 1, Math.min(base + 1, Math.round(projected)));
  tweenTo(target, 380);
}

/* ---------- 手势 ---------- */
wheel.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  cancelAnim();
  labelsEl.classList.remove('settled');
  drag = {
    y: event.clientY,
    p0: p,
    lastY: event.clientY,
    lastT: performance.now(),
    moved: false,
    v: 0
  };
  try { wheel.setPointerCapture(event.pointerId); } catch (_) {}
  wheel.classList.add('is-dragging');
});

wheel.addEventListener('pointermove', event => {
  if (!drag) return;
  const dy = event.clientY - drag.y;
  if (Math.abs(dy) > 8) drag.moved = true;
  if (!drag.moved) return;
  const now = performance.now();
  const dt = Math.max(1, now - drag.lastT);
  drag.v = (event.clientY - drag.lastY) / dt;
  drag.lastY = event.clientY;
  drag.lastT = now;
  p = drag.p0 - dy / plateStep;
  draw();
});

function endDrag(event) {
  if (!drag) return;
  const moved = drag.moved;
  const velocity = drag.v;
  drag = null;
  wheel.classList.remove('is-dragging');
  try { wheel.releasePointerCapture(event.pointerId); } catch (_) {}
  if (moved) {
    suppressNextClick = true;
    snap(velocity);
  } else {
    labelsEl.classList.add('settled');
  }
}
wheel.addEventListener('pointerup', endDrag);
wheel.addEventListener('pointercancel', event => {
  drag = null;
  wheel.classList.remove('is-dragging');
  snap(0);
});

wheel.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) return;
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
  event.preventDefault();
  const now = performance.now();
  if (now < wheelLockUntil) return;
  wheelAcc += event.deltaY;
  if (Math.abs(wheelAcc) >= 40) {
    const direction = wheelAcc > 0 ? 1 : -1;
    wheelAcc = 0;
    wheelLockUntil = now + 240;
    tweenTo(Math.round(p) + direction, 340);
  }
}, { passive: false });

/* ---------- 点击 ---------- */
document.addEventListener('click', event => {
  if (suppressNextClick) {
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const node = event.target.closest('.slot, .label-slot');
  if (!node) return;
  const i = Number(node.dataset.i);
  if (i === currentIndex() && isSettled()) {
    openDetail(i);
  } else {
    stepToModule(i);
    wheel.focus({ preventScroll: true });
  }
}, true);

/* ---------- 键盘 ---------- */
wheel.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    tweenTo(Math.round(p) + 1, 320);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    tweenTo(Math.round(p) - 1, 320);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (isSettled()) openDetail(currentIndex());
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.detail !== null) {
    event.preventDefault();
    requestClose();
  }
});

/* ---------- 进入与返回 ---------- */
function openDetail(i) {
  if (state.detail !== null) return;
  state.detail = i;
  const m = MODULES[i];

  detailEyebrow.textContent = m.eyebrow;
  detailTitle.textContent = m.name;
  detailLede.textContent = m.lede;
  detailCounter.textContent = m.idx + ' / 03';
  detailList.innerHTML = m.items.map((item, k) => `
    <li>
      <span class="no">${String(k + 1).padStart(2, '0')}</span>
      <span class="name">${item}</span>
      <span class="state">待开放</span>
    </li>`).join('');

  homeEl.hidden = true;
  detailEl.hidden = false;
  window.scrollTo(0, 0);
  detailTitle.focus({ preventScroll: true });

  if (!reduce) {
    detailEl.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' }
    );
  }
  history.pushState({ hf: i }, '', '#/' + m.id);
}

function closeDetail() {
  if (state.detail === null) return;
  state.detail = null;
  const seq = ++detailSeq;

  const finish = () => {
    if (seq !== detailSeq) return;
    detailEl.hidden = true;
    homeEl.hidden = false;
    window.scrollTo(0, 0);
    wheel.focus({ preventScroll: true });
    draw();
  };

  if (reduce) { finish(); return; }

  const animation = detailEl.animate(
    [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(8px)' }],
    { duration: 160, easing: 'ease-in' }
  );
  animation.finished.then(finish, finish);
}

function requestClose() {
  if (history.state && typeof history.state.hf === 'number') history.back();
  else closeDetail();
}

backBtn.addEventListener('click', requestClose);
window.addEventListener('popstate', () => {
  if (state.detail !== null) closeDetail();
  else if (!homeEl.hidden) { /* 已在首页 */ }
});

/* ---------- 初始化 ---------- */
(function init() {
  const now = new Date();
  document.getElementById('today').textContent =
    [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('.');

  measure();
  settle();

  if (location.hash) history.replaceState(null, '', location.pathname + location.search);

  let resizeFrame = 0;
  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  };
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(wheel);

  // 供自动化检查使用，不参与界面。
  window.__hf = {
    get p() { return p; },
    get index() { return currentIndex(); },
    get detail() { return state.detail; },
    get target() { return tweenTarget; },
    finish() { const t = tweenTarget; cancelAnim(); if (t !== null) p = t; settle(); },
    modules: MODULES,
    next() { tweenTo(Math.round(p) + 1, 300); },
    prev() { tweenTo(Math.round(p) - 1, 300); },
    openDetail,
    closeDetail
  };
})();

})();
