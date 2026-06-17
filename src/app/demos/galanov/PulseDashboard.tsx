'use client';
import { useEffect, useState } from 'react';

const CYCLE = 5500;

export function PulseDashboard() {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setKey(k => k + 1), CYCLE);
    return () => clearInterval(t);
  }, []);
  return <Dashboard key={key} />;
}

function Dashboard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let s = 0;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= 12) clearInterval(iv);
    }, 90);
    return () => clearInterval(iv);
  }, []);

  const tasks     = Math.min(Math.round(step * 0.38), 4);
  const meetings  = Math.min(Math.round(step * 0.38), 4);
  const reminders = step >= 11 ? 1 : 0;

  return (
    <>
      <style>{`
        @keyframes pd-in  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pd-fade{ from{opacity:0} to{opacity:1} }
        @keyframes pd-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes pd-spin{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

        .pd { width:740px; height:444px; background:#eef0f4;
              font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
              font-size:13px; color:#1a1a2e; display:flex; flex-direction:column;
              overflow:hidden; border-radius:16px; }

        /* Header */
        .pd-hdr { height:52px; background:#fff; border-bottom:1px solid rgba(0,0,0,.08);
                  display:flex; align-items:center; padding:0 16px; gap:10px; flex-shrink:0;
                  opacity:0; animation:pd-fade .25s .05s ease forwards; }
        .pd-hbg { width:32px; height:32px; display:flex; flex-direction:column;
                  align-items:center; justify-content:center; gap:4px; cursor:pointer; }
        .pd-hbg span { display:block; width:16px; height:1.5px; background:#5f6368; border-radius:1px; }
        .pd-logo { font-size:17px; font-weight:800; color:#1b6ef3; letter-spacing:-.5px; }
        .pd-hsp { flex:1; }
        .pd-icon { width:32px; height:32px; border-radius:50%; display:flex; align-items:center;
                   justify-content:center; color:#5f6368; cursor:pointer; }
        .pd-icon:hover { background:#f5f5f5; }
        .pd-ava-hdr { width:32px; height:32px; border-radius:50%; background:#4285f4;
                      display:flex; align-items:center; justify-content:center;
                      color:#fff; font-weight:700; font-size:13px; cursor:pointer; }

        /* Body */
        .pd-body { flex:1; padding:12px 18px 8px; display:flex; flex-direction:column; gap:10px; overflow:hidden; }

        /* Heading */
        .pd-hdg { opacity:0; animation:pd-in .4s .18s ease forwards; }
        .pd-hdg h1 { margin:0; font-size:15px; font-weight:700; line-height:1.35; }
        .pd-hdg h1 b { color:#1b6ef3; font-weight:700; }
        .pd-hdg p { margin:3px 0 0; font-size:11px; color:#80868b; line-height:1.4; }

        /* Main grid */
        .pd-grid1 { display:grid; grid-template-columns:1fr 1fr 1fr 148px; gap:8px; }
        .pd-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

        /* Cards */
        .pd-card { background:#fff; border-radius:12px; padding:12px; display:flex;
                   flex-direction:column; gap:5px; box-shadow:0 1px 4px rgba(0,0,0,.06);
                   opacity:0; }
        .pd-card-title { font-size:12px; font-weight:600; line-height:1.3; }
        .pd-card-sub { font-size:10.5px; color:#80868b; line-height:1.35; }
        .pd-card-meta { font-size:10px; color:#80868b; display:flex; align-items:center; gap:3px; }

        /* Badges */
        .pd-badge-o { display:inline-flex; align-items:center; gap:4px;
                      background:#FFF3E0; color:#E65100; border-radius:20px;
                      padding:2px 8px; font-size:10px; font-weight:600; }
        .pd-badge-b { display:inline-flex; align-items:center; gap:3px;
                      background:#E8F0FE; color:#1558D6; border-radius:20px;
                      padding:2px 8px; font-size:10px; font-weight:600; }
        .pd-live { animation:pd-dot 1.4s ease infinite; }

        /* Avatars */
        .pd-avs { display:flex; }
        .pd-av { width:20px; height:20px; border-radius:50%; border:2px solid #fff;
                 margin-left:-5px; font-size:8px; display:flex; align-items:center;
                 justify-content:center; font-weight:700; color:#fff; }
        .pd-av:first-child { margin-left:0; }

        /* Buttons */
        .pd-btn-pri { background:#1b6ef3; color:#fff; border:none; border-radius:8px;
                      padding:5px 10px; font-size:11px; font-weight:600; cursor:pointer;
                      text-align:center; width:100%; margin-top:auto; }
        .pd-btn-out { background:#fff; color:#1b6ef3; border:1.5px solid #1b6ef3;
                      border-radius:8px; padding:5px 10px; font-size:11px; font-weight:600;
                      cursor:pointer; text-align:center; width:100%; margin-top:auto; }

        /* Birthday photo */
        .pd-bday { width:40px; height:40px; border-radius:50%;
                   background:linear-gradient(135deg,#f9a8d4,#93c5fd);
                   display:flex; align-items:center; justify-content:center; font-size:18px; }

        /* Quick links */
        .pd-links { display:flex; flex-direction:column; gap:6px; }
        .pd-link { background:#fff; border-radius:10px; padding:8px 10px; font-size:10.5px;
                   font-weight:500; display:flex; align-items:center; justify-content:space-between;
                   cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.05); opacity:0; }
        .pd-link svg { color:#c0c4cc; }

        /* Social card rows */
        .pd-srow { display:flex; justify-content:space-between; align-items:center; }
        .pd-slbl { font-size:10.5px; color:#80868b; }
        .pd-scnt { font-size:10.5px; font-weight:700; color:#1e8f4e; }

        /* News */
        .pd-news-img { width:100%; height:48px; border-radius:8px; overflow:hidden;
                       background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 60%,#7c3aed 100%);
                       display:flex; align-items:center; justify-content:center; margin-top:3px; }
        .pd-news-tag { font-size:9px; font-weight:700; color:#80868b; letter-spacing:.6px; text-transform:uppercase; }

        /* Bottom */
        .pd-btm { height:40px; background:#fff; border-top:1px solid rgba(0,0,0,.07);
                  flex-shrink:0; display:flex; align-items:center; padding:0 14px; gap:8px;
                  opacity:0; animation:pd-fade .3s 1.1s ease forwards; }
        .pd-srch { flex:1; background:#f5f5f5; border-radius:8px; height:26px;
                   display:flex; align-items:center; padding:0 10px; gap:6px;
                   font-size:11px; color:#9aa0a6; }
        .pd-ai { display:flex; align-items:center; gap:6px; font-size:11px; color:#5f6368; white-space:nowrap; }
        .pd-ai-spark { color:#1b6ef3; }
        .pd-toggle { width:28px; height:16px; background:#1b6ef3; border-radius:8px;
                     display:flex; align-items:center; padding:0 2px; }
        .pd-tdot { width:12px; height:12px; background:#fff; border-radius:50%; margin-left:auto; }

        /* Stagger delays */
        .pd-c0 { animation:pd-in .4s .32s ease forwards; }
        .pd-c1 { animation:pd-in .4s .46s ease forwards; }
        .pd-c2 { animation:pd-in .4s .60s ease forwards; }
        .pd-l0 { animation:pd-in .35s .36s ease forwards; }
        .pd-l1 { animation:pd-in .35s .46s ease forwards; }
        .pd-l2 { animation:pd-in .35s .56s ease forwards; }
        .pd-l3 { animation:pd-in .35s .66s ease forwards; }
        .pd-b0 { animation:pd-in .4s .76s ease forwards; }
        .pd-b1 { animation:pd-in .4s .88s ease forwards; }
      `}</style>

      <div className="pd">
        {/* ── Header ── */}
        <header className="pd-hdr">
          <div className="pd-hbg">
            <span /><span /><span />
          </div>
          <span className="pd-logo">ПУЛЬС</span>
          <span className="pd-hsp" />
          <div className="pd-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div className="pd-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* Meeting */}
            <div className="pd-card pd-c0">
              <span className="pd-badge-o"><span className="pd-live">●</span> через 25 мин</span>
              <div className="pd-card-title">менеджерский синк по дизайн системе</div>
              <div className="pd-card-meta">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                16:30 → 17:30
              </div>
              <div className="pd-card-meta">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                А.19.02 +jazz
              </div>
              <div className="pd-avs" style={{marginTop:2}}>
                {['#4285f4','#ea4335','#34a853'].map((c,i) => (
                  <div key={i} className="pd-av" style={{background:c}}>{['Е','А','Г'][i]}</div>
                ))}
              </div>
              <button className="pd-btn-out" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Подключиться
              </button>
            </div>

            {/* Task */}
            <div className="pd-card pd-c1">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span className="pd-badge-b">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  сегодня
                </span>
                <span style={{fontSize:11,color:'#80868b',fontWeight:600}}>5</span>
              </div>
              <div className="pd-card-title">согласуйте отпуска у 3 сотрудников</div>
              <div className="pd-card-sub">Евгений Елистратов, Артем Евтушенко и Григорий Лепс</div>
              <div className="pd-avs">
                {['#9334ea','#ea4335','#0f766e'].map((c,i) => (
                  <div key={i} className="pd-av" style={{background:c}}>{['Е','А','Г'][i]}</div>
                ))}
              </div>
              <button className="pd-btn-pri">согласовать все</button>
            </div>

            {/* Birthday */}
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
                  <span style={{display:'flex',alignItems:'center',gap:6}}>
                    <span>{l.icon}</span>
                    <span>{l.label}</span>
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0c4cc" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 2-col row */}
          <div className="pd-grid2">

            {/* Social circle */}
            <div className="pd-card pd-b0" style={{flexDirection:'row',gap:12,padding:'10px 12px',alignItems:'center'}}>
              <div style={{flex:1}}>
                <div className="pd-card-title" style={{marginBottom:6}}>круг общения</div>
                {[{l:'моя команда',c:'+24'},{l:'смежные команды',c:'+12'},{l:'внешние заказчики',c:'+12'}].map(r => (
                  <div key={r.l} className="pd-srow">
                    <span className="pd-slbl">{r.l}</span>
                    <span className="pd-scnt">{r.c}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'center'}}>
                <div style={{display:'flex'}}>
                  {['#4285f4','#ea4335'].map((c,i) => (
                    <div key={i} className="pd-av" style={{background:c,width:28,height:28,fontSize:11,marginLeft:i>0?-8:0,border:'2.5px solid #fff'}}>
                      {['А','М'][i]}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex'}}>
                  {['#34a853','#fbbc04'].map((c,i) => (
                    <div key={i} className="pd-av" style={{background:c,width:28,height:28,fontSize:11,marginLeft:i>0?-8:0,border:'2.5px solid #fff'}}>
                      {['В','Н'][i]}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* News */}
            <div className="pd-card pd-b1" style={{gap:4}}>
              <span className="pd-news-tag">Новости</span>
              <div className="pd-news-img">
                <div style={{width:'100%',height:'100%',backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'48\'%3E%3Crect width=\'100\' height=\'48\' fill=\'%231e3a5f\'/%3E%3Ccircle cx=\'25\' cy=\'24\' r=\'15\' fill=\'%232563eb\' opacity=\'.6\'/%3E%3C/svg%3E")',backgroundSize:'cover'}} />
              </div>
              <div style={{fontSize:11.5,fontWeight:600,lineHeight:1.35,marginTop:1}}>
                Греф назвал планируемый объем дивидендов «Сбера»
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom search bar ── */}
        <div className="pd-btm">
          <div className="pd-srch">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2.5">
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
