'use client';
import { useEffect, useRef } from 'react';
import { PulseDashboard } from './PulseDashboard';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/* ── Animation helpers (exact port of vladgalanov.ru/js/script.js) ── */
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const STICKY_TOP = 32;
const SCENE_H = 900;
const CARD_GAP = 24;
const PEEK = 14;
const HOLD = 0.32;
const DURATION = 1;

type CardMetric = { height: number; normalY: number; stackY: number };
type Stack = {
  section: HTMLElement; stack: HTMLElement; cards: HTMLElement[];
  rafId: number; isEnabled: boolean; animationTravel: number;
  targetProgress: number; renderedProgress: number; hasRenderedProgress: boolean;
  cardMetrics: CardMetric[];
};

function initStacks(sections: HTMLElement[]) {
  const stacks: Stack[] = sections.map(section => {
    const stack = section.querySelector<HTMLElement>('[data-case-stack]')!;
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-case-stack-card]'));
    return { section, stack, cards, rafId: 0, isEnabled: false, animationTravel: 1, targetProgress: 0, renderedProgress: 0, hasRenderedProgress: false, cardMetrics: [] };
  }).filter(s => s.stack && s.cards.length >= 2);

  const clear = (cs: Stack) => {
    cs.section.removeAttribute('data-case-stack-ready');
    cs.section.style.removeProperty('--case-stack-section-height');
    cs.cards.forEach(c => {
      c.style.removeProperty('--case-stack-card-y');
      c.style.removeProperty('--case-stack-card-scale');
      c.style.removeProperty('--case-stack-card-opacity');
      c.style.removeProperty('--case-stack-card-z');
    });
  };

  const measure = (cs: Stack) => {
    let nY = 0;
    cs.cardMetrics = cs.cards.map((card, i) => {
      const h = card.offsetHeight;
      const m: CardMetric = { height: h, normalY: nY, stackY: i * PEEK };
      nY += h + CARD_GAP;
      return m;
    });
    const seg = Math.max(1, Math.min(520, Math.max(340, (cs.cardMetrics[0]?.height || SCENE_H) * 0.76)));
    cs.animationTravel = Math.max(1, seg * (Math.max(1, cs.cards.length - 1) + HOLD));
    cs.section.style.setProperty('--case-stack-section-height', `${(cs.animationTravel + STICKY_TOP + SCENE_H + 140).toFixed(2)}px`);
  };

  const getProgress = (cs: Stack) =>
    clamp(-cs.section.getBoundingClientRect().top / cs.animationTravel);

  const apply = (cs: Stack, progress: number) => {
    const cards = cs.cards;
    const stepP = progress * (Math.max(1, cards.length - 1) + HOLD);
    const activeP = Math.max(0, stepP - HOLD);

    const states = cards.map((card, i) => {
      const m = cs.cardMetrics[i] || { height: card.offsetHeight, normalY: i * (card.offsetHeight + CARD_GAP), stackY: i * PEEK };
      const sp = i === 0 ? 1 : easeInOutCubic(clamp((stepP - (i - 1 + HOLD)) / DURATION));
      const y = lerp(m.normalY, m.stackY, sp);
      const passed = Math.max(0, activeP - i);
      const scale = passed <= 0 ? 1 : Math.max(0.925, 1 - passed * 0.018);
      return { card, i, y, scale, sp, height: m.height };
    });

    states.forEach(({ card, i, y, scale, sp, height }) => {
      const next = states[i + 1];
      const ch = height * scale;
      const overlapP = next ? easeInOutCubic(clamp((y + ch - next.y) / Math.max(1, ch * 0.42))) : 0;
      const fadeP = next ? overlapP * next.sp : 0;
      const extra = Math.max(0, Math.floor(activeP) - i - 1);
      const opacity = next ? lerp(1, Math.max(0.12, 0.76 - extra * 0.22), fadeP) : 1;
      card.style.setProperty('--case-stack-card-y', `${y.toFixed(2)}px`);
      card.style.setProperty('--case-stack-card-scale', scale.toFixed(4));
      card.style.setProperty('--case-stack-card-opacity', opacity.toFixed(4));
      card.style.setProperty('--case-stack-card-z', String(100 + i));
    });
  };

  const update = (cs: Stack) => {
    cs.rafId = 0;
    if (!cs.isEnabled) return;
    cs.targetProgress = getProgress(cs);
    if (!cs.hasRenderedProgress) {
      cs.renderedProgress = cs.targetProgress;
      cs.hasRenderedProgress = true;
      apply(cs, cs.renderedProgress);
      return;
    }
    cs.renderedProgress = lerp(cs.renderedProgress, cs.targetProgress, 0.095);
    if (Math.abs(cs.renderedProgress - cs.targetProgress) < 0.001) cs.renderedProgress = cs.targetProgress;
    apply(cs, cs.renderedProgress);
    if (Math.abs(cs.renderedProgress - cs.targetProgress) >= 0.001)
      cs.rafId = requestAnimationFrame(() => update(cs));
  };

  const syncNow = (cs: Stack) => {
    cs.targetProgress = getProgress(cs);
    cs.renderedProgress = cs.targetProgress;
    cs.hasRenderedProgress = true;
    apply(cs, cs.renderedProgress);
  };

  const req = (cs: Stack) => { if (!cs.rafId) cs.rafId = requestAnimationFrame(() => update(cs)); };

  stacks.forEach(cs => {
    cs.isEnabled = true;
    cs.section.setAttribute('data-case-stack-ready', 'true');
    measure(cs);
    syncNow(cs);
  });

  const onScroll = () => stacks.forEach(req);
  const onResize = () => stacks.forEach(cs => { measure(cs); syncNow(cs); });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    stacks.forEach(cs => { cancelAnimationFrame(cs.rafId); clear(cs); });
  };
}

/* ── Page ── */
export default function GalanovPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = Array.from(
      pageRef.current?.querySelectorAll<HTMLElement>('[data-case-stack-section]') ?? []
    );
    if (!sections.length) return;
    const cleanup = initStacks(sections);
    return cleanup;
  }, []);

  return (
    <>
      <style>{`
        .g-page { background:#000; color:#fff; font-family:"Google Sans","Product Sans",Inter,"Segoe UI",system-ui,sans-serif; min-height:100vh; }
        .g-bg { position:fixed; inset:0; pointer-events:none; background-image:radial-gradient(circle,rgba(255,255,255,.55) 1.2px,transparent 1.35px); background-size:24px 24px; opacity:.2; z-index:0; }
        .g-frame { position:relative; z-index:1; width:1440px; margin:0 auto; padding:80px 80px 160px; }
        .g-main { display:flex; flex-direction:column; gap:188px; align-items:center; }

        /* Case layout */
        .g-case { display:flex; justify-content:space-between; width:1280px; }
        .g-case[data-case-stack-ready] { min-height:var(--case-stack-section-height,2400px); }
        .g-info { position:sticky; top:0; align-self:flex-start; width:419px; padding-top:64px; display:flex; flex-direction:column; gap:32px; }
        .g-heading { display:flex; flex-direction:column; gap:12px; }
        .g-logo { width:32px; height:32px; overflow:hidden; border-radius:999px; }
        .g-logo img { width:32px; height:32px; object-fit:cover; }
        .g-logo-sq { border-radius:24px; }
        .g-title { margin:0; font-size:24px; font-weight:500; line-height:28px; }
        .g-role { margin:0; color:rgba(255,255,255,.4); font-size:16px; font-weight:400; line-height:22px; }
        .g-lead { margin:0; font-size:20px; font-weight:500; line-height:24px; }
        .g-desc { margin:0; color:#fff; font-size:14px; font-weight:200; line-height:20px; width:419px; }
        .g-desc p { margin:0; } .g-desc p+p { margin-top:20px; }
        .g-results { display:flex; flex-direction:column; gap:12px; width:419px; padding:24px; border-radius:24px; background:#1a1a1a; }
        .g-result { display:flex; gap:10px; align-items:flex-start; color:#fff; font-size:14px; font-weight:400; line-height:20px; }
        .g-result img { width:8px; height:8px; flex-shrink:0; margin-top:6px; }

        /* Visuals / card stack */
        .g-visuals { display:flex; flex-direction:column; gap:24px; width:740px; }
        .g-case[data-case-stack-ready] .g-visuals {
          position:sticky; top:${STICKY_TOP}px; height:${SCENE_H}px;
          isolation:isolate; overflow:visible; perspective:1200px;
        }
        .g-card { margin:0; padding:0; list-style:none; }
        .g-case[data-case-stack-ready] .g-card {
          position:absolute; top:0; left:0; width:100%;
          z-index:var(--case-stack-card-z,1);
          opacity:var(--case-stack-card-opacity,1);
          transform:translate3d(0,var(--case-stack-card-y,0px),0) scale(var(--case-stack-card-scale,1));
          transform-origin:center top; will-change:transform,opacity;
        }

        /* Visual containers */
        .g-visual { display:flex; width:740px; border-radius:24px; overflow:hidden; }
        .g-visual video,.g-visual img { display:block; pointer-events:none; user-select:none; }

        /* Pulse visuals */
        .g-pulse-hero { height:444px; }
        .g-pulse-hero video { width:740px; height:444px; object-fit:cover; }
        .g-pulse-profile { height:400px; background:#0f0f0f; align-items:center; justify-content:center; }
        .g-pulse-profile img { width:564px; object-fit:cover; }
        .g-pulse-cards,.g-pulse-circle { height:400px; }
        .g-pulse-cards video,.g-pulse-circle video { width:740px; height:400px; object-fit:cover; }
        .g-pulse-nda { height:auto; padding:32px 0; background:linear-gradient(180deg,#0f0f0f 0%,rgba(15,15,15,0) 100%); align-items:center; justify-content:center; }
        .g-pulse-nda span { color:rgba(255,255,255,.5); font-size:32px; font-weight:400; }

        /* Skillaz visuals */
        .g-skillaz .g-visual { border:1px solid rgba(255,255,255,.1); background:#edf6ff; }
        .g-skillaz-top,.g-skillaz-scroll { height:400px; padding:32px; align-items:center; justify-content:center; }
        .g-skillaz-video { width:492px; height:308px; border-radius:12px; object-fit:cover; }
        .g-skillaz-scroll img { width:492px; border-radius:12px; object-fit:cover; }
        .g-skillaz-row { display:flex; gap:24px; width:740px; }
        .g-skillaz-split { width:358px; height:202px; padding:32px; }
        .g-skillaz-split img { width:294px; height:138px; object-fit:cover; }
        .g-skillaz-compact { width:358px; height:248px; padding:32px; }
        .g-skillaz-icon img { width:184px; height:184px; object-fit:cover; }
        .g-skillaz-wide img { width:294px; height:138px; object-fit:cover; }
        .g-skillaz-banner { height:166px; padding:32px; }
        .g-skillaz-banner img { width:676px; object-fit:cover; }
      `}</style>

      <div className="g-page" ref={pageRef}>
        <div className="g-bg" />
        <div className="g-frame">
          <main className="g-main">

            {/* ══ PULSE 2.0 ══ */}
            <article className="g-case" data-case-stack-section>
              <aside className="g-info">
                <div className="g-heading">
                  <div className="g-logo"><img src={`${BASE}/assets/new/pulse-logo.png`} alt="" /></div>
                  <h2 className="g-title">Пульс 2.0</h2>
                  <p className="g-role">Lead Product Designer</p>
                  <p className="g-lead">Корпоративная платформа Сбера для 290k+ сотрудников на web, mobile, PWA и iPad.</p>
                </div>
                <p className="g-desc">Работал над развитием AI-first сценариев, персонализации и новых enterprise UX-подходов внутри продукта. Вместе с командой прорабатывали концепты, связанные с рекомендациями, цифровыми следами, productivity-механиками и адаптивным интерфейсом.</p>
                <div className="g-results">
                  {[
                    'запустил и масштабировал Пульс 2.0 на региональные подразделения',
                    'стандартизировал UX на 4 платформах',
                    'внедрил AI-сценарии: поиск, ассистент и рекомендации',
                    'ускорил проверку и согласование концептов через AI prototyping',
                  ].map(t => (
                    <div key={t} className="g-result">
                      <img src={`${BASE}/assets/new/pulse-bullet.svg`} alt="" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="g-visuals" data-case-stack>
                {/* Card 1 — dashboard UI */}
                <figure className="g-card">
                  <div className="g-visual g-pulse-hero" style={{overflow:'hidden',borderRadius:16}}>
                    <PulseDashboard />
                  </div>
                </figure>

                {/* Card 2 — profile */}
                <figure className="g-card">
                  <div className="g-visual g-pulse-profile">
                    <img src={`${BASE}/assets/new/pulse-profile-card.png`} alt="" loading="lazy" />
                  </div>
                </figure>

                {/* Card 3 — birthday video */}
                <figure className="g-card">
                  <div className="g-visual g-pulse-cards">
                    <video autoPlay muted loop playsInline preload="none"
                      poster={`${BASE}/assets/new/pulse-birthday-video-poster.jpg`}>
                      <source src={`${BASE}/assets/new/pulse-birthday-video.mp4`} type="video/mp4" />
                    </video>
                  </div>
                </figure>

                {/* Card 4 — circle video */}
                <figure className="g-card">
                  <div className="g-visual g-pulse-circle">
                    <video autoPlay muted loop playsInline preload="none"
                      poster={`${BASE}/assets/new/pulse-circle-video-poster.jpg`}>
                      <source src={`${BASE}/assets/new/pulse-circle-video.mp4`} type="video/mp4" />
                    </video>
                  </div>
                </figure>

                {/* Card 5 — NDA */}
                <figure className="g-card">
                  <div className="g-visual g-pulse-nda"><span>NDA</span></div>
                </figure>
              </div>
            </article>

            {/* ══ SKILLAZ ══ */}
            <article className="g-case g-skillaz" data-case-stack-section>
              <aside className="g-info">
                <div className="g-heading">
                  <div className="g-logo g-logo-sq"><img src={`${BASE}/assets/new/skillaz-logo.png`} alt="" /></div>
                  <h2 className="g-title">Skillaz</h2>
                  <p className="g-role">Team Lead Product Designer</p>
                  <p className="g-lead">HR-tech платформа для корпоративного подбора и онбординга сотрудников</p>
                </div>
                <div className="g-desc">
                  <p>Построил направление продуктового дизайна и выстроил процессы внутри продуктовой команды: дизайн-ревью, пользовательские исследования и систему оценки компетенций дизайнеров.</p>
                  <p>Работал над enterprise HR-сценариями и корпоративными платформами для компаний уровня Nestlé, Unilever и HeadHunter.</p>
                </div>
                <div className="g-results">
                  {[
                    'сформировал команду из 3 дизайнеров',
                    'внедрил регулярные дизайн-ревью',
                    'внедрил пользовательские исследования в продуктовую разработку',
                    'запустил корпоративный портал для HeadHunter, Nestle, Unilever',
                  ].map(t => (
                    <div key={t} className="g-result">
                      <img src={`${BASE}/assets/new/skillaz-bullet.svg`} alt="" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="g-visuals" data-case-stack>
                {/* Card 1 — hero video */}
                <figure className="g-card">
                  <div className="g-visual g-skillaz-top">
                    <video className="g-skillaz-video" autoPlay muted loop playsInline preload="none"
                      poster={`${BASE}/assets/new/skillaz-first-card-video-poster.jpg`}>
                      <source src={`${BASE}/assets/new/skillaz-first-card-video.mp4`} type="video/mp4" />
                    </video>
                  </div>
                </figure>

                {/* Card 2 */}
                <figure className="g-card">
                  <div className="g-visual g-skillaz-scroll">
                    <img src={`${BASE}/assets/new/skillaz-card-2.png`} alt="" loading="lazy" style={{ height: 589 }} />
                  </div>
                </figure>

                {/* Card 3 — split row */}
                <div className="g-card g-skillaz-row">
                  <div className="g-visual g-skillaz-split">
                    <img src={`${BASE}/assets/new/skillaz-card-3-left.png`} alt="" loading="lazy" />
                  </div>
                  <div className="g-visual g-skillaz-split">
                    <img src={`${BASE}/assets/new/skillaz-card-3-right.png`} alt="" loading="lazy" />
                  </div>
                </div>

                {/* Card 4 */}
                <figure className="g-card">
                  <div className="g-visual g-skillaz-scroll">
                    <img src={`${BASE}/assets/new/skillaz-card-4.png`} alt="" loading="lazy" style={{ height: 622 }} />
                  </div>
                </figure>

                {/* Card 5 */}
                <figure className="g-card">
                  <div className="g-visual g-skillaz-scroll">
                    <img src={`${BASE}/assets/new/skillaz-card-5.png`} alt="" loading="lazy" style={{ height: 721 }} />
                  </div>
                </figure>

                {/* Card 6 */}
                <figure className="g-card">
                  <div className="g-visual g-skillaz-scroll">
                    <img src={`${BASE}/assets/new/skillaz-card-6.png`} alt="" loading="lazy" style={{ height: 451 }} />
                  </div>
                </figure>

                {/* Card 7 — icon + wide */}
                <div className="g-card g-skillaz-row">
                  <div className="g-visual g-skillaz-compact g-skillaz-icon">
                    <img src={`${BASE}/assets/new/skillaz-card-7-left.png`} alt="" loading="lazy" />
                  </div>
                  <div className="g-visual g-skillaz-compact g-skillaz-wide">
                    <img src={`${BASE}/assets/new/skillaz-card-7-right.png`} alt="" loading="lazy" />
                  </div>
                </div>

                {/* Card 8 — banner */}
                <figure className="g-card">
                  <div className="g-visual g-skillaz-banner">
                    <img src={`${BASE}/assets/new/skillaz-card-8.png`} alt="" loading="lazy" />
                  </div>
                </figure>
              </div>
            </article>

          </main>
        </div>
      </div>
    </>
  );
}
