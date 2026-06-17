'use client';
import { useEffect, useRef, useState } from 'react';

const CYCLE = 14000;

/* ── Sliding tasks ── */
const TASKS = [
  {
    badge: 'сегодня', badgeIcon: '🔥', count: 5,
    title: 'согласуйте отпуска у 3 сотрудников',
    sub: 'Евгений Елистратов, Артем Евтушенко и Григорий Лепс',
    avs: ['#9334ea','#ea4335','#0f766e'],
    avl: ['Е','А','Г'],
    btn: 'согласовать все',
  },
  {
    badge: 'до 18:00', badgeIcon: '🔥', count: 2,
    title: 'утвердите смету на offsite команды',
    sub: 'Марина Андреева и Денис Ковалев ждут подтверждения бюджета',
    avs: ['#4285f4','#fbbc04'],
    avl: ['М','Д'],
    btn: 'открыть смету',
  },
  {
    badge: 'сегодня', badgeIcon: '🔥', count: 3,
    title: 'подтвердите доступы для 2 подрядчиков',
    sub: 'Нужно проверить NDA, роли в Jira и доступ к общему диску',
    avs: ['#ea4335','#34a853','#4285f4'],
    avl: ['А','Г','Е'],
    btn: 'проверить всё',
  },
];

/* Concentric‑circle avatar data */
const RING_AVUS = [
  { r: 72, angle: -30,  bg: '#c084fc', initials: 'А', size: 52 },
  { r: 72, angle: 110,  bg: '#38bdf8', initials: 'М', size: 44 },
  { r: 38, angle: 60,   bg: '#fb923c', initials: 'В', size: 38 },
  { r: 105,angle: 60,   bg: '#4ade80', initials: 'Н', size: 38 },
  { r: 105,angle: -110, bg: '#f472b6', initials: 'К', size: 34 },
];

export function PulseDashboard() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setKey(k => k + 1), CYCLE);
    return () => clearInterval(t);
  }, []);
  return <Dashboard key={key} />;
}

function Dashboard() {
  const [step, setStep]   = useState(0);
  const [slide, setSlide] = useState(0);          // 0,1,2 → current task card
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Count-up numbers */
  useEffect(() => {
    let s = 0;
    const iv = setInterval(() => { s++; setStep(s); if (s >= 12) clearInterval(iv); }, 90);
    return () => clearInterval(iv);
  }, []);

  /* Auto-advance task slide: 2.2s → slide1, 4.4s → slide2 */
  useEffect(() => {
    slideTimer.current = setTimeout(() => setSlide(1), 2200);
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current); };
  }, []);
  useEffect(() => {
    if (slide === 1) {
      slideTimer.current = setTimeout(() => setSlide(2), 2200);
      return () => { if (slideTimer.current) clearTimeout(slideTimer.current); };
    }
  }, [slide]);

  /* Drag-to-slide on task card */
  const onMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    setDragging(true);
  };
  useEffect(() => {
    if (!dragging) return;
    const up = (e: MouseEvent) => {
      const dx = e.clientX - dragStartX.current;
      if (dx < -30) setSlide(s => Math.min(s + 1, TASKS.length - 1));
      if (dx > 30)  setSlide(s => Math.max(s - 1, 0));
      setDragging(false);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [dragging]);

  const tasks     = Math.min(Math.round(step * 0.38), 4);
  const meetings  = Math.min(Math.round(step * 0.38), 4);
  const reminders = step >= 11 ? 1 : 0;
  const task      = TASKS[slide];

  return (
    <>
      <style>{`
        @keyframes pd-in  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pd-fade{ from{opacity:0} to{opacity:1} }
        @keyframes pd-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes pd-pulse-ring { 0%{transform:scale(.7);opacity:.6} 100%{transform:scale(1.45);opacity:0} }
        @keyframes pd-orbit { from{transform:rotate(0deg) translateX(var(--r)) rotate(0deg)} to{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg)} }

        .pd { width:740px; height:444px; background:#0d0d12;
              font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
              font-size:13px; color:#f0f0f4; display:flex; flex-direction:column;
              overflow:hidden; border-radius:16px; }

        /* Header */
        .pd-hdr { height:50px; background:#111118; border-bottom:1px solid rgba(255,255,255,.07);
                  display:flex; align-items:center; padding:0 16px; gap:10px; flex-shrink:0;
                  opacity:0; animation:pd-fade .25s .05s ease forwards; }
        .pd-hbg { width:30px; height:30px; display:flex; flex-direction:column;
                  align-items:center; justify-content:center; gap:4px; cursor:pointer; }
        .pd-hbg span { display:block; width:15px; height:1.5px; background:rgba(255,255,255,.45); border-radius:1px; }
        .pd-logo { font-size:16px; font-weight:800; color:#4d90fe; letter-spacing:-.5px; }
        .pd-hsp { flex:1; }
        .pd-icon { width:30px; height:30px; border-radius:50%; display:flex; align-items:center;
                   justify-content:center; color:rgba(255,255,255,.45); cursor:pointer; }
        .pd-icon:hover { background:rgba(255,255,255,.07); }
        .pd-ava-hdr { width:30px; height:30px; border-radius:50%; background:#4d90fe;
                      display:flex; align-items:center; justify-content:center;
                      color:#fff; font-weight:700; font-size:12px; cursor:pointer; }

        /* Body */
        .pd-body { flex:1; padding:11px 16px 8px; display:flex; flex-direction:column; gap:9px; overflow:hidden; }

        /* Heading */
        .pd-hdg { opacity:0; animation:pd-in .4s .18s ease forwards; flex-shrink:0; }
        .pd-hdg h1 { margin:0; font-size:14px; font-weight:700; line-height:1.3; color:#f0f0f4; }
        .pd-hdg h1 b { color:#4d90fe; font-weight:700; }
        .pd-hdg p { margin:2px 0 0; font-size:10px; color:rgba(255,255,255,.35); line-height:1.4; }

        /* Main grid */
        .pd-grid1 { display:grid; grid-template-columns:1fr 1fr 1fr 144px; gap:7px; }
        .pd-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:7px; }

        /* Cards */
        .pd-card { background:#1c1c28; border-radius:12px; padding:11px 11px 10px; display:flex;
                   flex-direction:column; gap:5px; border:1px solid rgba(255,255,255,.06);
                   opacity:0; overflow:hidden; }
        .pd-card-title { font-size:11.5px; font-weight:600; line-height:1.3; color:#f0f0f4; }
        .pd-card-sub { font-size:10px; color:rgba(255,255,255,.4); line-height:1.35; }
        .pd-card-meta { font-size:9.5px; color:rgba(255,255,255,.4); display:flex; align-items:center; gap:3px; }

        /* Badges */
        .pd-badge-o { display:inline-flex; align-items:center; gap:4px;
                      background:rgba(255,143,64,.15); color:#ff9840; border-radius:20px;
                      padding:2px 7px; font-size:9.5px; font-weight:600; }
        .pd-badge-b { display:inline-flex; align-items:center; gap:3px;
                      background:rgba(77,144,254,.15); color:#4d90fe; border-radius:20px;
                      padding:2px 7px; font-size:9.5px; font-weight:600; }
        .pd-live { animation:pd-dot 1.4s ease infinite; }
        .pd-cnt  { font-size:10.5px; color:rgba(255,255,255,.35); font-weight:600; }

        /* Slide transition */
        .pd-slide-inner { transition:opacity .22s ease,transform .22s ease; }
        .pd-slide-exit  { opacity:0; transform:translateX(-12px); }
        .pd-slide-enter { opacity:0; transform:translateX(12px); }

        /* Dots */
        .pd-dots { display:flex; gap:5px; align-items:center; margin-top:auto; padding-top:4px; }
        .pd-dot-i { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,.2); transition:all .2s; cursor:pointer; }
        .pd-dot-i.active { background:#4d90fe; width:14px; border-radius:3px; }

        /* Avatars */
        .pd-avs { display:flex; }
        .pd-av { width:18px; height:18px; border-radius:50%; border:2px solid #1c1c28;
                 margin-left:-4px; font-size:7px; display:flex; align-items:center;
                 justify-content:center; font-weight:700; color:#fff; }
        .pd-av:first-child { margin-left:0; }

        /* Buttons */
        .pd-btn-pri { background:#4d90fe; color:#fff; border:none; border-radius:8px;
                      padding:5px 10px; font-size:10.5px; font-weight:600; cursor:pointer;
                      text-align:center; width:100%; margin-top:auto; }
        .pd-btn-out { background:transparent; color:#4d90fe; border:1.5px solid rgba(77,144,254,.4);
                      border-radius:8px; padding:5px 10px; font-size:10.5px; font-weight:600;
                      cursor:pointer; text-align:center; width:100%; margin-top:auto; }

        /* Birthday */
        .pd-bday { width:36px; height:36px; border-radius:50%;
                   background:linear-gradient(135deg,#c084fc,#60a5fa);
                   display:flex; align-items:center; justify-content:center; font-size:17px; }

        /* Quick links */
        .pd-links { display:flex; flex-direction:column; gap:5px; }
        .pd-link { background:#1c1c28; border:1px solid rgba(255,255,255,.06); border-radius:9px;
                   padding:7px 9px; font-size:10px; font-weight:500;
                   display:flex; align-items:center; justify-content:space-between;
                   cursor:pointer; color:#d0d0e0; opacity:0; }
        .pd-link:hover { background:#252535; }

        /* Social / circle */
        .pd-srow { display:flex; justify-content:space-between; align-items:center; }
        .pd-slbl { font-size:10px; color:rgba(255,255,255,.38); }
        .pd-scnt { font-size:10px; font-weight:700; }
        .pd-scnt.pos { color:#4ade80; }
        .pd-scnt.neg { color:#f87171; }

        /* Concentric-ring avatars */
        .pd-orbit-wrap { position:relative; width:120px; height:120px; flex-shrink:0; }
        .pd-orbit-ring { position:absolute; top:50%; left:50%; border-radius:50%;
                         border:1px solid rgba(255,255,255,.06); transform:translate(-50%,-50%); }
        .pd-orbit-pulse { position:absolute; top:50%; left:50%; border-radius:50%;
                          border:1px solid rgba(77,144,254,.4);
                          transform:translate(-50%,-50%);
                          animation:pd-pulse-ring 2.8s ease-out infinite; }
        .pd-orbit-av { position:absolute; top:50%; left:50%;
                       border-radius:50%; border:2px solid #1c1c28;
                       display:flex; align-items:center; justify-content:center;
                       font-size:9px; font-weight:700; color:#fff;
                       transform-origin:center center; }
        .pd-orbit-center { position:absolute; top:50%; left:50%;
                           transform:translate(-50%,-50%);
                           width:32px; height:32px; border-radius:50%;
                           background:#4d90fe; display:flex; align-items:center;
                           justify-content:center; font-size:11px; font-weight:700;
                           color:#fff; border:2px solid #1c1c28; }

        /* News card */
        .pd-news { display:flex; gap:10px; align-items:stretch; }
        .pd-news-photo { flex-shrink:0; width:88px; border-radius:8px; overflow:hidden;
                         background:linear-gradient(160deg,#1a2d50,#2563eb 55%,#7c3aed);
                         display:flex; align-items:flex-end; justify-content:center;
                         min-height:68px; }
        .pd-news-photo-fig { width:54px; height:60px;
                             background:linear-gradient(180deg,#3b82f6,#60a5fa);
                             border-radius:50% 50% 0 0 / 60% 60% 0 0;
                             position:relative; top:8px; }
        .pd-news-text { display:flex; flex-direction:column; gap:3px; flex:1; }
        .pd-news-tag { font-size:8.5px; font-weight:700; color:rgba(255,255,255,.35);
                       letter-spacing:.7px; text-transform:uppercase; }
        .pd-news-title { font-size:11px; font-weight:600; line-height:1.35; color:#f0f0f4; }

        /* Bottom */
        .pd-btm { height:38px; background:#111118; border-top:1px solid rgba(255,255,255,.07);
                  flex-shrink:0; display:flex; align-items:center; padding:0 14px; gap:8px;
                  opacity:0; animation:pd-fade .3s 1.1s ease forwards; }
        .pd-srch { flex:1; background:rgba(255,255,255,.07); border-radius:8px; height:24px;
                   display:flex; align-items:center; padding:0 10px; gap:6px;
                   font-size:10.5px; color:rgba(255,255,255,.3); }
        .pd-ai { display:flex; align-items:center; gap:5px; font-size:10.5px;
                 color:rgba(255,255,255,.4); white-space:nowrap; }
        .pd-ai-spark { color:#4d90fe; }
        .pd-toggle { width:26px; height:15px; background:#4d90fe; border-radius:8px;
                     display:flex; align-items:center; padding:0 2px; }
        .pd-tdot { width:11px; height:11px; background:#fff; border-radius:50%; margin-left:auto; }

        /* Stagger */
        .pd-c0 { animation:pd-in .4s .32s ease forwards; }
        .pd-c1 { animation:pd-in .4s .46s ease forwards; }
        .pd-c2 { animation:pd-in .4s .60s ease forwards; }
        .pd-l0 { animation:pd-in .32s .36s ease forwards; }
        .pd-l1 { animation:pd-in .32s .46s ease forwards; }
        .pd-l2 { animation:pd-in .32s .56s ease forwards; }
        .pd-l3 { animation:pd-in .32s .66s ease forwards; }
        .pd-b0 { animation:pd-in .4s .76s ease forwards; }
        .pd-b1 { animation:pd-in .4s .88s ease forwards; }
      `}</style>

      <div className="pd">
        {/* ── Header ── */}
        <header className="pd-hdr">
          <div className="pd-hbg"><span /><span /><span /></div>
          <span className="pd-logo">ПУЛЬС</span>
          <span className="pd-hsp" />
          <div className="pd-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div className="pd-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div className="pd-ava-hdr">А</div>
        </header>

        {/* ── Body ── */}
        <div className="pd-body">

          {/* Heading */}
          <div className="pd-hdg">
            <h1>
              Сегодня&nbsp;<b>{tasks} задачи</b>,&nbsp;<b>{meetings} встречи</b>&nbsp;и&nbsp;<b>{reminders} напоминание</b>
            </h1>
            <p>Возможности не приходят сами — вы создаете их. — Крис Гроссер.</p>
          </div>

          {/* Main 4-col grid */}
          <div className="pd-grid1">

            {/* Meeting card */}
            <div className="pd-card pd-c0">
              <span className="pd-badge-o"><span className="pd-live">●</span> через 25 мин</span>
              <div className="pd-card-title">менеджерский синк по дизайн системе</div>
              <div className="pd-card-meta">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                16:30 → 17:30
              </div>
              <div className="pd-card-meta">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                А.19.02 +jazz
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto'}}>
                <div className="pd-avs">
                  {['#4285f4','#ea4335','#34a853'].map((c,i) => (
                    <div key={i} className="pd-av" style={{background:c}}>{['Е','А','Г'][i]}</div>
                  ))}
                </div>
                <button className="pd-btn-out" style={{width:'auto',display:'flex',alignItems:'center',gap:3,padding:'4px 8px',fontSize:9.5}}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Подключиться
                </button>
              </div>
            </div>

            {/* Task slider card */}
            <div className="pd-card pd-c1" onMouseDown={onMouseDown} style={{cursor:'grab',userSelect:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span className="pd-badge-b">{task.badgeIcon} {task.badge}</span>
                <span className="pd-cnt">{task.count}</span>
              </div>
              <div className="pd-card-title" style={{transition:'opacity .2s'}}>{task.title}</div>
              <div className="pd-card-sub">{task.sub}</div>
              <div className="pd-avs">
                {task.avs.map((c,i) => (
                  <div key={i} className="pd-av" style={{background:c}}>{task.avl[i]}</div>
                ))}
              </div>
              <button className="pd-btn-pri" style={{marginTop:'auto'}}>{task.btn}</button>
              <div className="pd-dots">
                {TASKS.map((_,i) => (
                  <div key={i} className={`pd-dot-i${i===slide?' active':''}`}
                    onClick={() => setSlide(i)} />
                ))}
              </div>
            </div>

            {/* Birthday card */}
            <div className="pd-card pd-c2">
              <div className="pd-bday">🎂</div>
              <div className="pd-card-title" style={{marginTop:2}}>У Андрея скоро день рождения!</div>
              <button className="pd-btn-out">Поздравить</button>
            </div>

            {/* Quick links */}
            <div className="pd-links">
              {[
                { icon:'💳', label:'доход и льготы', cls:'pd-l0' },
                { icon:'❤️', label:'мое здоровье',   cls:'pd-l1' },
                { icon:'📊', label:'аналитика',      cls:'pd-l2' },
                { icon:'📄', label:'справки',        cls:'pd-l3' },
              ].map(l => (
                <div key={l.label} className={`pd-link ${l.cls}`}>
                  <span style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:11}}>{l.icon}</span>
                    <span>{l.label}</span>
                  </span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 2-col row */}
          <div className="pd-grid2">

            {/* Social — concentric ring avatars */}
            <div className="pd-card pd-b0" style={{flexDirection:'row',gap:10,padding:'10px 11px',alignItems:'center'}}>
              <div style={{flex:1,minWidth:0}}>
                <div className="pd-card-title" style={{marginBottom:6}}>круг общения</div>
                {[
                  {l:'моя команда',      c:'+24', pos:true},
                  {l:'смежные команды',  c:'+12', pos:true},
                  {l:'внешние заказчики',c:'↓ 12', pos:false},
                ].map(r => (
                  <div key={r.l} className="pd-srow">
                    <span className="pd-slbl">{r.l}</span>
                    <span className={`pd-scnt ${r.pos?'pos':'neg'}`}>{r.c}</span>
                  </div>
                ))}
              </div>

              {/* Concentric rings */}
              <div className="pd-orbit-wrap">
                {/* rings */}
                {[40,76,112].map(d => (
                  <div key={d} className="pd-orbit-ring" style={{width:d,height:d}} />
                ))}
                {/* pulsing ring */}
                <div className="pd-orbit-pulse" style={{width:40,height:40}} />
                {/* center */}
                <div className="pd-orbit-center">Я</div>
                {/* avatars on rings */}
                {RING_AVUS.map((a,i) => {
                  const rad = (a.angle * Math.PI) / 180;
                  const x = Math.cos(rad) * a.r;
                  const y = Math.sin(rad) * a.r;
                  return (
                    <div key={i} className="pd-orbit-av" style={{
                      width: a.size, height: a.size,
                      background: a.bg,
                      fontSize: a.size > 44 ? 11 : 9,
                      marginLeft: -a.size/2,
                      marginTop:  -a.size/2,
                      transform: `translate(${x}px,${y}px)`,
                    }}>
                      {a.initials}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* News — horizontal: photo right */}
            <div className="pd-card pd-b1">
              <span className="pd-news-tag">Новости</span>
              <div className="pd-news">
                <div className="pd-news-text">
                  <div className="pd-news-title">
                    Греф назвал планируемый объем дивидендов «Сбера» по итогам 2025 года
                  </div>
                </div>
                <div className="pd-news-photo">
                  <div className="pd-news-photo-fig" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom search bar ── */}
        <div className="pd-btm">
          <div className="pd-srch">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            введите ваш запрос
          </div>
          <div className="pd-ai">
            <span className="pd-ai-spark">✦</span> Пульс AI
            <div className="pd-toggle"><div className="pd-tdot" /></div>
          </div>
        </div>
      </div>
    </>
  );
}
