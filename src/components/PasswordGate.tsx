'use client';

import { useState, useEffect, useRef } from 'react';

const KEY = 'pg_ok';
const HASH = '4e3f1a8c'; // simple token for Design2026

function check(val: string) {
  return val.trim() === 'Design2026';
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(KEY) === HASH);
  }, []);

  useEffect(() => {
    if (unlocked === false) setTimeout(() => inputRef.current?.focus(), 80);
  }, [unlocked]);

  function submit() {
    if (check(value)) {
      sessionStorage.setItem(KEY, HASH);
      setUnlocked(true);
    } else {
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 500);
    }
  }

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#070709',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-manrope, Manrope, sans-serif)',
      zIndex: 9999,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px',
        animation: shake ? 'shake 0.45s ease' : 'none',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '22px',
          }}>
            🔒
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Портфолио
          </div>
          <div style={{ color: '#fff', fontSize: '20px', fontWeight: 500 }}>
            Введите пароль для доступа
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
          <input
            ref={inputRef}
            type="password"
            value={value}
            placeholder="Пароль"
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '14px 18px',
              color: '#fff',
              fontSize: '15px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          />
          <button
            onClick={submit}
            style={{
              width: '100%',
              background: '#fff',
              color: '#070709',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 18px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = '0.88'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = '1'; }}
          >
            Войти
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
