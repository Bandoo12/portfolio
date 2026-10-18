/* Дизайн-портал. Рендер живого DOM из выгрузки Figma. */
let DATA = null, THEME = 'dark', ZOOM = 'fit', VIEW = { type: 'kit', id: null }, LAST = null, SPACING = false, EXACT = false;

const $ = s => document.querySelector(s);
function curZoom(frame) {
  const m = /scale\(([\d.]+)\)/.exec(frame && frame.style.transform || '');
  return m ? parseFloat(m[1]) : (typeof ZOOM === 'number' ? ZOOM : 1);
}
const E = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };

fetch('data.json?v=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(d => { DATA = d; buildNav(); route(); });

/* ---------- цвет ---------- */
function col(v) {
  if (!v) return null;
  if (v === 'IMG') return 'repeating-conic-gradient(#888 0 25%, #666 0 50%) 0 0/8px 8px';
  if (v[0] === 'G' && v.indexOf(':') > 0) {
    const [head, stops] = [v.slice(1, v.indexOf(':')), v.slice(v.indexOf(':') + 1)];
    return `linear-gradient(${head}deg, ${stops.split(',').map(col).join(', ')})`;
  }
  const [hex, a] = v.split('@');
  if (!a) return '#' + hex;
  const n = parseInt(hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${(+a) / 100})`;
}

/* ---------- рендер узла ---------- */
const ALIGN = { MIN: 'flex-start', CEN: 'center', MAX: 'flex-end', SPA: 'space-between', BAS: 'baseline' };

function node(n, depth) {
  const el = E('div', 'n');
  const s = el.style;
  s.position = 'absolute';
  s.left = n.x + 'px'; s.top = n.u + 'px';
  s.width = n.w + 'px'; s.height = n.h + 'px';
  if (n.o != null) s.opacity = n.o;
  if (n.rot) { s.transform = `rotate(${n.rot}deg)`; s.transformOrigin = '0 0'; }
  if (n.r != null) s.borderRadius = Array.isArray(n.r) ? n.r.map(v => v + 'px').join(' ') : n.r + 'px';
  if (n.cl) s.overflow = 'hidden';

  if (n.f && !n.ic) {
    const c = col(n.f);
    if (c && c.indexOf('gradient') >= 0) s.background = c; else s.background = c;
  }
  if (n.s) {
    const w = n.sw || 1, c = col(n.s);
    // обводка внутрь, чтобы не раздувать размеры узла
    s.boxShadow = (n.sa === 'O' ? `0 0 0 ${w}px ${c}` : `inset 0 0 0 ${w}px ${c}`);
  }
  if (n.sh) n.sh.forEach(sh => {
    const part = `${sh[1]}px ${sh[2]}px ${sh[3]}px ${sh[4]}px ${col(sh[5])}`;
    s.boxShadow = (s.boxShadow ? s.boxShadow + ', ' : '') + (sh[0] === 'i' ? 'inset ' : '') + part;
  });

  if (n.ic) {
    const ic = DATA.icons[n.ic];
    if (ic) el.appendChild(svgIcon(ic, n.w, n.h, col(n.icf) || 'currentColor'));
  } else if (n.gp) {
    // у фигуры своя геометрия: рисуем её, а не прямоугольник
    s.background = 'none';
    s.boxShadow = '';
    s.borderRadius = '';
    el.appendChild(svgShape(n));
  } else if (n.y === 'TE') {
    el.classList.add('t');
    const t = E('div', 'tx');
    t.textContent = n.c_;
    t.style.font = `${n.fw || 400} ${n.fs}px/${n.lhp || n.fs * 1.4}px ${JSON.stringify(n.ff || 'Inter')}, Inter, sans-serif`;
    if (n.ls) t.style.letterSpacing = n.ls + 'px';
    if (n.tc === 'UPPER') t.style.textTransform = 'uppercase';
    if (n.td === 'UNDERLINE') t.style.textDecoration = 'underline';
    t.style.color = col(n.f) || '#000';
    t.style.textAlign = { L: 'left', C: 'center', R: 'right', J: 'justify' }[n.ta] || 'left';
    s.display = 'flex'; s.background = 'none';
    s.alignItems = { T: 'flex-start', C: 'center', B: 'flex-end' }[n.tv] || 'flex-start';
    s.justifyContent = { L: 'flex-start', C: 'center', R: 'flex-end', J: 'flex-start' }[n.ta] || 'flex-start';
    t.style.width = '100%';
    // сколько строк занимает текст в Figma
    const lineH = n.lhp || Math.round((n.fs || 14) * 1.4);
    const figLines = Math.max(1, Math.round((n.h || lineH) / lineH));
    if (figLines === 1) {
      t.style.whiteSpace = 'pre';       // одна строка в макете — не переносим
      t.style.width = 'auto';
      s.overflow = 'visible';
    } else {
      t.style.whiteSpace = 'pre-wrap';  // многострочный — переносим по ширине блока
      t.style.width = '100%';
    }
    t.dataset.fit = figLines;           // подгонку ширины делаем после вставки в документ
    el.appendChild(t);
  }

  el._n = n;
  if (n.i) el.dataset.nid = n.i;
  (n.k || []).forEach(k => el.appendChild(node(k, depth + 1)));
  return el;
}

function svgShape(n) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n.w} ${n.h}`);
  svg.setAttribute('width', n.w); svg.setAttribute('height', n.h);
  svg.style.display = 'block'; svg.style.overflow = 'visible';
  const fill = col(n.f) || 'none';
  const stroke = col(n.s) || 'none';
  n.gp.forEach(p => {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', p.d);
    // strokeGeometry приходит уже как контур обводки — его заливаем цветом обводки
    path.setAttribute('fill', p.k === 's' ? stroke : fill);
    if (p.fr === 'EVENODD') path.setAttribute('fill-rule', 'evenodd');
    svg.appendChild(path);
  });
  return svg;
}

function svgIcon(ic, w, h, fill) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ic.w} ${ic.h}`);
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.style.display = 'block';
  ic.p.forEach(p => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('transform', `translate(${p.dx} ${p.dy})`);
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', p.d);
    path.setAttribute('fill', fill);
    if (p.fr === 'EVENODD') path.setAttribute('fill-rule', 'evenodd');
    g.appendChild(path); svg.appendChild(g);
  });
  return svg;
}

/* ---------- каркас ---------- */
function buildNav() {
  const n = $('#navlist');
  const q = $('#navq');
  if (q) q.oninput = () => {
    const v = (q.value || '').trim().toLowerCase();
    n.querySelectorAll('.navitem').forEach(b => {
      b.style.display = (!v || b.textContent.toLowerCase().includes(v)) ? 'block' : 'none';
    });
    n.querySelectorAll('.navgroup').forEach(g => { g.style.display = v ? 'none' : 'block'; });
  };
  let h = '<div class="navgroup">Обзор</div>';
  h += `<button class="navitem" data-v="start">Обзор</button>`;
  h += `<button class="navitem" data-v="screen">Макет «Инфо»</button>`;
  h += '<div class="navgroup">Основы</div>';
  h += `<button class="navitem" data-v="tokens">Токены</button>`;
  h += `<button class="navitem" data-v="icons">Иконки</button>`;
  h += '<div class="navgroup">UI KIT</div>';
  DATA.kit.forEach(k => { h += `<button class="navitem" data-v="kit" data-id="${k.id}">${k.title}</button>`; });
  n.innerHTML = h;
  n.querySelectorAll('.navitem').forEach(b => b.onclick = () => {
    VIEW = { type: b.dataset.v, id: b.dataset.id || null }; route();
  });
  VIEW = { type: 'start', id: null };
}

$('#theme').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  THEME = b.dataset.th;
  document.querySelectorAll('#theme button').forEach(x => x.classList.toggle('on', x === b));
  route();
};
$('#zoom').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.zs) ZOOM = nextZoom(shownZoom(), +b.dataset.zs);
  else if (b.id === 'zval') ZOOM = 1;
  else ZOOM = b.dataset.z === 'fit' ? 'fit' : +b.dataset.z;
  applyZoom();
};

function route() {
  document.querySelectorAll('.navitem').forEach(b =>
    b.classList.toggle('on', b.dataset.v === VIEW.type && (b.dataset.id || null) === VIEW.id));
  LAST = null; closeInsp();
  $('#zoom').style.display = 'none';
  $('#theme').style.display = 'inline-flex';
  if (VIEW.type === 'tokens') return renderTokens();
  if (VIEW.type === 'icons') return renderIcons();
  if (VIEW.type === 'screen') return renderScreen();
  if (VIEW.type === 'start') return renderStart();
  renderKit();
}

function head(title, sub) { $('#title').textContent = title; $('#subtitle').textContent = sub || ''; }

function zoomFor(f) {
  if (ZOOM !== 'fit') return ZOOM;
  // поля: #body 24*2 + рамка карточки 1*2 + отступы stage 18*2
  const avail = ($('#body').clientWidth || 1000) - 86;
  return Math.min(1, Math.max(0.25, avail / (f.w || 1)));
}

/* ---------- масштаб и панорамирование ---------- */
const ZSTEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const STAGE_MAX = 760;        // предел высоты окна просмотра, выше — панорамируем

function nextZoom(z, dir) {
  if (dir > 0) { for (const s of ZSTEPS) if (s > z + 1e-4) return s; return ZSTEPS[ZSTEPS.length - 1]; }
  for (let i = ZSTEPS.length - 1; i >= 0; i--) if (ZSTEPS[i] < z - 1e-4) return ZSTEPS[i];
  return ZSTEPS[0];
}
function shownZoom() {
  if (typeof ZOOM === 'number') return ZOOM;
  const st = document.querySelector('.stage');
  return st && st._f ? zoomFor(st._f) : 1;
}
function canPan(st) {
  return st.scrollWidth > st.clientWidth + 1 || st.scrollHeight > st.clientHeight + 1;
}
function layoutStage(st) {
  const f = st._f; if (!f) return;
  const fr = st.querySelector('.frame'), hold = st.querySelector('.frameholder');
  if (!fr || !hold) return;
  const z = zoomFor(f);
  fr.style.transform = `scale(${z})`;
  hold.style.width = (f.w * z) + 'px';
  hold.style.height = (f.h * z) + 'px';
  const full = f.h * z + 36;
  // «Вписать» оставляем как было — кадр целиком, скроллится страница;
  // при ручном зуме даём окно просмотра фиксированной высоты и панорамирование внутри
  st.style.height = (ZOOM === 'fit' ? full : Math.min(full, STAGE_MAX)) + 'px';
  st.classList.toggle('pan', canPan(st));
}
function syncZoomUI() {
  const v = $('#zval'); if (v) v.textContent = Math.round(shownZoom() * 100) + '%';
  document.querySelectorAll('#zoom button').forEach(b =>
    b.classList.toggle('on', b.dataset.z ? (b.dataset.z === 'fit' ? 'fit' : +b.dataset.z) === ZOOM : false));
}
function applyZoom() {
  document.querySelectorAll('.stage').forEach(layoutStage);
  syncZoomUI();
  if (LAST && LAST.isConnected) {
    const fr = LAST.closest('.frame');
    if (fr) { const sel = fr.querySelector('.sel'); if (sel) boxTo(sel, LAST, fr); }
  }
}
/* масштаб к точке под курсором */
function zoomAt(st, dir, cx, cy) {
  const f = st._f; if (!f) return;
  const z0 = zoomFor(f), z1 = nextZoom(z0, dir);
  if (z1 === z0) return;
  const r = st.getBoundingClientRect();
  const px = (st.scrollLeft + cx - r.left - 18) / z0;   // точка кадра под курсором
  const py = (st.scrollTop + cy - r.top - 18) / z0;
  ZOOM = z1; applyZoom();
  st.scrollLeft = px * z1 + 18 - (cx - r.left);
  st.scrollTop  = py * z1 + 18 - (cy - r.top);
}
/* перетаскивание зажатой мышью; короткий клик по-прежнему выделяет слой */
let PANNED = false;
(function initPan() {
  let st = null, sx = 0, sy = 0, l = 0, t0 = 0, moved = false;
  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const s = e.target.closest('.stage');
    if (!s || !canPan(s)) return;
    st = s; moved = false; sx = e.clientX; sy = e.clientY; l = s.scrollLeft; t0 = s.scrollTop;
  });
  document.addEventListener('mousemove', e => {
    if (!st) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved) {
      if (Math.abs(dx) + Math.abs(dy) < 4) return;     // порог, чтобы не терять клик
      moved = true; st.classList.add('panning');
    }
    st.scrollLeft = l - dx; st.scrollTop = t0 - dy;
    e.preventDefault();
  });
  document.addEventListener('mouseup', () => {
    if (!st) return;
    st.classList.remove('panning');
    if (moved) { PANNED = true; setTimeout(() => { PANNED = false; }, 0); }
    st = null;
  });
  document.addEventListener('click', e => {
    if (PANNED && e.target.closest('.stage')) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  document.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const s = e.target.closest('.stage'); if (!s) return;
    e.preventDefault();
    zoomAt(s, e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
  }, { passive: false });
})();
function stage(frames) {
  const body = $('#body');
  body.innerHTML = '';
  setTimeout(() => buildLayers(frames), 0);
  frames.forEach(f => {
    const card = E('section', 'card');
    const h2 = E('h2');
    h2.innerHTML = `${f.name}<span class="meta">${Math.round(f.w)}×${Math.round(f.h)} · ${f.theme === 'light' ? 'светлая' : 'тёмная'} тема</span>`;
    const st = E('div', 'stage ' + f.theme);
    st._f = f;
    const hold = E('div', 'frameholder');
    const fr = E('div', 'frame');
    fr.style.width = f.w + 'px'; fr.style.height = f.h + 'px';
    if (f.shot && EXACT) {
      const img = E('img', 'shot');
      img.src = f.shot; img.width = f.w; img.height = f.h; img.alt = f.name;
      img.draggable = false;
      fr.appendChild(img);
    }
    const tree = node(f.tree, 0);
    if (f.shot && EXACT) tree.classList.add('ghost');   // дерево невидимо, но ловит наведение
    fr.appendChild(tree);
    const hov = E('div', 'hov'), sel = E('div', 'sel');
    fr.appendChild(hov); fr.appendChild(sel);
    hold.appendChild(fr); st.appendChild(hold);
    const sets = [];
    (function scan(t) {
      if (t.pd) sets.push({ name: t.n, pd: t.pd });
      (t.k || []).forEach(scan);
    })(f.tree);
    if (sets.length) {
      const pp = E('div', 'props');
      pp.innerHTML = sets.map(s2 => `<div class="pset"><b>${s2.name}</b>` +
        s2.pd.map(p => `<span class="ptag">${p.n}<i>${p.o ? p.o.join(' · ') : propType(p.t)}</i></span>`).join('') +
        `</div>`).join('');
      card.appendChild(h2); card.appendChild(pp); card.appendChild(st);
    } else { card.appendChild(h2); card.appendChild(st); }
    body.appendChild(card);
    wire(fr, hov, sel);
    fitTexts(fr);
    paintSpacing(fr);
    layoutStage(st);
  });
  syncZoomUI();
}

function renderKit() {
  const k = DATA.kit.find(x => x.id === VIEW.id) || DATA.kit[0];
  head(k.title, 'UI KIT · ' + k.frames.length + ' кадров');
  $('#zoom').style.display = 'inline-flex';
  const frames = k.frames.filter(f => f.theme === THEME);
  stage(frames.length ? frames : k.frames);
}

function renderScreen() {
  const frames = DATA.infoFrames && DATA.infoFrames.length
    ? DATA.infoFrames
    : [{ name: 'Инфо', theme: 'dark', w: DATA.info.w, h: DATA.info.h, tree: DATA.info.tree }];
  const f = frames.find(x => x.theme === THEME) || frames[0];
  head('Макет «Инфо»', Math.round(f.w) + '×' + Math.round(f.h) +
       ' · ' + (f.theme === 'light' ? 'светлая тема' : 'тёмная тема'));
  $('#zoom').style.display = 'inline-flex';
  $('#theme').style.display = 'inline-flex';
  stage([Object.assign({}, f, { name: 'Инфо' })]);
}

function hint(t) { const p = E('p', 'hint'); p.textContent = t; setTimeout(() => $('#body').prepend(p), 0); }

function renderStart() {
  head('Дизайн-система', 'UI KIT и макеты');
  $('#theme').style.display = 'none';
  $('#zoom').style.display = 'none';

  const nodes = DATA.kit.reduce((a, p) => a + p.frames.reduce((b, f) => b + countNodes(f.tree), 0), 0);
  const variants = DATA.kit.reduce((a, p) => a + p.frames.reduce((b, f) => b + countSets(f.tree), 0), 0);

  const card = (id, title, sub, shot, kind) => `
    <button class="gcard${kind ? ' ' + kind : ''}" data-go="${id}">
      <span class="gthumb">${shot ? `<img src="${shot}" alt="" loading="lazy">` : '<i></i>'}</span>
      <span class="gtitle">${escapeHtml(title)}</span>
      <span class="gsub">${escapeHtml(sub)}</span>
    </button>`;

  const basics = [
    card('tokens', 'Токены', DATA.tokens.length + ' переменных · 2 темы', null, 'plain'),
    card('icons', 'Иконки', Object.keys(DATA.icons || {}).length + ' компонентов', null, 'plain'),
  ].join('');

  const fr = (DATA.infoFrames || []).find(x => x.theme === THEME) || (DATA.infoFrames || [])[0];
  const screens = fr
    ? card('screen', 'Макет «Инфо»',
           Math.round(fr.w) + '×' + Math.round(fr.h) + ' · светлая и тёмная тема', fr.shot)
    : '';

  const comps = DATA.kit.map(p => {
    const f = p.frames.find(x => x.shot) || p.frames[0];
    const sets = p.frames.reduce((a, x) => a + countSets(x.tree), 0);
    const sub = p.frames.length + (p.frames.length === 1 ? ' кадр' : ' кадра') +
                (sets ? ' · ' + sets + ' вариантов' : '');
    return card(p.id, p.title, sub, f && f.shot);
  }).join('');

  $('#body').innerHTML = `
    <div class="cover">
      <div class="covtext">
        <h2>Дизайн-система</h2>
        <p>Дизайн-система и макеты продукта. Всё, что видно на этой странице, выгружено
           прямо из Figma: размеры, отступы, токены, текстовые стили и состав компонентов.</p>
        <div class="stats">
          <span><b>${DATA.kit.length}</b> разделов</span>
          <span><b>${variants}</b> наборов вариантов</span>
          <span><b>${DATA.tokens.length}</b> токенов</span>
          <span><b>${Object.keys(DATA.icons || {}).length}</b> иконок</span>
          <span><b>${nodes}</b> слоёв</span>
        </div>
      </div>
    </div>

    <div class="gsec"><h3>Макеты</h3><div class="ggrid wide">${screens}</div></div>
    <div class="gsec"><h3>Основы</h3><div class="ggrid small">${basics}</div></div>
    <div class="gsec"><h3>Компоненты</h3><div class="ggrid">${comps}</div></div>

    <div class="gsec"><h3>Как пользоваться</h3>
      <div class="ghow">
        <div><b>Наведение</b><span>подсвечивает слой и показывает его размеры и отступы</span></div>
        <div><b>Клик</b><span>открывает инспектор: размеры, авто-раскладка, заливки с токенами, текстовые стили, CSS</span></div>
        <div><b>Alt + наведение</b><span>меряет расстояние от выделенного слоя до любого другого</span></div>
        <div><b>Панель слоёв</b><span>дерево как в Figma: поиск, раскрытие, переход стрелками</span></div>
        <div><b>Отступы</b><span>показывает все поля и шаги разом на всём кадре</span></div>
        <div><b>Открыть в Figma</b><span>ведёт на этот же слой в файле</span></div>
      </div>
    </div>`;

  $('#body').querySelectorAll('.gcard').forEach(b => b.onclick = () => {
    const id = b.dataset.go;
    VIEW = (id === 'tokens' || id === 'icons' || id === 'screen')
      ? { type: id, id: null } : { type: 'kit', id };
    route();
  });
}

function countNodes(n) {
  return 1 + (n.k || []).reduce((a, k) => a + countNodes(k), 0);
}
function countSets(n) {
  return (n.pd ? 1 : 0) + (n.k || []).reduce((a, k) => a + countSets(k), 0);
}

function renderIcons() {
  head('Иконки', Object.keys(DATA.icons).length + ' компонентов');
  $('#theme').style.display = 'inline-flex';
  const names = Object.keys(DATA.icons).sort();
  const wrap = E('div', 'icons' + (THEME === 'light' ? ' light' : ''));
  names.forEach(nm => {
    const c = E('div', 'icard');
    const box = E('div', 'ibox');
    box.appendChild(svgIcon(DATA.icons[nm], 24, 24, THEME === 'light' ? '#0C0C0D' : '#FFFFFF'));
    const lb = E('div', 'iname'); lb.textContent = nm;
    c.appendChild(box); c.appendChild(lb);
    c.title = 'клик — открыть на mui.com, Alt+клик — скопировать имя';
    c.onclick = e => {
      if (e.altKey) {                       // Alt — копируем имя, как раньше
        navigator.clipboard && navigator.clipboard.writeText(nm);
        c.classList.add('copied');
        setTimeout(() => c.classList.remove('copied'), 700);
        return;
      }
      window.open(muiLink(nm), '_blank', 'noopener');
    };
    wrap.appendChild(c);
  });
  $('#body').innerHTML = '';
  hint('Имя — как в Figma и в Material UI. Клик открывает иконку на mui.com, Alt+клик копирует имя.');
  $('#body').appendChild(wrap);
}

function muiLink(name) {
  // имена в ките — из набора Material UI: MoreVertOutlined, ExpandMoreOutlined и т.п.
  const base = name.replace(/(Outlined|Rounded|Sharp|TwoTone)$/, '') || name;
  return 'https://mui.com/material-ui/material-icons/?query=' +
         encodeURIComponent(base) + '&selected=' + encodeURIComponent(name);
}

function renderTokens() {
  head('Токены', DATA.tokens.length + ' цветовых переменных · Dark / Light');
  $('#theme').style.display = 'none';
  $('#body').innerHTML = `<div id="tokens">
    <input type="search" id="q" placeholder="например, Button/Style/Positiv">
    <table><thead><tr><th>Токен</th><th>Тёмная</th><th>Светлая</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const draw = () => {
    const q = ($('#q').value || '').toLowerCase();
    $('#tb').innerHTML = DATA.tokens.filter(t => !q || t[0].toLowerCase().includes(q))
      .map(t => `<tr><td>${t[0]}</td>
        <td><span class="sw" style="background:${col(t[1]) || 'transparent'}"></span> <span class="mono">${t[1]}</span></td>
        <td><span class="sw lt" style="background:${col(t[2]) || 'transparent'}"></span> <span class="mono">${t[2]}</span></td></tr>`).join('');
  };
  $('#q').oninput = draw; draw();
}

/* ---------- поиск по слоям и клавиатура ---------- */
function wireLayerSearch() {
  const q = $('#layerq'); if (!q) return;
  q.oninput = () => {
    const v = (q.value || '').trim().toLowerCase();
    const rows = document.querySelectorAll('.lrow');
    if (!v) { rows.forEach(r => { r.style.display = (+r.dataset.depth > 1) ? 'none' : ''; }); return; }
    rows.forEach(r => {
      const hit = r.querySelector('.lname').textContent.toLowerCase().includes(v);
      r.style.display = hit ? '' : 'none';
      if (hit) revealRow(r);
    });
  };
}
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const cur = document.querySelector('.lrow.on');
  if (e.key === 'Escape') { clearMeas(); closeInsp(); return; }
  if (!cur || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
  e.preventDefault();
  const rows = [...document.querySelectorAll('.lrow')].filter(r => r.style.display !== 'none');
  const i = rows.indexOf(cur);
  const next = rows[e.key === 'ArrowDown' ? i + 1 : i - 1];
  if (next) selectLayer(next.dataset.id);
});

/* ---------- подгонка текста под метрики Figma ---------- */
function fitTexts(frame) {
  frame.querySelectorAll('.n.t').forEach(el => {
    const n = el._n; if (!n || !n.c_) return;
    const t = el.querySelector('.tx'); if (!t) return;
    const lineH = n.lhp || Math.round((n.fs || 14) * 1.4);
    const figLines = Math.max(1, Math.round((n.h || lineH) / lineH));
    t.style.transform = ''; t.style.letterSpacing = (n.ls || 0) + 'px';
    if (figLines === 1) {
      // ширина строки должна совпасть с Figma: при расхождении сжимаем/растягиваем
      const w = t.scrollWidth;
      if (w > 1 && n.w > 1 && Math.abs(w - n.w) > 0.5) {
        const k = n.w / w;
        if (k > 0.86 && k < 1.16) {
          // небольшое расхождение метрик шрифта — подгоняем ширину строки
          const origin = { L: 'left', C: 'center', R: 'right', J: 'left' }[n.ta] || 'left';
          t.style.transformOrigin = origin + ' top';
          t.style.transform = `scaleX(${k.toFixed(4)})`;
        } else if (k <= 0.86) {
          // в макете строка обрезана рамкой блока — повторяем это, а не сжимаем текст
          el.style.overflow = 'hidden';
          t.style.width = n.w + 'px';
          t.style.textOverflow = 'clip';
        }
      }
    } else {
      // многострочный: подбираем межбуквенный интервал, чтобы число строк совпало
      let guard = 0;
      while (t.scrollHeight > figLines * lineH + 1 && guard < 12) {
        const cur = parseFloat(t.style.letterSpacing) || 0;
        t.style.letterSpacing = (cur - 0.08).toFixed(2) + 'px';
        guard++;
      }
    }
  });
}

/* ---------- панель слоёв ---------- */
const TYPE_RU = { FR: 'фрейм', TE: 'текст', IN: 'инстанс', CO: 'компонент', VE: 'вектор',
  RE: 'прямоугольник', EL: 'эллипс', GR: 'группа', LI: 'линия', BO: 'фигура', ST: 'звезда' };
let LAYER_INDEX = new Map();   // node id -> элемент в кадре

function buildLayers(frames) {
  const host = $('#layers');
  if (!host) return;
  LAYER_INDEX = new Map();
  if (!frames.length) { host.innerHTML = ''; return; }
  const rows = [];
  frames.forEach((f, fi) => walkLayer(f.tree, 0, rows, fi));
  host.innerHTML = rows.join('');
  wireLayerSearch();
  host.querySelectorAll('.lrow').forEach(r => {
    const d = +r.dataset.depth;
    if (d > 1) r.style.display = 'none';
    if (d >= 1 && r.querySelector('.ltw').textContent) r.classList.add('closed');
  });
  host.querySelectorAll('.lrow').forEach(r => {
    r.onmouseenter = () => hoverLayer(r.dataset.id, true);
    r.onmouseleave = () => hoverLayer(r.dataset.id, false);
    r.onclick = e => {
      const tw = e.target.closest('.ltw');
      if (tw) { r.classList.toggle('closed'); collapseBelow(r); return; }
      selectLayer(r.dataset.id);
    };
  });
}
function walkLayer(n, depth, rows, fi) {
  if (depth > 12) return;
  const kids = n.k || [];
  const id = n.i || (fi + '-' + rows.length);
  rows.push(`<div class="lrow" data-id="${id}" data-depth="${depth}" style="padding-left:${6 + depth * 12}px">` +
    `<span class="ltw">${kids.length ? '▸' : ''}</span>` +
    `<span class="lname">${escapeHtml(n.n || TYPE_RU[n.y] || '')}</span>` +
    `<span class="ltype">${TYPE_RU[n.y] || n.y}</span></div>`);
  kids.forEach(k => walkLayer(k, depth + 1, rows, fi));
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function collapseBelow(row) {
  const depth = +row.dataset.depth, closed = row.classList.contains('closed');
  let el = row.nextElementSibling;
  while (el && +el.dataset.depth > depth) {
    const d = +el.dataset.depth;
    if (closed) {                       // сворачиваем: прячем всю ветку
      el.style.display = 'none';
      if (el.querySelector('.ltw').textContent) el.classList.add('closed');
    } else if (d === depth + 1) {       // разворачиваем: только прямых детей
      el.style.display = '';
    }
    el = el.nextElementSibling;
  }
}
function findEl(id) {
  if (LAYER_INDEX.has(id)) return LAYER_INDEX.get(id);
  const el = document.querySelector(`.frame [data-nid="${CSS.escape(id)}"]`);
  if (el) LAYER_INDEX.set(id, el);
  return el;
}
function hoverLayer(id, on) {
  const el = findEl(id); if (!el) return;
  const frame = el.closest('.frame'); if (!frame) return;
  const hov = frame.querySelector('.hov');
  if (!on) { hov.style.display = 'none'; return; }
  boxTo(hov, el, frame);
}
function revealRow(row) {
  let depth = +row.dataset.depth;
  let el = row.previousElementSibling;
  while (el && depth > 0) {
    const d = +el.dataset.depth;
    if (d < depth) { el.style.display = ''; el.classList.remove('closed'); depth = d; }
    el = el.previousElementSibling;
  }
  row.style.display = '';
}
function selectLayer(id) {
  const el = findEl(id); if (!el) return;
  const frame = el.closest('.frame'); if (!frame) return;
  boxTo(frame.querySelector('.sel'), el, frame);
  el.scrollIntoView({ block: 'center', inline: 'center' });
  openInsp(el);
  document.querySelectorAll('.lrow.on').forEach(r => r.classList.remove('on'));
  const row = document.querySelector(`.lrow[data-id="${CSS.escape(id)}"]`);
  if (row) { revealRow(row); row.classList.add('on'); row.scrollIntoView({ block: 'nearest' }); }
}
function boxTo(el, n, frame) {
  const fr = frame.getBoundingClientRect(), r = n.getBoundingClientRect(), k = curZoom(frame);
  el.style.display = 'block';
  el.style.left = ((r.left - fr.left) / k) + 'px';
  el.style.top = ((r.top - fr.top) / k) + 'px';
  el.style.width = (r.width / k) + 'px';
  el.style.height = (r.height / k) + 'px';
}

/* ---------- режим «все отступы» ---------- */
function paintSpacing(frame) {
  frame.querySelectorAll('.sp').forEach(e => e.remove());
  if (!SPACING) return;
  const add = (x, y, w, h, kind, label) => {
    if (w <= 0 || h <= 0) return;
    const d = E('div', 'sp ' + kind);
    d.style.left = x + 'px'; d.style.top = y + 'px';
    d.style.width = w + 'px'; d.style.height = h + 'px';
    if (label) d.dataset.v = label;
    frame.appendChild(d);
  };
  const base = frame.getBoundingClientRect(), k = curZoom(frame);
  frame.querySelectorAll('.n').forEach(el => {
    const n = el._n; if (!n || !n.l) return;
    const r = el.getBoundingClientRect();
    const x = (r.left - base.left) / k, y = (r.top - base.top) / k;
    const w = r.width / k, h = r.height / k;
    const p = n.p || [0, 0, 0, 0];
    if (p[0]) add(x, y, w, p[0], 'pad', p[0]);
    if (p[2]) add(x, y + h - p[2], w, p[2], 'pad', p[2]);
    if (p[3]) add(x, y + p[0], p[3], h - p[0] - p[2], 'pad', p[3]);
    if (p[1]) add(x + w - p[1], y + p[0], p[1], h - p[0] - p[2], 'pad', p[1]);
    if (n.g && (n.k || []).length > 1) {
      const kids = (n.k || []).filter(c => !c.ab);
      for (let i = 0; i + 1 < kids.length; i++) {
        const a = kids[i];
        if (n.l === 'H') add(x + a.x + a.w, y + a.u, n.g, a.h, 'gap', n.g);
        else add(x + a.x, y + a.u + a.h, a.w, n.g, 'gap', n.g);
      }
    }
  });
}

/* ---------- инспектор ---------- */
function wire(frame, hov, sel) {
  let dims = [];
  frame.addEventListener('mousemove', e => {
    const n = e.target.closest('.n'); if (!n || !frame.contains(n)) return;
    box(hov, n); showDims(n);
    const id = n.dataset.nid;
    if (id) {
      document.querySelectorAll('.lrow.hot').forEach(r => r.classList.remove('hot'));
      const row = document.querySelector(`.lrow[data-id="${CSS.escape(id)}"]`);
      if (row) row.classList.add('hot');
    }
    if (e.altKey && SELECTED && frame.contains(SELECTED)) measure(frame, SELECTED, n);
    else if (!e.altKey) clearMeas();
  });
  frame.addEventListener('mouseleave', () => { hov.style.display = 'none'; clear(); });
  frame.addEventListener('click', e => {
    const n = e.target.closest('.n'); if (!n) return;
    e.stopPropagation(); box(sel, n); openInsp(n); SELECTED = n;
    const id = n.dataset.nid;
    if (id) {
      document.querySelectorAll('.lrow.on').forEach(r => r.classList.remove('on'));
      const row = document.querySelector(`.lrow[data-id="${CSS.escape(id)}"]`);
      if (row) { revealRow(row); row.classList.add('on'); row.scrollIntoView({ block: 'center' }); }
    }
  });
  function box(el, n) {
    const fr = frame.getBoundingClientRect(), r = n.getBoundingClientRect(), k = curZoom(frame);
    el.style.display = 'block';
    el.style.left = ((r.left - fr.left) / k) + 'px'; el.style.top = ((r.top - fr.top) / k) + 'px';
    el.style.width = (r.width / k) + 'px'; el.style.height = (r.height / k) + 'px';
  }
  function clear() { dims.forEach(d => d.remove()); dims = []; }
  function showDims(el) {
    clear();
    const n = el._n; if (!n) return;
    const fr = frame.getBoundingClientRect(), r = el.getBoundingClientRect(), k = curZoom(frame);
    const put = (txt, x, y) => {
      const d = E('div', 'dim'); d.textContent = txt;
      d.style.left = (x / k) + 'px'; d.style.top = (y / k) + 'px';
      frame.appendChild(d); dims.push(d);
    };
    put(Math.round(n.w) + ' × ' + Math.round(n.h), r.left - fr.left, r.top - fr.top - 15 * k);
    if (n.p && n.p.some(v => v > 0)) put(padText(n.p), r.left - fr.left, r.bottom - fr.top + 3);
    if (n.g) put('шаг ' + n.g, r.right - fr.left - 56 * k, r.top - fr.top - 15 * k);
  }
}
function padText(p) {
  return `сверху ${p[0]} · справа ${p[1]} · снизу ${p[2]} · слева ${p[3]}`;
}
function upComp(el) {
  let q = el;
  while (q && q._n) { if (q._n.m) return q._n.m; q = q.parentElement; }
  return null;
}
function openInsp(el) {
  const n = el._n; if (!n) return;
  LAST = el;
  $('#insp').classList.add('on');
  $('#insptab').style.display = 'none';
  $('#inspname').textContent = n.n || TYPE_RU[n.y] || 'Слой';
  $('#inspkind').textContent = TYPE_RU[n.y] || n.y;
  $('#insppath').innerHTML = pathOf(el).map(p =>
    `<span>${escapeHtml(p)}</span>`).join('<i>/</i>');
  renderInspector(n, el);
}

function pathOf(el) {
  const out = [];
  let q = el;
  while (q && q._n) { out.unshift(q._n.n || TYPE_RU[q._n.y] || '—'); q = q.parentElement; }
  return out.slice(-4);
}

function renderInspector(n, el) {
  const rows = [];
  const sec = (title, items) => {
    const live = items.filter(Boolean);
    if (!live.length) return;
    rows.push(`<div class="isec"><div class="ihead">${title}</div>${live.join('')}</div>`);
  };
  const row = (k, v, extra) => v == null || v === '' ? '' :
    `<div class="irow"><span class="ik">${k}</span><span class="iv${extra ? ' ' + extra : ''}">${v}</span></div>`;
  const swatch = (c) => `<i class="isw" style="background:${col(c) || 'transparent'}"></i>`;
  const copyable = (v) => `<button class="icopy" data-copy="${escapeHtml(v)}">${escapeHtml(v)}</button>`;

  sec('Положение и размер', [
    row('X', copyable(Math.round(n.x) + '')),
    row('Y', copyable(Math.round(n.u) + '')),
    row('Ширина', copyable(Math.round(n.w) + '')),
    row('Высота', copyable(Math.round(n.h) + '')),
    n.rot ? row('Поворот', n.rot + '°') : '',
    n.cn ? row('Закрепление', cnName(n.cn)) : '',
    n.ab ? row('Позиционирование', 'абсолютное') : '',
  ]);

  sec('Авто-раскладка', [
    n.l ? row('Направление', n.l === 'H' ? 'в строку' : 'в колонку') : '',
    n.g != null ? row('Отступ между', copyable(n.g + '')) : '',
    n.p ? row('Поля', copyable(n.p.map(Math.round).join(' '))) : '',
    n.lh || n.lv ? row('Размер', szName(n.lh) + ' × ' + szName(n.lv)) : '',
  ]);

  sec('Оформление', [
    n.o != null ? row('Прозрачность', Math.round(n.o * 100) + '%') : '',
    n.r != null ? row('Скругление', copyable(Array.isArray(n.r) ? n.r.join(' ') : n.r + '')) : '',
    n.cl ? row('Обрезка', 'включена') : '',
  ]);

  sec('Заливка', [
    n.f ? row(swatch(n.f) + ' Цвет', copyable(n.f)) : '',
    n.ft ? row('Переменная', `<b class="itok">${escapeHtml(n.ft)}</b>`) : '',
  ]);

  sec('Обводка', [
    n.s ? row(swatch(n.s) + ' Цвет', copyable(n.s)) : '',
    n.sw ? row('Толщина', n.sw + ' px') : '',
    n.sa ? row('Положение', { I: 'внутрь', O: 'наружу', C: 'по центру' }[n.sa] || n.sa) : '',
    n.st_ ? row('Переменная', `<b class="itok">${escapeHtml(n.st_)}</b>`) : '',
  ]);

  if (n.sh) sec('Тени', n.sh.map(sh =>
    row(sh[0] === 'i' ? 'внутренняя' : 'внешняя',
        `${sh[1]} ${sh[2]} ${sh[3]}${sh[4] ? ' ' + sh[4] : ''} ${sh[5]}`)));

  if (n.y === 'TE') sec('Текст', [
    n.ts ? row('Стиль', `<b class="itok">${escapeHtml(n.ts)}</b>`) : '',
    row('Шрифт', `${n.ff || 'Inter'} ${n.fw || ''}`),
    row('Размер', copyable((n.fs || '') + '')),
    row('Интерлиньяж', copyable((n.lhp || '') + '')),
    n.ls ? row('Трекинг', n.ls + '') : '',
    row('Выравнивание', { L: 'слева', C: 'по центру', R: 'справа', J: 'по ширине' }[n.ta] || '—'),
  ]);

  const comp = n.m || upComp(el);
  if (comp || n.pd) sec('Компонент', [
    comp ? row('Мастер', `<b class="itok">${escapeHtml(comp)}</b>`) : '',
    ...(n.pr ? Object.keys(n.pr).map(k => row(k, escapeHtml(n.pr[k]))) : []),
    n.pd ? row('Свойства набора', n.pd.map(p =>
      escapeHtml(p.n) + (p.o ? ` <i>${escapeHtml(p.o.join(' · '))}</i>` : '')).join('<br>')) : '',
  ]);

  $('#insprows').innerHTML = rows.join('') || '<div class="iempty">нет данных</div>';
  $('#inspcode').textContent = cssOf(n);
  $('#insprows').querySelectorAll('.icopy').forEach(b => b.onclick = () => {
    navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy);
    b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 600);
  });

  const go = $('#gocomp'), page = comp ? findPage(comp) : null;
  go.style.display = page ? 'block' : 'none';
  go.onclick = () => { VIEW = { type: 'kit', id: page }; route(); };
  const fig = $('#gofigma');
  if (n.i) {
    fig.style.display = 'block';
    fig.onclick = () => window.open(
      `https://www.figma.com/design/${DATA.file}?node-id=${n.i.replace(/:/g, '-')}`, '_blank');
  } else fig.style.display = 'none';
}

function cssOf(n) {
  const L = [];
  L.push(`width: ${Math.round(n.w)}px;`);
  L.push(`height: ${Math.round(n.h)}px;`);
  if (n.l) {
    L.push('display: flex;');
    L.push(`flex-direction: ${n.l === 'H' ? 'row' : 'column'};`);
    if (n.g) L.push(`gap: ${n.g}px;`);
    if (n.p) L.push(`padding: ${n.p.map(v => Math.round(v) + 'px').join(' ')};`);
  }
  if (n.f && n.y !== 'TE') L.push(`background: ${col(n.f)};${n.ft ? ` /* ${n.ft} */` : ''}`);
  if (n.s) L.push(`border: ${n.sw || 1}px solid ${col(n.s)};${n.st_ ? ` /* ${n.st_} */` : ''}`);
  if (n.r != null) L.push(`border-radius: ${Array.isArray(n.r) ? n.r.map(v => v + 'px').join(' ') : n.r + 'px'};`);
  if (n.o != null) L.push(`opacity: ${n.o};`);
  if (n.sh) n.sh.forEach(sh => L.push(
    `box-shadow: ${sh[0] === 'i' ? 'inset ' : ''}${sh[1]}px ${sh[2]}px ${sh[3]}px ${sh[4] || 0}px ${col(sh[5])};`));
  if (n.y === 'TE') {
    L.push(`font-family: ${n.ff || 'Inter'};`);
    L.push(`font-size: ${n.fs}px;`);
    L.push(`font-weight: ${n.fw || 400};`);
    L.push(`line-height: ${n.lhp}px;`);
    if (n.ls) L.push(`letter-spacing: ${n.ls}px;`);
    L.push(`color: ${col(n.f)};${n.ft ? ` /* ${n.ft} */` : ''}`);
  }
  return L.join('\n');
}

function propType(t) {
  return { VARIANT: 'вариант', BOOLEAN: 'вкл/выкл', TEXT: 'текст', INSTANCE_SWAP: 'выбор иконки' }[t] || t;
}
function cnName(c) {
  const H = { LEF: 'слева', RIG: 'справа', CEN: 'по центру', TOP: 'сверху',
              BOT: 'снизу', SCA: 'масштабируется', STR: 'растягивается' };
  const [h, v] = String(c).split('/');
  return (H[h] || h) + ' · ' + (H[v] || v);
}
function szName(c) { return { F: 'фикс', H: 'по содержимому', f: 'тянется' }[c] || (c === 'F' ? 'фикс' : c === 'H' ? 'по содержимому' : 'тянется'); }

function findPage(comp) {
  const c = comp.toLowerCase();
  if (DATA.icons[comp]) return 'Icons';
  const by = [['type=cell', 'Table'], ['type=headline', 'Table'], ['type=group', 'Table'],
  ['round text', 'Button'], ['round icon', 'Button'], ['content text', 'Button'],
  ['сhecked', 'Checkbox'], ['checked', 'Checkbox'],
  ['type=input', 'Input'], ['type=dropdown', 'Dropdown'], ['dropdownmenu', 'Dropdown'],
  ['shape=round', 'Chip'], ['status=', 'Chip'], ['type=secondary', 'Chip'], ['type=primary', 'Chip'],
  ['size=', 'Chip'], ['state=default,size', 'Tab'], ['property 1=', 'Pagination'],
  ['sectionhead', 'Section'], ['icon /', 'Checkbox']];
  for (const [k, p] of by) if (c.includes(k)) return DATA.kit.find(x => x.id === p) ? p : null;
  return null;
}
document.addEventListener('click', e => {
  const tab = e.target.closest('.itab');
  if (tab) {
    document.querySelectorAll('.itab').forEach(t => t.classList.toggle('on', t === tab));
    const code = tab.dataset.tab === 'code';
    $('#insprows').style.display = code ? 'none' : '';
    $('#inspcodewrap').style.display = code ? '' : 'none';
  }
  if (e.target.id === 'copycode') {
    navigator.clipboard && navigator.clipboard.writeText($('#inspcode').textContent);
    e.target.textContent = 'Скопировано';
    setTimeout(() => { e.target.textContent = 'Скопировать CSS'; }, 900);
  }
});

/* ---------- измерения расстояний (Alt), как в Figma ---------- */
let ALT = false, SELECTED = null;
document.addEventListener('keydown', e => { if (e.altKey && !ALT) { ALT = true; } });
document.addEventListener('keyup', e => { if (!e.altKey && ALT) { ALT = false; clearMeas(); } });
function clearMeas() { document.querySelectorAll('.meas,.measline').forEach(x => x.remove()); }
function measure(frame, a, b) {
  clearMeas();
  if (!a || !b || a === b) return;
  const fb = frame.getBoundingClientRect(), k = curZoom(frame);
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  const put = (x, y, w, h, label) => {
    const l = E('div', 'measline');
    l.style.left = (x / k) + 'px'; l.style.top = (y / k) + 'px';
    l.style.width = Math.max(w / k, 1) + 'px'; l.style.height = Math.max(h / k, 1) + 'px';
    frame.appendChild(l);
    const t = E('div', 'meas'); t.textContent = label;
    t.style.left = ((x + w / 2) / k) + 'px'; t.style.top = ((y + h / 2) / k - 8) + 'px';
    frame.appendChild(t);
  };
  // горизонтальный зазор
  if (rb.left >= ra.right) put(ra.right - fb.left, (ra.top + ra.bottom) / 2 - fb.top, rb.left - ra.right, 1,
      Math.round(rb.left - ra.right) + '');
  else if (ra.left >= rb.right) put(rb.right - fb.left, (ra.top + ra.bottom) / 2 - fb.top, ra.left - rb.right, 1,
      Math.round(ra.left - rb.right) + '');
  // вертикальный зазор
  if (rb.top >= ra.bottom) put((ra.left + ra.right) / 2 - fb.left, ra.bottom - fb.top, 1, rb.top - ra.bottom,
      Math.round(rb.top - ra.bottom) + '');
  else if (ra.top >= rb.bottom) put((ra.left + ra.right) / 2 - fb.left, rb.bottom - fb.top, 1, ra.top - rb.bottom,
      Math.round(ra.top - rb.bottom) + '');
}

function closeInsp() {
  $('#insp').classList.remove('on');
  $('#insptab').style.display = LAST ? 'block' : 'none';
}
function openLast() { if (LAST) openInsp(LAST); }
