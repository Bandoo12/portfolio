'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const CYCLE = 18000;

/* ── Task slider data ── */
const TASKS = [
  { badge:'сегодня', count:5, title:'согласуйте отпуска у 3 сотрудников',
    sub:'Евгений Елистратов, Артем Евтушенко и Григорий Лепс',
    avs:['#9334ea','#ea4335','#0f766e'], avl:['Е','А','Г'], btn:'согласовать все' },
  { badge:'до 18:00', count:2, title:'утвердите смету на offsite команды',
    sub:'Марина Андреева и Денис Ковалев ждут подтверждения бюджета',
    avs:['#4285f4','#fbbc04'], avl:['М','Д'], btn:'открыть смету' },
  { badge:'сегодня', count:3, title:'подтвердите доступы для 2 подрядчиков',
    sub:'Нужно проверить NDA, роли в Jira и доступ к общему диску',
    avs:['#ea4335','#34a853','#4285f4'], avl:['А','Г','Е'], btn:'проверить всё' },
];

/* ── Ring avatars ── */
const RING = [
  { r:72,  a:-30,  bg:'#c084fc', l:'А', s:52 },
  { r:72,  a:110,  bg:'#38bdf8', l:'М', s:44 },
  { r:38,  a:60,   bg:'#fb923c', l:'В', s:38 },
  { r:105, a:60,   bg:'#4ade80', l:'Н', s:38 },
  { r:105, a:-110, bg:'#f472b6', l:'К', s:34 },
];

/* ── Card IDs ── */
type CardId = 'meeting'|'task'|'birthday'|'social'|'news';
const INITIAL_ORDER: CardId[] = ['meeting','task','birthday','social','news'];

/* ═══════════════════════════════════════════════════════ */
export function PulseDashboard() {
  const [k, setK] = useState(0);
  useEffect(() => { const t = setInterval(() => setK(n=>n+1), CYCLE); return ()=>clearInterval(t); }, []);
  return <Dashboard key={k} />;
}
/* ═══════════════════════════════════════════════════════ */

function Dashboard() {
  /* count-up */
  const [step, setStep] = useState(0);
  useEffect(() => {
    let s=0; const iv=setInterval(()=>{ s++; setStep(s); if(s>=12)clearInterval(iv); },90);
    return ()=>clearInterval(iv);
  }, []);

  /* task slider */
  const [slide, setSlide] = useState(0);
  const slideRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(() => {
    slideRef.current = setTimeout(()=>setSlide(1), 2400);
    return ()=>{ if(slideRef.current) clearTimeout(slideRef.current); };
  }, []);
  useEffect(() => {
    if(slide===1){ slideRef.current=setTimeout(()=>setSlide(2),2400); return ()=>{ if(slideRef.current)clearTimeout(slideRef.current); }; }
  }, [slide]);

  /* task drag */
  const taskDragX = useRef(0);
  const onTaskDown = (e: React.MouseEvent) => { taskDragX.current=e.clientX; };
  useEffect(() => {
    const up=(e:MouseEvent)=>{
      const dx=e.clientX-taskDragX.current;
      if(dx<-28) setSlide(s=>Math.min(s+1,TASKS.length-1));
      if(dx>28)  setSlide(s=>Math.max(s-1,0));
    };
    window.addEventListener('mouseup',up);
    return ()=>window.removeEventListener('mouseup',up);
  }, []);

  /* ── CARD DRAG-AND-DROP ── */
  const [order, setOrder]         = useState<CardId[]>(INITIAL_ORDER);
  const [dragging, setDragging]   = useState<CardId|null>(null);
  const [dropTarget, setDropTgt]  = useState<CardId|null>(null);
  const [ghostPos, setGhostPos]   = useState({x:0,y:0});
  const [ghostSize, setGhostSize] = useState({w:0,h:0});

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs     = useRef<Partial<Record<CardId,HTMLElement|null>>>({});
  const dragOff      = useRef({ox:0, oy:0});
  const isDragging   = useRef(false);

  const startCardDrag = useCallback((id:CardId, e:React.MouseEvent) => {
    e.preventDefault();
    const el    = cardRefs.current[id];
    const wrap  = containerRef.current;
    if(!el||!wrap) return;
    const cr  = el.getBoundingClientRect();
    const wr  = wrap.getBoundingClientRect();
    dragOff.current = { ox: e.clientX-cr.left, oy: e.clientY-cr.top };
    setGhostSize({ w:cr.width, h:cr.height });
    setGhostPos({ x:cr.left-wr.left, y:cr.top-wr.top });
    setDragging(id);
    isDragging.current = true;
  }, []);

  useEffect(() => {
    if(!dragging) return;
    const wrap = containerRef.current;
    if(!wrap) return;
    const wr = wrap.getBoundingClientRect();

    const onMove = (e:MouseEvent) => {
      if(!isDragging.current) return;
      setGhostPos({ x:e.clientX-wr.left-dragOff.current.ox, y:e.clientY-wr.top-dragOff.current.oy });

      // find closest card slot
      let best:CardId|null=null, bestD=Infinity;
      (Object.keys(cardRefs.current) as CardId[]).forEach(cid => {
        if(cid===dragging) return;
        const cel = cardRefs.current[cid];
        if(!cel) return;
        const cr = cel.getBoundingClientRect();
        const cx = cr.left+cr.width/2, cy = cr.top+cr.height/2;
        const d  = Math.hypot(e.clientX-cx, e.clientY-cy);
        if(d<bestD){ bestD=d; best=cid; }
      });
      setDropTgt(bestD<90 ? best : null);
    };

    const onUp = () => {
      isDragging.current = false;
      if(dropTarget){
        setOrder(prev => {
          const arr=[...prev];
          const ai=arr.indexOf(dragging!), bi=arr.indexOf(dropTarget);
          [arr[ai],arr[bi]]=[arr[bi],arr[ai]];
          return arr;
        });
      }
      setDragging(null); setDropTgt(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [dragging, dropTarget]);

  /* ── helpers ── */
  const tasks = Math.min(Math.round(step*0.38),4);
  const meets = Math.min(Math.round(step*0.38),4);
  const rems  = step>=11?1:0;
  const task  = TASKS[slide];

  /* ── Render card by ID ── */
  const renderCard = (id:CardId, animCls:string) => {
    const isGhost = dragging===id;
    const isTarget = dropTarget===id;
    const ref = (el:HTMLElement|null)=>{ cardRefs.current[id]=el; };

    const wrapStyle: React.CSSProperties = {
      opacity: isGhost ? 0 : 1,
      outline: isTarget ? '2px dashed rgba(77,144,254,.6)' : 'none',
      outlineOffset: 2,
      borderRadius: 12,
      transition: 'opacity .15s',
    };

    const cardProps = {
      ref,
      onMouseDown: (e:React.MouseEvent)=>startCardDrag(id,e),
      style:{ cursor: dragging ? 'grabbing' : 'grab' } as React.CSSProperties,
    };

    if(id==='meeting') return (
      <div key="meeting" style={wrapStyle}>
        <div className={`pd-card ${animCls}`} {...cardProps}>
          <div className="pd-dh">⠿</div>
          <span className="pd-badge-o"><span className="pd-live">●</span> через 25 мин</span>
          <div className="pd-card-title">менеджерский синк по дизайн системе</div>
          <div className="pd-card-meta"><ClockIcon/> 16:30 → 17:30</div>
          <div className="pd-card-meta"><PinIcon/> А.19.02 +jazz</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto'}}>
            <Avs cs={['#4285f4','#ea4335','#34a853']} ls={['Е','А','Г']}/>
            <button className="pd-btn-out" style={{width:'auto',display:'flex',alignItems:'center',gap:3,padding:'4px 8px',fontSize:9.5}}>
              <VideoIcon/> Подключиться
            </button>
          </div>
        </div>
      </div>
    );

    if(id==='task') return (
      <div key="task" style={wrapStyle}>
        <div className={`pd-card ${animCls}`} {...cardProps}
          onMouseDown={(e)=>{ startCardDrag('task',e); onTaskDown(e); }}>
          <div className="pd-dh">⠿</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span className="pd-badge-b">🔥 {task.badge}</span>
            <span className="pd-cnt">{task.count}</span>
          </div>
          <div className="pd-card-title">{task.title}</div>
          <div className="pd-card-sub">{task.sub}</div>
          <Avs cs={task.avs} ls={task.avl}/>
          <button className="pd-btn-pri" style={{marginTop:'auto'}}>{task.btn}</button>
          <div className="pd-dots">
            {TASKS.map((_,i)=><div key={i} className={`pd-dot-i${i===slide?' active':''}`} onClick={()=>setSlide(i)}/>)}
          </div>
        </div>
      </div>
    );

    if(id==='birthday') return (
      <div key="birthday" style={wrapStyle}>
        <div className={`pd-card ${animCls}`} {...cardProps}>
          <div className="pd-dh">⠿</div>
          <div className="pd-bday">🎂</div>
          <div className="pd-card-title" style={{marginTop:2}}>У Андрея скоро день рождения!</div>
          <button className="pd-btn-out">Поздравить</button>
        </div>
      </div>
    );

    if(id==='social') return (
      <div key="social" style={wrapStyle}>
        <div className={`pd-card ${animCls}`} {...cardProps} style={{...cardProps.style,flexDirection:'row',gap:10,padding:'10px 11px',alignItems:'center'}}>
          <div className="pd-dh" style={{position:'absolute',top:8,right:8}}>⠿</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="pd-card-title" style={{marginBottom:6}}>круг общения</div>
            {[{l:'моя команда',c:'+24',pos:true},{l:'смежные команды',c:'+12',pos:true},{l:'внешние заказчики',c:'↓ 12',pos:false}]
              .map(r=>(
              <div key={r.l} className="pd-srow">
                <span className="pd-slbl">{r.l}</span>
                <span className={`pd-scnt ${r.pos?'pos':'neg'}`}>{r.c}</span>
              </div>
            ))}
          </div>
          <RingAvs/>
        </div>
      </div>
    );

    if(id==='news') return (
      <div key="news" style={wrapStyle}>
        <div className={`pd-card ${animCls}`} {...cardProps}>
          <div className="pd-dh">⠿</div>
          <span className="pd-news-tag">Новости</span>
          <div className="pd-news">
            <div className="pd-news-text">
              <div className="pd-news-title">Греф назвал планируемый объем дивидендов «Сбера» по итогам 2025 года</div>
            </div>
            <div className="pd-news-photo"><div className="pd-news-fig"/></div>
          </div>
        </div>
      </div>
    );

    return null;
  };

  /* Layout: first 3 in top row, last 2 in bottom row */
  const [top1,top2,top3,bot1,bot2] = order;

  return (
    <>
      <style>{`
        @keyframes pd-in   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pd-fade { from{opacity:0} to{opacity:1} }
        @keyframes pd-dot  { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes pd-ring { 0%{transform:translate(-50%,-50%) scale(.7);opacity:.6} 100%{transform:translate(-50%,-50%) scale(1.6);opacity:0} }

        .pd { width:740px; height:444px; background:#0d0d12; position:relative;
              font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
              font-size:13px; color:#f0f0f4; display:flex; flex-direction:column;
              overflow:hidden; border-radius:16px; }

        /* drag overlay */
        .pd-drag-dim { position:absolute; inset:0; background:rgba(0,0,0,.28);
                       pointer-events:none; z-index:20; transition:opacity .15s; }
        .pd-delete-zone { position:absolute; bottom:38px; left:0; right:0; height:44px;
                          background:rgba(239,68,68,.18); border-top:1px solid rgba(239,68,68,.4);
                          display:flex; align-items:center; justify-content:center;
                          gap:8px; font-size:12px; color:#f87171; font-weight:600;
                          pointer-events:none; z-index:21; }
        .pd-ghost { position:absolute; z-index:30; pointer-events:none;
                    filter:drop-shadow(0 12px 32px rgba(0,0,0,.55));
                    transform:rotate(1.5deg) scale(1.03); transition:none; }
        .pd-ghost .pd-card { opacity:.96; }

        /* drag handle */
        .pd-dh { position:absolute; top:7px; right:8px; font-size:11px; opacity:0;
                 color:rgba(255,255,255,.3); line-height:1; pointer-events:none;
                 transition:opacity .15s; }
        .pd-card:hover .pd-dh { opacity:1; }

        /* Header */
        .pd-hdr { height:50px; background:#111118; border-bottom:1px solid rgba(255,255,255,.07);
                  display:flex; align-items:center; padding:0 16px; gap:10px; flex-shrink:0;
                  opacity:0; animation:pd-fade .25s .05s ease forwards; position:relative; z-index:10; }
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
        .pd-body { flex:1; padding:11px 16px 8px; display:flex; flex-direction:column; gap:9px; overflow:hidden; position:relative; z-index:5; }

        /* Heading */
        .pd-hdg { opacity:0; animation:pd-in .4s .18s ease forwards; flex-shrink:0; }
        .pd-hdg h1 { margin:0; font-size:14px; font-weight:700; line-height:1.3; }
        .pd-hdg h1 b { color:#4d90fe; }
        .pd-hdg p { margin:2px 0 0; font-size:10px; color:rgba(255,255,255,.35); line-height:1.4; }

        /* Grid */
        .pd-grid1 { display:grid; grid-template-columns:1fr 1fr 1fr 144px; gap:7px; }
        .pd-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:7px; }

        /* Cards */
        .pd-card { background:#1c1c28; border-radius:12px; padding:11px 11px 10px; display:flex;
                   flex-direction:column; gap:5px; border:1px solid rgba(255,255,255,.06);
                   opacity:0; position:relative; }
        .pd-card:hover { border-color:rgba(255,255,255,.1); }
        .pd-card-title { font-size:11.5px; font-weight:600; line-height:1.3; }
        .pd-card-sub   { font-size:10px; color:rgba(255,255,255,.4); line-height:1.35; }
        .pd-card-meta  { font-size:9.5px; color:rgba(255,255,255,.4); display:flex; align-items:center; gap:3px; }

        /* Badges */
        .pd-badge-o { display:inline-flex; align-items:center; gap:4px;
                      background:rgba(255,143,64,.15); color:#ff9840; border-radius:20px;
                      padding:2px 7px; font-size:9.5px; font-weight:600; width:fit-content; }
        .pd-badge-b { display:inline-flex; align-items:center; gap:3px;
                      background:rgba(77,144,254,.15); color:#4d90fe; border-radius:20px;
                      padding:2px 7px; font-size:9.5px; font-weight:600; width:fit-content; }
        .pd-live { animation:pd-dot 1.4s ease infinite; }
        .pd-cnt  { font-size:10.5px; color:rgba(255,255,255,.35); font-weight:600; }

        /* Dots */
        .pd-dots  { display:flex; gap:5px; align-items:center; margin-top:2px; }
        .pd-dot-i { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,.2); transition:all .2s; cursor:pointer; }
        .pd-dot-i.active { background:#4d90fe; width:14px; border-radius:3px; }

        /* Avatars */
        .pd-avs { display:flex; }
        .pd-av  { width:18px; height:18px; border-radius:50%; border:2px solid #1c1c28;
                  margin-left:-4px; font-size:7px; display:flex; align-items:center;
                  justify-content:center; font-weight:700; color:#fff; }
        .pd-av:first-child { margin-left:0; }

        /* Buttons */
        .pd-btn-pri { background:#4d90fe; color:#fff; border:none; border-radius:8px;
                      padding:5px 10px; font-size:10.5px; font-weight:600; cursor:pointer;
                      text-align:center; width:100%; }
        .pd-btn-out { background:transparent; color:#4d90fe; border:1.5px solid rgba(77,144,254,.4);
                      border-radius:8px; padding:5px 10px; font-size:10.5px; font-weight:600;
                      cursor:pointer; text-align:center; width:100%; }

        /* Birthday */
        .pd-bday { width:36px; height:36px; border-radius:50%;
                   background:linear-gradient(135deg,#c084fc,#60a5fa);
                   display:flex; align-items:center; justify-content:center; font-size:17px; }

        /* Quick links */
        .pd-links { display:flex; flex-direction:column; gap:5px; }
        .pd-link  { background:#1c1c28; border:1px solid rgba(255,255,255,.06); border-radius:9px;
                    padding:7px 9px; font-size:10px; font-weight:500;
                    display:flex; align-items:center; justify-content:space-between;
                    cursor:pointer; color:#d0d0e0; opacity:0; }

        /* Social */
        .pd-srow { display:flex; justify-content:space-between; align-items:center; }
        .pd-slbl { font-size:10px; color:rgba(255,255,255,.38); }
        .pd-scnt { font-size:10px; font-weight:700; }
        .pd-scnt.pos { color:#4ade80; }
        .pd-scnt.neg { color:#f87171; }

        /* Concentric rings */
        .pd-orbit-wrap { position:relative; width:118px; height:118px; flex-shrink:0; }
        .pd-orbit-ring { position:absolute; top:50%; left:50%; border-radius:50%;
                         border:1px solid rgba(255,255,255,.07);
                         transform:translate(-50%,-50%); }
        .pd-orbit-pulse { position:absolute; top:50%; left:50%; border-radius:50%;
                          border:1px solid rgba(77,144,254,.45);
                          animation:pd-ring 2.6s ease-out infinite; }
        .pd-orbit-center { position:absolute; top:50%; left:50%;
                           transform:translate(-50%,-50%);
                           width:30px; height:30px; border-radius:50%;
                           background:#4d90fe; display:flex; align-items:center;
                           justify-content:center; font-size:10px; font-weight:700;
                           color:#fff; border:2px solid #1c1c28; }
        .pd-orbit-av { position:absolute; border-radius:50%; border:2px solid #1c1c28;
                       display:flex; align-items:center; justify-content:center;
                       font-weight:700; color:#fff; }

        /* News */
        .pd-news       { display:flex; gap:10px; align-items:stretch; }
        .pd-news-photo { flex-shrink:0; width:82px; border-radius:8px; overflow:hidden;
                         background:linear-gradient(160deg,#1a2d50,#2563eb 55%,#7c3aed);
                         display:flex; align-items:flex-end; justify-content:center;
                         min-height:62px; }
        .pd-news-fig   { width:50px; height:58px; background:linear-gradient(180deg,#3b82f6,#93c5fd);
                         border-radius:50% 50% 0 0/60% 60% 0 0; position:relative; top:8px; }
        .pd-news-text  { display:flex; flex-direction:column; gap:3px; flex:1; }
        .pd-news-tag   { font-size:8.5px; font-weight:700; color:rgba(255,255,255,.35);
                         letter-spacing:.7px; text-transform:uppercase; }
        .pd-news-title { font-size:11px; font-weight:600; line-height:1.35; }

        /* Bottom */
        .pd-btm { height:38px; background:#111118; border-top:1px solid rgba(255,255,255,.07);
                  flex-shrink:0; display:flex; align-items:center; padding:0 14px; gap:8px;
                  opacity:0; animation:pd-fade .3s 1.1s ease forwards; position:relative; z-index:10; }
        .pd-srch { flex:1; background:rgba(255,255,255,.07); border-radius:8px; height:24px;
                   display:flex; align-items:center; padding:0 10px; gap:6px;
                   font-size:10.5px; color:rgba(255,255,255,.3); }
        .pd-ai   { display:flex; align-items:center; gap:5px; font-size:10.5px;
                   color:rgba(255,255,255,.4); white-space:nowrap; }
        .pd-toggle { width:26px; height:15px; background:#4d90fe; border-radius:8px;
                     display:flex; align-items:center; padding:0 2px; }
        .pd-tdot { width:11px; height:11px; background:#fff; border-radius:50%; margin-left:auto; }

        /* Stagger */
        .pd-c0{animation:pd-in .4s .32s ease forwards}
        .pd-c1{animation:pd-in .4s .46s ease forwards}
        .pd-c2{animation:pd-in .4s .60s ease forwards}
        .pd-l0{animation:pd-in .32s .36s ease forwards}
        .pd-l1{animation:pd-in .32s .46s ease forwards}
        .pd-l2{animation:pd-in .32s .56s ease forwards}
        .pd-l3{animation:pd-in .32s .66s ease forwards}
        .pd-b0{animation:pd-in .4s .76s ease forwards}
        .pd-b1{animation:pd-in .4s .88s ease forwards}
      `}</style>

      <div className="pd" ref={containerRef}>

        {/* Drag overlay */}
        {dragging && <>
          <div className="pd-drag-dim" />
          <div className="pd-delete-zone">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            удалить
          </div>
        </>}

        {/* Ghost card */}
        {dragging && (
          <div className="pd-ghost" style={{
            position:'absolute', left:ghostPos.x, top:ghostPos.y,
            width:ghostSize.w, height:ghostSize.h, zIndex:30, pointerEvents:'none',
          }}>
            {renderCard(dragging, '')}
          </div>
        )}

        {/* Header */}
        <header className="pd-hdr">
          <div className="pd-hbg"><span/><span/><span/></div>
          <span className="pd-logo">ПУЛЬС</span>
          <span className="pd-hsp"/>
          <div className="pd-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <div className="pd-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div className="pd-ava-hdr">А</div>
        </header>

        {/* Body */}
        <div className="pd-body">
          <div className="pd-hdg">
            <h1>Сегодня&nbsp;<b>{tasks} задачи</b>,&nbsp;<b>{meets} встречи</b>&nbsp;и&nbsp;<b>{rems} напоминание</b></h1>
            <p>Возможности не приходят сами — вы создаете их. — Крис Гроссер.</p>
          </div>

          {/* Top row: 3 draggable cards + static links */}
          <div className="pd-grid1">
            {renderCard(top1,'pd-c0')}
            {renderCard(top2,'pd-c1')}
            {renderCard(top3,'pd-c2')}

            {/* Quick links — not draggable */}
            <div className="pd-links">
              {[{icon:'💳',label:'доход и льготы',cls:'pd-l0'},{icon:'❤️',label:'мое здоровье',cls:'pd-l1'},{icon:'📊',label:'аналитика',cls:'pd-l2'},{icon:'📄',label:'справки',cls:'pd-l3'}]
                .map(l=>(
                <div key={l.label} className={`pd-link ${l.cls}`}>
                  <span style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:11}}>{l.icon}</span><span>{l.label}</span>
                  </span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row: 2 draggable cards */}
          <div className="pd-grid2">
            {renderCard(bot1,'pd-b0')}
            {renderCard(bot2,'pd-b1')}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pd-btm">
          <div className="pd-srch">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            введите ваш запрос
          </div>
          <div className="pd-ai">
            <span style={{color:'#4d90fe'}}>✦</span> Пульс AI
            <div className="pd-toggle"><div className="pd-tdot"/></div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */
function ClockIcon(){return<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
function PinIcon(){return<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
function VideoIcon(){return<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}

function Avs({cs,ls}:{cs:string[],ls:string[]}){
  return<div className="pd-avs">{cs.map((c,i)=><div key={i} className="pd-av" style={{background:c}}>{ls[i]}</div>)}</div>;
}

function RingAvs(){
  return(
    <div className="pd-orbit-wrap">
      {[40,78,114].map(d=><div key={d} className="pd-orbit-ring" style={{width:d,height:d}}/>)}
      <div className="pd-orbit-pulse" style={{width:40,height:40}}/>
      <div className="pd-orbit-center">Я</div>
      {RING.map((a,i)=>{
        const rad=a.a*Math.PI/180;
        const x=Math.cos(rad)*a.r, y=Math.sin(rad)*a.r;
        return(
          <div key={i} className="pd-orbit-av" style={{
            width:a.s, height:a.s, background:a.bg,
            fontSize:a.s>44?11:9,
            left:`calc(50% + ${x}px)`, top:`calc(50% + ${y}px)`,
            transform:`translate(-50%,-50%)`,
          }}>{a.l}</div>
        );
      })}
    </div>
  );
}
