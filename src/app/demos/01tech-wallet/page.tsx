'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ─── Design tokens (editable) ────────────────────────────────────────────────
type Tok = {
  P: string; P_DIM: string; BG: string; SHEET: string; MUTED: string;
  balanceFs: number; assetNameFs: number; assetSubFs: number; assetValFs: number;
  listItemPad: number; sectionHeaderFs: number;
};
const DEFAULT_TOK: Tok = {
  P: '#7A45E5', P_DIM: '#3E2966', BG: '#111115', SHEET: '#212128', MUTED: '#9AA0A6',
  balanceFs: 40, assetNameFs: 16, assetSubFs: 14, assetValFs: 16,
  listItemPad: 12, sectionHeaderFs: 22,
};
const TokCtx = createContext<Tok>(DEFAULT_TOK);
const useTok = () => useContext(TokCtx);

// Module-level aliases (used outside React components — fallback to defaults)
const P      = DEFAULT_TOK.P;
const P_DIM  = DEFAULT_TOK.P_DIM;
const BG     = DEFAULT_TOK.BG;
const SHEET  = DEFAULT_TOK.SHEET;
const MUTED  = DEFAULT_TOK.MUTED;
const DIV    = 'rgba(255,255,255,0.1)';

// ─── Selection system ─────────────────────────────────────────────────────────
type SelType = 'text' | 'icon' | 'container';
type SelItem = { id: string; type: SelType; label: string };
type Group   = { id: string; memberIds: string[]; label: string };

type SelCtxT = {
  editMode: boolean;
  bgEditMode: boolean;
  bgSelId: string | null;
  selections: SelItem[];
  overrides: Record<string, Record<string, any>>;
  hoveredId: string | null;
  groups: Group[];
  bgLayers: Record<string, Record<string, any>>;
  select:       (item: SelItem, multi: boolean) => void;
  clearSel:     () => void;
  setOv:        (id: string, ov: Record<string, any>) => void;
  resetOv:      (id: string) => void;
  resetAll:     () => void;
  groupSel:     () => void;
  setHov:       (id: string | null) => void;
  setBgLayer:   (id: string, ov: Record<string, any>) => void;
  resetBgLayer: (id: string) => void;
  resetAllBg:   () => void;
  setBgSelId:    (id: string | null) => void;
  layerOrder:    string[];
  setLayerOrder: (order: string[]) => void;
};

const SelCtx = createContext<SelCtxT>({
  editMode: false, bgEditMode: false, bgSelId: null,
  selections: [], overrides: {}, hoveredId: null, groups: [], bgLayers: {},
  layerOrder: ['bg-e1','bg-e2','bg-e3','bg-solid','bg-grad','bg-dots'],
  select() {}, clearSel() {}, setOv() {}, resetOv() {}, resetAll() {}, groupSel() {}, setHov() {},
  setBgLayer() {}, resetBgLayer() {}, resetAllBg() {}, setBgSelId() {}, setLayerOrder() {},
});
const useSel = () => useContext(SelCtx);

function Sel({ id, type, label, tag = 'div', baseStyle, children }: {
  id: string; type: SelType; label: string;
  tag?: 'div' | 'span' | 'p';
  baseStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ctx = useSel();
  const ov = (ctx.overrides[id] ?? {}) as React.CSSProperties;
  const mergedBase = baseStyle ? { ...baseStyle, ...ov } : undefined;

  if (!ctx.editMode) {
    const Tag = tag;
    if (!mergedBase) return <>{children}</>;
    return <Tag style={mergedBase}>{children}</Tag>;
  }

  const isSel = ctx.selections.some(s => s.id === id);
  const isHov = ctx.hoveredId === id;
  const Tag = tag;

  return (
    <Tag
      style={{
        ...(mergedBase ?? {}),
        position: 'relative',
        outline: isSel ? '1.5px solid #7A45E5' : isHov ? '1px dashed rgba(122,69,229,0.45)' : 'none',
        outlineOffset: 1,
        cursor: 'pointer',
      } as React.CSSProperties}
      onMouseEnter={(e: any) => { e.stopPropagation(); ctx.setHov(id); }}
      onMouseLeave={(e: any) => { ctx.setHov(null); }}
      onClick={(e: any) => { e.stopPropagation(); ctx.select({ id, type, label }, e.shiftKey); }}
    >
      {isSel && (
        <div style={{
          position: 'absolute', top: -18, left: -1, background: '#7A45E5', color: '#fff',
          fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: '3px 3px 3px 0',
          whiteSpace: 'nowrap', zIndex: 1000, pointerEvents: 'none', lineHeight: '14px',
        }}>{label}</div>
      )}
      {children}
    </Tag>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen =
  | 'home'
  | 'buy-sheet' | 'buy-amount' | 'buy-method-sheet'
  | 'buy-processing' | 'buy-success' | 'buy-error'
  | 'withdraw-sheet' | 'withdraw-amount' | 'withdraw-asset-sheet'
  | 'withdraw-confirm' | 'withdraw-processing' | 'withdraw-success' | 'withdraw-error'
  | 'exchange-select' | 'exchange-amount' | 'exchange-target-sheet'
  | 'exchange-confirm' | 'exchange-processing' | 'exchange-success';

// ─── Data ────────────────────────────────────────────────────────────────────
const ASSETS = [
  { id: 'usdt', name: 'USDT',     color: '#26A17B', sub: '246,04 USDT', val: '19 112₽',  rate: 76.98,      avail: 246.04 },
  { id: 'btc',  name: 'Bitcoin',  color: '#F7931A', sub: '0,00028 BTC', val: '2 001₽',   rate: 6_420_000, avail: 0.00028 },
  { id: 'eth',  name: 'Ethereum', color: '#627EEA', sub: '0,026 ETH',   val: '3 600₽',   rate: 357_000,   avail: 0.026   },
  { id: 'trx',  name: 'Tron',     color: '#EF0027', sub: '124 TRX',     val: '3059₽',    rate: 8,         avail: 124     },
  { id: 'doge', name: 'Dogecoin', color: '#C3A634', sub: '147,25 DOGE', val: '1025₽',    rate: 7,         avail: 147.25  },
  { id: 'sol',  name: 'Solana',   color: '#9945FF', sub: '1 SOL',       val: '5618₽',    rate: 14_800,    avail: 1       },
] as const;
type Asset = typeof ASSETS[number];

const EXCHANGE_ASSETS = [
  ASSETS[0],
  ASSETS[1],
  ASSETS[2],
  { id: 'ton' as const, name: 'TON',  color: '#0098EA', sub: '', val: '', rate: 598, avail: 0 },
] as const;

const TON = { id: 'ton' as const, name: 'TON', color: '#0098EA', sub: '', val: '', rate: 598, avail: 0 };

// ─── Coin icon ────────────────────────────────────────────────────────────────
function CoinIcon({ id, color, size = 40 }: { id: string; color: string; size?: number }) {
  const sym: Record<string, string> = { usdt:'₮', btc:'₿', eth:'Ξ', trx:'◈', doge:'Ð', sol:'◎', ton:'◈' };
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff', userSelect: 'none',
    }}>
      {sym[id] ?? id[0].toUpperCase()}
    </div>
  );
}

// SberPay icon
function SberPayIcon({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#21A038', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.56} height={size * 0.44} viewBox="0 0 18 14" fill="none">
        <path d="M1 7l5 5L17 1" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// СБП icon
function SbpIcon({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 20 20" fill="none">
        <path d="M10 2L4 8l6 10 6-10L10 2Z" fill="url(#sbp1)"/>
        <defs>
          <linearGradient id="sbp1" x1="4" y1="2" x2="16" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B35"/>
            <stop offset="0.5" stopColor="#FF3B5C"/>
            <stop offset="1" stopColor="#0062FF"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── StatusBar ───────────────────────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ height: 54, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 10px', flexShrink: 0 }}>
      <span style={{ fontSize: 17, fontWeight: 590, color: '#fff', letterSpacing: '-0.3px' }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff">
          <rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="5" width="3" height="7" rx="1"/>
          <rect x="9" y="2.5" width="3" height="9.5" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" fill="#fff"/>
          <path d="M4.5 6.2a5 5 0 0 1 7 0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M1.5 3.3A9 9 0 0 1 14.5 3.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.65"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#fff" strokeOpacity="0.35"/>
          <rect x="2" y="2" width="17" height="8" rx="2" fill="#fff"/>
          <path d="M23 4v4a2 2 0 0 0 0-4Z" fill="#fff" fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0, position: 'relative' }}>
      {onBack ? (
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center' }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M9 1L1 8.5L9 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : <div style={{ width: 44 }} />}
      <Sel id={`nav-title-${title}`} type="text" label={`Заголовок «${title}»`} tag="div"
        baseStyle={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
        {title}
      </Sel>
      {right ? right : <div style={{ width: 44 }} />}
    </div>
  );
}

// ─── NumPad ───────────────────────────────────────────────────────────────────
const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','+*#','0','⌫'] as const;
const PAD_SUB: Record<string, string> = { '2':'ABC','3':'DEF','4':'GHI','5':'JKL','6':'MNO','7':'PQRS','8':'TUV','9':'WXYZ' };

function NumPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div style={{ position: 'relative', background: '#1B1B1B', flexShrink: 0, padding: '6px 4px 0', paddingBottom: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
        {PAD_KEYS.map(k => (
          <motion.button
            key={k}
            whileTap={{ opacity: 0.35, scale: 0.9 }}
            onClick={() => onKey(k)}
            style={{
              background: k === '+*#' || k === '⌫' ? 'none' : '#333340',
              border: 'none', cursor: 'pointer',
              borderRadius: 8.5, height: 50, margin: '4px 5px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', gap: 2,
            }}
          >
            {k === '⌫' ? (
              <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                <path d="M10.5 1H24a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H10.5L2 10l8.5-9Z"
                  stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M15 8l5 5M20 8l-5 5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : k === '+*#' ? (
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>+*#</span>
            ) : (
              <>
                <span style={{ fontSize: 25, fontWeight: 400, color: '#fff', lineHeight: 1 }}>{k}</span>
                {PAD_SUB[k] && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.06em', lineHeight: 1 }}>{PAD_SUB[k]}</span>}
              </>
            )}
          </motion.button>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 134, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.3)' }} />
      </div>
    </div>
  );
}

// ─── ContinueBtn ─────────────────────────────────────────────────────────────
function ContinueBtn({ label = 'Продолжить', active, hint, hintRed, onClick }: {
  label?: string; active: boolean; hint?: string; hintRed?: string; onClick: () => void;
}) {
  return (
    <div style={{ background: '#1A1A1B', borderRadius: '24px 24px 0 0', padding: '10px 16px 12px', flexShrink: 0 }}>
      <Sel id="continue-btn" type="container" label="Кнопка «Продолжить»"
        baseStyle={{ width: '100%', height: 56, borderRadius: 28, background: active ? P : P_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.button
          whileTap={active ? { scale: 0.98 } : {}}
          onClick={active ? onClick : undefined}
          style={{
            width: '100%', height: '100%', borderRadius: 28,
            background: 'transparent',
            border: 'none', cursor: active ? 'pointer' : 'default',
            fontFamily: 'inherit',
          }}
        >
          <Sel id="continue-btn-label" type="text" label="Текст кнопки" tag="span"
            baseStyle={{ fontSize: 16, fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}>
            {label}
          </Sel>
        </motion.button>
      </Sel>
      {hintRed
        ? <Sel id="continue-hint-red" type="text" label="Текст ошибки" tag="p"
            baseStyle={{ textAlign: 'center', fontSize: 12, color: '#FF3B30', margin: '8px 0 0', fontWeight: 500 }}>
            {hintRed}
          </Sel>
        : hint && <Sel id="continue-hint" type="text" label="Подсказка" tag="p"
            baseStyle={{ textAlign: 'center', fontSize: 12, color: MUTED, margin: '8px 0 0' }}>
            {hint}
          </Sel>}
    </div>
  );
}

// ─── ProcessingOrb ────────────────────────────────────────────────────────────
function ProcessingOrb({ type }: { type: 'loading' | 'success' | 'error' }) {
  const c = { loading: '#7A45E5', success: '#34C759', error: '#FF3B30' }[type];
  return (
    <div style={{ position: 'relative', width: 130, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: -40, background: `radial-gradient(circle, ${c}28 0%, transparent 65%)`, borderRadius: '50%' }} />
      <motion.div
        animate={type === 'loading' ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={type === 'loading' ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } : {}}
        style={{
          width: 130, height: 130, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${c}88, ${c}22)`,
          boxShadow: `0 0 50px ${c}40, 0 0 100px ${c}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {type === 'loading' && (
          <motion.svg animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="20" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
            <path d="M26 6a20 20 0 0 1 20 20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </motion.svg>
        )}
        {type === 'success' && (
          <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            width="54" height="42" viewBox="0 0 54 42" fill="none">
            <path d="M4 21L19 36L50 4" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
        )}
        {type === 'error' && (
          <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            width="46" height="46" viewBox="0 0 46 46" fill="none">
            <path d="M8 8L38 38M38 8L8 38" stroke="#fff" strokeWidth="5.5" strokeLinecap="round"/>
          </motion.svg>
        )}
      </motion.div>
    </div>
  );
}

// ─── Overlay ────────────────────────────────────────────────────────────────
function Overlay({ onClick }: { onClick: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }} onClick={onClick}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 40 }} />
  );
}

// ─── BottomSheet ─────────────────────────────────────────────────────────────
function BottomSheetWrap({ children, onClose, height = 'auto' }: { children: React.ReactNode; onClose: () => void; height?: string | number }) {
  return (
    <>
      <Overlay onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: SHEET, borderRadius: '20px 20px 0 0',
          maxHeight: '90%', overflow: 'hidden',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '10px auto 4px' }} />
        {children}
      </motion.div>
    </>
  );
}

// ─── useNumPad ────────────────────────────────────────────────────────────────
function useNumPad(init = '0') {
  const [value, setValue] = useState(init);
  const handleKey = useCallback((k: string) => {
    if (k === '⌫') { setValue(v => v.length <= 1 ? '0' : v.slice(0, -1)); return; }
    if (k === '+*#') return;
    setValue(v => {
      if (k === ',') return v.includes(',') ? v : (v === '0' ? '0,' : v + ',');
      if (v === '0') return k;
      const ci = v.indexOf(',');
      if (ci !== -1 && v.length - ci - 1 >= 2) return v;
      if (v.replace(',', '').length >= 9) return v;
      return v + k;
    });
  }, []);
  const num = parseFloat(value.replace(',', '.')) || 0;
  return { value, setValue, handleKey, num };
}

// ─── CurrenciesList ───────────────────────────────────────────────────────────
function CurrenciesList() {
  const tok = useTok();
  const ctx = useSel();
  return (
    <div style={{ flex: 1, overflow: 'auto', paddingBottom: 24 }}>
      <div style={{ padding: '12px 16px 8px' }}>
        <Sel id="assets-header" type="text" label="Заголовок «Активы»" tag="span"
          baseStyle={{ fontSize: tok.sectionHeaderFs, fontWeight: 600, color: '#fff' }}>
          Активы
        </Sel>
      </div>
      {ASSETS.map((a, i) => {
        const coinOv = (ctx.overrides[`coin-${a.id}`] ?? {}) as { size?: number; color?: string };
        return (
          <Sel key={a.id} id={`row-${a.id}`} type="container" label={`Строка ${a.name}`}
            baseStyle={{ display: 'flex', alignItems: 'center', padding: `${tok.listItemPad}px 16px`, borderTop: i > 0 ? `1px solid ${DIV}` : 'none', gap: 16 }}>
            <Sel id={`coin-${a.id}`} type="icon" label={`${a.name} иконка`}>
              <CoinIcon id={a.id} color={coinOv.color ?? a.color} size={coinOv.size ?? 40} />
            </Sel>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Sel id={`name-${a.id}`} type="text" label={`${a.name} название`} tag="div"
                baseStyle={{ fontSize: tok.assetNameFs, fontWeight: 600, color: '#fff' }}>
                {a.name}
              </Sel>
              <Sel id={`sub-${a.id}`} type="text" label={`${a.name} кол-во`} tag="div"
                baseStyle={{ fontSize: tok.assetSubFs, color: tok.MUTED, marginTop: 2 }}>
                {a.sub}
              </Sel>
            </div>
            <Sel id={`val-${a.id}`} type="text" label={`${a.name} стоимость`} tag="div"
              baseStyle={{ fontSize: tok.assetValFs, fontWeight: 600, color: '#fff' }}>
              {a.val}
            </Sel>
          </Sel>
        );
      })}
    </div>
  );
}

// ─── Background layer definitions ────────────────────────────────────────────
type BgLayerKind = 'ellipse' | 'dotgrid' | 'gradient' | 'solid';
type BgLayerDef = { id: string; label: string; kind: BgLayerKind; def: Record<string, any> };
const BG_LAYERS: BgLayerDef[] = [
  { id: 'bg-e1',    label: 'Эллипс 1 (лево)',  kind: 'ellipse',  def: { x: -200, y: -102, w: 253, h: 239, color: '#a186d7', blur: 170, opacity: 1 } },
  { id: 'bg-e2',    label: 'Эллипс 2 (право)', kind: 'ellipse',  def: { x: 324,  y: 4,    w: 249, h: 334, color: '#a186d7', blur: 170, opacity: 1 } },
  { id: 'bg-e3',    label: 'Эллипс 3 (центр)', kind: 'ellipse',  def: { x: 118,  y: -25,  w: 175, h: 252, color: '#10015d', blur: 170, opacity: 1 } },
  { id: 'bg-dots',  label: 'Точечная сетка',   kind: 'dotgrid',  def: { dotOpacity: 0.14, gridSize: 20, opacity: 0.9, maskX: 343, maskY: -9, maskW: 242, maskH: 251 } },
  { id: 'bg-grad',  label: 'Градиент',          kind: 'gradient', def: { angle: 180, colorFrom: '#111115', alphaFrom: 0, posFrom: 0, colorTo: '#111115', alphaTo: 1, posTo: 100, opacity: 1 } },
  { id: 'bg-solid', label: 'Фон активов',       kind: 'solid',    def: { height: 432 } },
];

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(17,17,21,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildGradient(angle: number, c1: string, a1: number, p1: number, c2: string, a2: number, p2: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  };
  const [r1,g1,b1] = parse(c1);
  const [r2,g2,b2] = parse(c2);
  const N = 8;
  const stops: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const e = t * t * (3 - 2 * t); // smoothstep
    const pos  = p1 + (p2 - p1) * t;
    const alpha = a1 + (a2 - a1) * e;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    stops.push(`rgba(${r},${g},${b},${+alpha.toFixed(3)}) ${+pos.toFixed(1)}%`);
  }
  if (p2 < 100) stops.push(`rgba(${r2},${g2},${b2},${a2}) 100%`);
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
function HomeScreen({ active, onBuy, onWithdraw, onExchange }: {
  active?: 'buy' | 'withdraw' | 'exchange' | 'receive';
  onBuy: () => void; onWithdraw: () => void; onExchange: () => void;
}) {
  const tok = useTok();
  const ctx = useSel();

  // Drag handling for bg ellipses
  const dragState = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const setBgLayerRef = useRef(ctx.setBgLayer);
  setBgLayerRef.current = ctx.setBgLayer;
  const bgLayersRef = useRef(ctx.bgLayers);
  bgLayersRef.current = ctx.bgLayers;

  const startDrag = (e: React.MouseEvent, id: string) => {
    const ov = bgLayersRef.current[id] ?? {};
    const def = BG_LAYERS.find(l => l.id === id)?.def ?? {};
    dragState.current = { id, startX: e.clientX, startY: e.clientY, origX: ov.x ?? def.x ?? 0, origY: ov.y ?? def.y ?? 0 };
    ctx.setBgSelId(id);
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const { id, startX, startY, origX, origY } = dragState.current;
      const cur = bgLayersRef.current[id] ?? {};
      setBgLayerRef.current(id, { ...cur, x: Math.round(origX + e.clientX - startX), y: Math.round(origY + e.clientY - startY) });
    };
    const onUp = () => { dragState.current = null; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, []);

  const iconOv = (id: string) => {
    const ov = (ctx.overrides[`icon-${id}`] ?? {}) as { size?: number; color?: string };
    return { size: ov.size ?? 18, color: ov.color ?? 'white' };
  };

  const actions = [
    { id: 'buy',      label: 'Купить',    icon: <BuyIcon      {...iconOv('buy')} />,      onClick: onBuy      },
    { id: 'withdraw', label: 'Вывести',   icon: <WithdrawIcon {...iconOv('withdraw')} />,  onClick: onWithdraw },
    { id: 'exchange', label: 'Обменять',  icon: <ExchangeIcon {...iconOv('exchange')} />,  onClick: onExchange },
    { id: 'receive',  label: 'Получить',  icon: <ReceiveIcon  {...iconOv('receive')} />,   onClick: () => {}   },
  ] as const;

  const bgl = (id: string) => ctx.bgLayers[id] ?? {};

  const renderBgLayer = (id: string) => {
    const ov = bgl(id);
    if (ov.hidden) return null;
    switch (id) {
      case 'bg-e1': return <div key="bg-e1" style={{ position: 'absolute', left: ov.x ?? -200, top: ov.y ?? -102, width: ov.w ?? 253, height: ov.h ?? 239, borderRadius: '50%', background: ov.color ?? '#a186d7', filter: `blur(${ov.blur ?? 170}px)`, opacity: ov.opacity ?? 1 }} />;
      case 'bg-e2': return <div key="bg-e2" style={{ position: 'absolute', left: ov.x ?? 324, top: ov.y ?? 4, width: ov.w ?? 249, height: ov.h ?? 334, borderRadius: '50%', background: ov.color ?? '#a186d7', filter: `blur(${ov.blur ?? 170}px)`, opacity: ov.opacity ?? 1 }} />;
      case 'bg-e3': return <div key="bg-e3" style={{ position: 'absolute', left: ov.x ?? 118, top: ov.y ?? -25, width: ov.w ?? 175, height: ov.h ?? 252, borderRadius: '50%', background: ov.color ?? '#10015d', filter: `blur(${ov.blur ?? 170}px)`, opacity: ov.opacity ?? 1 }} />;
      case 'bg-dots': {
        const mX = ov.maskX ?? 343; const mY = ov.maskY ?? -9;
        const mW = ov.maskW ?? 242; const mH = ov.maskH ?? 251;
        const mask = `radial-gradient(ellipse ${mW}px ${mH}px at ${mX}px ${mY}px, rgba(0,0,0,0.85) 0%, transparent 100%)`;
        return <div key="bg-dots" style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, rgba(255,255,255,${ov.dotOpacity ?? 0.14}) 1.5px, transparent 1.5px)`, backgroundSize: `${ov.gridSize ?? 20}px ${ov.gridSize ?? 20}px`, WebkitMaskImage: mask, maskImage: mask, opacity: ov.opacity ?? 0.9 }} />;
      }
      case 'bg-grad': return <div key="bg-grad" style={{ position: 'absolute', inset: 0, background: buildGradient(ov.angle ?? 180, ov.colorFrom ?? '#111115', ov.alphaFrom ?? 0, ov.posFrom ?? 0, ov.colorTo ?? '#111115', ov.alphaTo ?? 1, ov.posTo ?? 100), opacity: ov.opacity ?? 1 }} />;
      case 'bg-solid': return <div key="bg-solid" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ov.height ?? 432, background: ov.color ?? tok.BG }} />;
      default: return null;
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {ctx.layerOrder.map(id => renderBgLayer(id))}

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <StatusBar />

        {/* Topbar */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <Sel id="avatar" type="container" label="Аватар"
              baseStyle={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Sel>
            <Sel id="username" type="text" label="Имя пользователя" tag="span"
              baseStyle={{ fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>
              Валентин С.
            </Sel>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
              <path d="M10 6v4l2.5 2.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 3.5a9 9 0 0 0-1 2.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M3 10a7 7 0 0 0 1.5 4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Balance */}
        <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sel id="balance-label" type="text" label="Подпись баланса" tag="span"
              baseStyle={{ fontSize: 14, color: tok.MUTED }}>
              Общий баланс
            </Sel>
            <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
              <ellipse cx="6.5" cy="4" rx="5.5" ry="3.5" stroke={tok.MUTED} strokeWidth="1"/>
              <circle cx="6.5" cy="4" r="1.5" fill={tok.MUTED}/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <Sel id="balance-value" type="text" label="Сумма баланса" tag="span"
              baseStyle={{ fontSize: tok.balanceFs, fontWeight: 600, color: '#fff', letterSpacing: '-1px' }}>
              21 128,06
            </Sel>
            <Sel id="balance-currency-sym" type="text" label="Символ валюты" tag="span"
              baseStyle={{ fontSize: 14, fontWeight: 500, color: tok.MUTED }}>
              ₽
            </Sel>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Sel id="balance-currency" type="text" label="Валюта" tag="span"
              baseStyle={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
              RUB
            </Sel>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4.5 6.5L8 10 11.5 6.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '0 16px', flexShrink: 0 }}>
          {actions.map(a => (
            <motion.button key={a.id} whileTap={{ scale: 0.93 }} onClick={ctx.editMode ? undefined : a.onClick}
              style={{ background: 'none', border: 'none', cursor: ctx.editMode ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <Sel id={`pill-${a.id}`} type="container" label={`Кнопка ${a.label}`}
                baseStyle={{ width: 80, height: 64, borderRadius: 32, background: active === a.id ? tok.P : '#212128', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                <Sel id={`icon-${a.id}`} type="icon" label={`${a.label} иконка`}>
                  {a.icon}
                </Sel>
              </Sel>
              <Sel id={`action-label-${a.id}`} type="text" label={`Текст «${a.label}»`} tag="span"
                baseStyle={{ fontSize: 14, fontWeight: 500, color: tok.MUTED }}>
                {a.label}
              </Sel>
            </motion.button>
          ))}
        </div>

        {/* Currencies */}
        <CurrenciesList />

        {/* Home indicator */}
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingBottom: 4 }}>
          <div style={{ width: 134, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>

      {/* ── BG Edit Overlay ── */}
      {ctx.bgEditMode && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 20 }}
          onClick={() => ctx.setBgSelId(null)}
        >
          {BG_LAYERS.filter(l => l.kind === 'ellipse').map(l => {
            const ov = ctx.bgLayers[l.id] ?? {};
            if (ov.hidden) return null;
            const x = ov.x ?? l.def.x;
            const y = ov.y ?? l.def.y;
            const w = ov.w ?? l.def.w;
            const h = ov.h ?? l.def.h;
            const isSel = ctx.bgSelId === l.id;
            return (
              <div key={l.id}
                onMouseDown={e => startDrag(e, l.id)}
                onClick={e => { e.stopPropagation(); ctx.setBgSelId(isSel ? null : l.id); }}
                style={{
                  position: 'absolute', left: x, top: y, width: w, height: h,
                  borderRadius: '50%', boxSizing: 'border-box',
                  border: `${isSel ? 2 : 1.5}px ${isSel ? 'solid' : 'dashed'} ${isSel ? '#2196F3' : 'rgba(255,255,255,0.35)'}`,
                  cursor: isSel ? 'move' : 'pointer',
                  background: isSel ? 'rgba(33,150,243,0.06)' : 'transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{
                  position: 'absolute', top: -20, left: 0,
                  background: isSel ? '#2196F3' : 'rgba(0,0,0,0.7)',
                  color: '#fff', fontSize: 9, fontWeight: 600, padding: '2px 6px',
                  borderRadius: '3px 3px 3px 0', whiteSpace: 'nowrap', pointerEvents: 'none',
                  lineHeight: '14px',
                }}>
                  {l.label}{isSel ? ' — тяни' : ''}
                </div>
                {isSel && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(33,150,243,0.9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
                      <path d="M5 1v8M1 5h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// action icons — paths from Figma, viewBox crops to icon area within 80×64 pill
function BuyIcon({ size = 18, color = 'white' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="27.875 20 24 24" fill={color}>
    <path d="M47.4077 31.9996C47.4075 27.8583 44.0159 24.4664 39.8745 24.4664C35.7333 24.4666 32.3415 27.8584 32.3413 31.9996C32.3413 36.141 35.7332 39.5327 39.8745 39.5328C44.016 39.5328 47.4077 36.1411 47.4077 31.9996ZM39.0747 35.3336V32.8004H36.5415C36.0997 32.8004 35.7417 32.4415 35.7417 31.9996C35.7419 31.558 36.0998 31.1998 36.5415 31.1998H39.0747V28.6666C39.0747 28.2249 39.4328 27.867 39.8745 27.8668C40.3163 27.8668 40.6753 28.2248 40.6753 28.6666V31.1998H43.2085C43.6501 31.2 44.0081 31.5581 44.0083 31.9996C44.0083 32.4414 43.6502 32.8002 43.2085 32.8004H40.6753V35.3336C40.6751 35.7753 40.3162 36.1334 39.8745 36.1334C39.4329 36.1332 39.0749 35.7752 39.0747 35.3336ZM49.0083 31.9996C49.0083 37.0248 44.8997 41.1334 39.8745 41.1334C34.8495 41.1332 30.7417 37.0247 30.7417 31.9996C30.7419 26.9747 34.8496 22.867 39.8745 22.8668C44.8996 22.8668 49.0081 26.9746 49.0083 31.9996Z"/>
  </svg>;
}
function WithdrawIcon({ size = 18, color = 'white' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="27.875 20 24 24" fill={color}>
    <path d="M47.4077 31.9996C47.4075 27.8583 44.0159 24.4664 39.8745 24.4664C35.7333 24.4666 32.3415 27.8584 32.3413 31.9996C32.3413 36.141 35.7332 39.5327 39.8745 39.5328C44.016 39.5328 47.4077 36.1411 47.4077 31.9996ZM43.2085 31.1998C43.6501 31.2 44.0081 31.5581 44.0083 31.9996C44.0083 32.4414 43.6502 32.8002 43.2085 32.8004H36.5415C36.0997 32.8004 35.7417 32.4415 35.7417 31.9996C35.7419 31.558 36.0998 31.1998 36.5415 31.1998H43.2085ZM49.0083 31.9996C49.0083 37.0248 44.8997 41.1334 39.8745 41.1334C34.8495 41.1332 30.7417 37.0247 30.7417 31.9996C30.7419 26.9747 34.8496 22.867 39.8745 22.8668C44.8996 22.8668 49.0081 26.9746 49.0083 31.9996Z"/>
  </svg>;
}
function ExchangeIcon({ size = 18, color = 'white' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="27.875 20 24 24" fill={color}>
    <path d="M31.6665 39.8668V35.6998C31.6666 35.2581 32.0246 34.9001 32.4663 34.9H36.2329C36.6747 34.9 37.0326 35.2581 37.0327 35.6998C37.0327 36.1417 36.6747 36.4996 36.2329 36.4996H34.0786C34.3331 36.7895 34.6343 37.1083 34.9829 37.4244C36.1843 38.5141 37.8525 39.5327 39.8745 39.5328C44.0327 39.5328 47.4077 36.1578 47.4077 31.9996C47.4079 31.558 47.7668 31.1998 48.2085 31.1998C48.6501 31.2 49.0081 31.5581 49.0083 31.9996C49.0083 37.0415 44.9163 41.1334 39.8745 41.1334C37.297 41.1333 35.2613 39.8358 33.9087 38.609C33.6753 38.3973 33.4625 38.1833 33.2661 37.9781V39.8668C33.266 40.3086 32.9081 40.6666 32.4663 40.6666C32.0246 40.6665 31.6666 40.3085 31.6665 39.8668ZM30.7417 31.9996C30.7419 26.9602 34.7975 22.867 39.8745 22.8668C42.8911 22.8668 45.1498 24.1272 46.6382 25.3688C46.9217 25.6053 47.1782 25.842 47.4077 26.0699V24.1334C47.4077 23.6916 47.7667 23.3336 48.2085 23.3336C48.6502 23.3338 49.0083 23.6917 49.0083 24.1334V28.3004C49.0081 28.7419 48.65 29.1 48.2085 29.1002H44.5083C44.0666 29.1002 43.7087 28.742 43.7085 28.3004C43.7085 27.8586 44.0665 27.4996 44.5083 27.4996H46.562C46.2985 27.2167 45.9837 26.9059 45.6138 26.5973C44.3251 25.5222 42.4161 24.4664 39.8745 24.4664C35.6854 24.4666 32.3415 27.8396 32.3413 31.9996C32.3413 32.4415 31.9833 32.8004 31.5415 32.8004C31.0997 32.8004 30.7417 32.4415 30.7417 31.9996Z"/>
  </svg>;
}
function ReceiveIcon({ size = 18, color = 'white' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="27.875 20 24 24" fill={color}>
    <path d="M35.292 35.333C35.9821 35.3332 36.5418 35.8929 36.542 36.583C36.542 37.2732 35.9822 37.8328 35.292 37.833C34.6016 37.833 34.042 37.2734 34.042 36.583C34.0422 35.8928 34.6017 35.333 35.292 35.333Z"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M36.334 32.709C37.8985 32.7094 39.167 33.9774 39.167 35.542V37.625C39.1668 39.1894 37.8984 40.4586 36.334 40.459H34.25C32.6854 40.4588 31.4172 39.1896 31.417 37.625V35.542C31.417 33.9773 32.6853 32.7092 34.25 32.709H36.334ZM34.25 34.209C33.5138 34.2092 32.917 34.8057 32.917 35.542V37.625C32.9172 38.3611 33.5139 38.9588 34.25 38.959H36.334C37.0699 38.9586 37.6668 38.361 37.667 37.625V35.542C37.667 34.8058 37.07 34.2094 36.334 34.209H34.25Z"/>
    <path d="M41.958 37.833C42.6483 37.833 43.2078 38.3928 43.208 39.083C43.208 39.7734 42.6484 40.333 41.958 40.333C41.2678 40.3329 40.708 39.7733 40.708 39.083C40.7082 38.3929 41.2679 37.8332 41.958 37.833Z"/>
    <path d="M46.958 37.833C47.6483 37.833 48.2078 38.3928 48.208 39.083C48.208 39.7734 47.6484 40.333 46.958 40.333C46.2678 40.3329 45.708 39.7733 45.708 39.083C45.7082 38.3929 46.2679 37.8332 46.958 37.833Z"/>
    <path d="M44.458 35.333C45.1483 35.333 45.7078 35.8928 45.708 36.583C45.708 37.2734 45.1484 37.833 44.458 37.833C43.7678 37.8329 43.208 37.2733 43.208 36.583C43.2082 35.8929 43.7679 35.3332 44.458 35.333Z"/>
    <path d="M41.958 32.833C42.6483 32.833 43.2078 33.3928 43.208 34.083C43.208 34.7734 42.6484 35.333 41.958 35.333C41.2678 35.3329 40.708 34.7733 40.708 34.083C40.7082 33.3929 41.2679 32.8332 41.958 32.833Z"/>
    <path d="M46.958 32.833C47.6483 32.833 48.2078 33.3928 48.208 34.083C48.208 34.7734 47.6484 35.333 46.958 35.333C46.2678 35.3329 45.708 34.7733 45.708 34.083C45.7082 33.3929 46.2679 32.8332 46.958 32.833Z"/>
    <path d="M35.292 26.167C35.9822 26.1672 36.542 26.7268 36.542 27.417C36.5418 28.1071 35.9821 28.6668 35.292 28.667C34.6017 28.667 34.0422 28.1072 34.042 27.417C34.042 26.7266 34.6016 26.167 35.292 26.167Z"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M36.334 23.542C37.8984 23.5424 39.1668 24.8106 39.167 26.375V28.459C39.1666 30.0233 37.8983 31.2916 36.334 31.292H34.25C32.6856 31.2918 31.4173 30.0234 31.417 28.459V26.375C31.4172 24.8105 32.6855 23.5422 34.25 23.542H36.334ZM34.25 25.042C33.5139 25.0422 32.9172 25.6389 32.917 26.375V28.459C32.9173 29.195 33.514 29.7918 34.25 29.792H36.334C37.0698 29.7916 37.6666 29.1948 37.667 28.459V26.375C37.6668 25.639 37.0699 25.0424 36.334 25.042H34.25Z"/>
    <path d="M44.458 26.167C45.1484 26.167 45.708 26.7266 45.708 27.417C45.7078 28.1072 45.1483 28.667 44.458 28.667C43.7679 28.6668 43.2082 28.1071 43.208 27.417C43.208 26.7267 43.7678 26.1671 44.458 26.167Z"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M45.5 23.542C47.0645 23.5422 48.3338 24.8105 48.334 26.375V28.459C48.3336 30.0234 47.0644 31.2918 45.5 31.292H43.417C41.8524 31.292 40.5843 30.0235 40.584 28.459V26.375C40.5842 24.8103 41.8523 23.542 43.417 23.542H45.5ZM43.417 25.042C42.6807 25.042 42.0842 25.6388 42.084 26.375V28.459C42.0843 29.1951 42.6808 29.792 43.417 29.792H45.5C46.236 29.7918 46.8336 29.1949 46.834 28.459V26.375C46.8338 25.6389 46.2361 25.0422 45.5 25.042H43.417Z"/>
  </svg>;
}

// ─── BuyAmountScreen ──────────────────────────────────────────────────────────
function BuyAmountScreen({ asset, onBack, onContinue, onPaymentTap }: {
  asset: Asset; onBack: () => void; onContinue: () => void; onPaymentTap: () => void;
}) {
  const { value, handleKey, num } = useNumPad();
  const fiat = num * asset.rate;
  const LIMIT = 50_000;
  const overLimit = fiat > LIMIT;
  const active = num > 0 && !overLimit;

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <NavBar title="Купить" onBack={onBack} />

      {/* Input section */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px 0 0' }}>
        {/* You receive */}
        <div style={{ padding: '0 16px 16px' }}>
          <Sel id="buy-receive-label" type="text" label="Лейбл «Вы получаете»" tag="div"
            baseStyle={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Вы получаете</Sel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <Sel id="buy-amount-value" type="text" label="Сумма покупки" tag="span"
                baseStyle={{ fontSize: 40, fontWeight: 600, color: '#fff', letterSpacing: '-1px' }}>{value}</Sel>
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                style={{ display: 'inline-block', width: 2, height: 36, background: P, borderRadius: 1, marginLeft: 2, flexShrink: 0, alignSelf: 'center' }} />
            </div>
            <motion.button whileTap={{ scale: 0.96 }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontFamily: 'inherit', flexShrink: 0 }}>
              <CoinIcon id={asset.id} color={asset.color} size={34} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{asset.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>Курс ≈ {asset.rate.toLocaleString('ru-RU')} ₽</div>
              </div>
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 1l4 4 4-4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
          </div>
        </div>

        <div style={{ height: 1, background: DIV, margin: '0 16px' }} />

        {/* You pay */}
        <div style={{ padding: '14px 16px 0' }}>
          <Sel id="buy-pay-label" type="text" label="Лейбл «Вы платите»" tag="div"
            baseStyle={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Вы платите</Sel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <Sel id="buy-pay-value" type="text" label="Сумма оплаты" tag="span"
                  baseStyle={{ fontSize: 40, fontWeight: 600, color: MUTED, letterSpacing: '-1px' }}>
                  {num > 0 ? Math.round(fiat).toLocaleString('ru-RU') : '0'}
                </Sel>
                <span style={{ fontSize: 14, fontWeight: 500, color: MUTED }}>₽</span>
              </div>
              <Sel id="buy-commission" type="text" label="Комиссия" tag="div"
                baseStyle={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                {num > 0 ? `Комиссия ${Math.round(fiat * 0.023).toLocaleString('ru-RU')}₽` : 'Комиссия 0₽'}
              </Sel>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onPaymentTap}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: 'inherit', flexShrink: 0 }}>
              <SberPayIcon size={34} />
              <div style={{ textAlign: 'left' }}>
                <Sel id="buy-payment-name" type="text" label="Метод оплаты" tag="div"
                  baseStyle={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>SberPay</Sel>
                <Sel id="buy-payment-limit" type="text" label="Лимит метода" tag="div"
                  baseStyle={{ fontSize: 10, color: MUTED }}>до 50 000₽</Sel>
              </div>
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 1l4 4 4-4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
          </div>
        </div>
      </div>

      <ContinueBtn
        active={active}
        hint={!overLimit ? 'Курс может измениться во время оплаты' : undefined}
        hintRed={overLimit ? 'Превышены лимиты данного способа оплаты' : undefined}
        onClick={onContinue}
      />
      <NumPad onKey={handleKey} />
    </div>
  );
}

// ─── WithdrawAmountScreen ────────────────────────────────────────────────────
function WithdrawAmountScreen({ onBack, onContinue, onAssetTap }: {
  onBack: () => void; onContinue: () => void; onAssetTap: () => void;
}) {
  const { value, handleKey, num } = useNumPad();
  const AVAILABLE = 246.04;
  const RATE = 76.98;
  const fiat = num * RATE;
  const overMax = num > AVAILABLE;
  const active = num > 0 && !overMax;

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <NavBar title="Вывести" onBack={onBack} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px 0 0' }}>
        {/* You give */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Sel id="withdraw-give-label" type="text" label="Лейбл «Вы отдаёте»" tag="span"
              baseStyle={{ fontSize: 12, color: MUTED }}>Вы отдаете</Sel>
            <motion.button whileTap={{ scale: 0.92 }} style={{ background: '#2A2A36', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>MAX</span>
            </motion.button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <motion.span animate={{ color: overMax ? '#FF3B30' : '#fff' }} style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-1px' }}>{value}</motion.span>
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                  style={{ display: 'inline-block', width: 2, height: 36, background: P, borderRadius: 1, marginLeft: 2, alignSelf: 'center' }} />
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Доступно {AVAILABLE} USDT</div>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onAssetTap}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontFamily: 'inherit', flexShrink: 0 }}>
              <CoinIcon id="usdt" color="#26A17B" size={34} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>USDT</div>
                <div style={{ fontSize: 10, color: MUTED }}>Курс ≈ {RATE} ₽</div>
              </div>
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 1l4 4 4-4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
          </div>
        </div>

        {/* Swap divider */}
        <div style={{ position: 'relative', height: 1, background: DIV, margin: '0 16px' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 32, height: 32, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3v10M5 13L2 10M5 13L8 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 13V3M11 3L8 6M11 3L14 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* You get */}
        <div style={{ padding: '14px 16px 0' }}>
          <Sel id="withdraw-receive-label" type="text" label="Лейбл «Вы получаете»" tag="div"
            baseStyle={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Вы получаете</Sel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <Sel id="withdraw-fiat-value" type="text" label="Сумма вывода (₽)" tag="span"
                  baseStyle={{ fontSize: 40, fontWeight: 600, color: MUTED, letterSpacing: '-1px' }}>
                  {num > 0 ? Math.round(fiat).toLocaleString('ru-RU') : '0'}
                </Sel>
                <span style={{ fontSize: 14, fontWeight: 500, color: MUTED }}>₽</span>
              </div>
              <Sel id="withdraw-commission" type="text" label="Комиссия" tag="div"
                baseStyle={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                {num > 0 ? `Комиссия ${Math.round(fiat * 0.023).toLocaleString('ru-RU')}₽` : 'Комиссия 0₽'}
              </Sel>
            </div>
            <motion.button whileTap={{ scale: 0.96 }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: 'inherit', flexShrink: 0 }}>
              <SbpIcon size={34} />
              <div style={{ textAlign: 'left' }}>
                <Sel id="withdraw-method-name" type="text" label="Метод вывода" tag="div"
                  baseStyle={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>СБП</Sel>
                <Sel id="withdraw-method-rate" type="text" label="Курс метода" tag="div"
                  baseStyle={{ fontSize: 10, color: MUTED }}>Курс ≈ {RATE} ₽</Sel>
              </div>
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 1l4 4 4-4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
          </div>
        </div>
      </div>

      <ContinueBtn
        active={active}
        hint={!overMax ? 'Курс может измениться во время операции' : undefined}
        hintRed={overMax ? 'Недостаточно денежных средств' : undefined}
        onClick={onContinue}
      />
      <NumPad onKey={handleKey} />
    </div>
  );
}

// ─── ExchangeSelectScreen ─────────────────────────────────────────────────────
function ExchangeSelectScreen({ onBack, onSelect }: {
  onBack: () => void; onSelect: (a: typeof EXCHANGE_ASSETS[number] | typeof TON) => void;
}) {
  const all = [...EXCHANGE_ASSETS];
  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <NavBar title="Обменять" onBack={onBack} />
      <div style={{ padding: '16px 16px 8px' }}>
        <Sel id="exchange-select-header" type="text" label="Заголовок выбора" tag="p"
          baseStyle={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>
          Выберите валюту для обмена
        </Sel>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {all.map((a, i) => (
          <motion.button key={a.id} whileTap={{ scale: 0.98 }} onClick={() => onSelect(a as any)}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderTop: i > 0 ? `1px solid ${DIV}` : 'none',
            }}>
            <CoinIcon id={a.id} color={a.color} size={40} />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{a.name}</span>
          </motion.button>
        ))}
      </div>
      <HomeBar />
    </div>
  );
}

// ─── ExchangeAmountScreen ─────────────────────────────────────────────────────
function ExchangeAmountScreen({ sourceAsset, targetAsset, onBack, onContinue, onTargetTap }: {
  sourceAsset: typeof EXCHANGE_ASSETS[number] | typeof TON;
  targetAsset: typeof EXCHANGE_ASSETS[number] | typeof TON;
  onBack: () => void; onContinue: () => void; onTargetTap: () => void;
}) {
  const { value, handleKey, num } = useNumPad();
  const AVAILABLE = sourceAsset.avail as number;
  const toRate = (targetAsset.rate as number) > 0 ? (sourceAsset.rate as number) / (targetAsset.rate as number) : 0;
  const receiveAmt = num * toRate;
  const active = num > 0 && num <= AVAILABLE;
  const overMax = num > AVAILABLE;

  const formatReceive = (n: number) => {
    if (n === 0) return '0';
    if (n < 0.01) return n.toFixed(6).replace('.', ',');
    if (n < 1) return n.toFixed(4).replace('.', ',');
    return n.toFixed(2).replace('.', ',');
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <NavBar title="Обменять" onBack={onBack} />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px 0 0' }}>
        {/* You give */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Sel id="exchange-pay-label" type="text" label="Лейбл «Вы платите»" tag="span"
              baseStyle={{ fontSize: 12, color: MUTED }}>Вы платите</Sel>
            <Sel id="exchange-available" type="text" label="Доступный баланс" tag="span"
              baseStyle={{ fontSize: 12, color: MUTED }}>Доступно: {AVAILABLE.toLocaleString('ru-RU')} {(sourceAsset.name as string).includes('oin') || (sourceAsset.name as string).includes('on') ? sourceAsset.name : (sourceAsset as any).id?.toUpperCase() ?? sourceAsset.name}</Sel>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <motion.span animate={{ color: overMax ? '#FF3B30' : '#fff' }} style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-1px' }}>{value}</motion.span>
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
                  style={{ display: 'inline-block', width: 2, height: 36, background: P, borderRadius: 1, marginLeft: 2, alignSelf: 'center' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', flexShrink: 0 }}>
              <CoinIcon id={sourceAsset.id} color={sourceAsset.color} size={34} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{sourceAsset.name === 'USDT' ? 'USDT' : sourceAsset.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Swap divider */}
        <div style={{ position: 'relative', height: 1, background: DIV, margin: '0 16px' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 32, height: 32, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3v10M5 13L2 10M5 13L8 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 13V3M11 3L8 6M11 3L14 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* You get */}
        <div style={{ padding: '14px 16px 0' }}>
          <Sel id="exchange-receive-label" type="text" label="Лейбл «Вы получаете»" tag="div"
            baseStyle={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Вы получаете</Sel>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Sel id="exchange-receive-value" type="text" label="Сумма получения" tag="span"
                baseStyle={{ fontSize: 40, fontWeight: 600, color: MUTED, letterSpacing: '-1px' }}>
                {num > 0 ? formatReceive(receiveAmt) : '0'}
              </Sel>
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onTargetTap}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontFamily: 'inherit', flexShrink: 0 }}>
              <CoinIcon id={targetAsset.id} color={targetAsset.color} size={34} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{targetAsset.name}</div>
              </div>
              <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 1l4 4 4-4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.button>
          </div>
        </div>
      </div>

      <ContinueBtn
        active={active}
        hint={!overMax ? 'Курс может измениться во время операции' : undefined}
        hintRed={overMax ? 'Недостаточно средств для обмена' : undefined}
        onClick={onContinue}
      />
      <NumPad onKey={handleKey} />
    </div>
  );
}

// ─── ProcessingScreen ─────────────────────────────────────────────────────────
function ProcessingScreen({ title, type, subtitle, note, timer, btnPrimary, btnSecondary, onPrimary, onSecondary }: {
  title: string; type: 'loading' | 'success' | 'error';
  subtitle: string; note?: string; timer?: boolean;
  btnPrimary: string; btnSecondary?: string;
  onPrimary: () => void; onSecondary?: () => void;
}) {
  const [secs, setSecs] = useState(4 * 60 + 31);
  useEffect(() => {
    if (!timer || type !== 'loading') return;
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [timer, type]);

  const mm = Math.floor(secs / 60).toString().padStart(2, '0');
  const ss = (secs % 60).toString().padStart(2, '0');

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0 }}>
        <div style={{ width: 44 }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#fff' }}>{title}</div>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onPrimary}
          style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </motion.button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '0 24px' }}>
        <ProcessingOrb type={type} />

        <div style={{ textAlign: 'center' }}>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ margin: '0 0 10px' }}>
            <Sel id="processing-subtitle" type="text" label="Статус операции" tag="span"
              baseStyle={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>
              {subtitle}
            </Sel>
          </motion.p>
          {note && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              style={{ margin: 0 }}>
              <Sel id="processing-note" type="text" label="Примечание" tag="span"
                baseStyle={{ fontSize: 14, color: MUTED, lineHeight: 1.5, display: 'block' }}>
                {note}
              </Sel>
            </motion.p>
          )}
        </div>

        {timer && type === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ textAlign: 'center' }}>
            <Sel id="processing-timer-label" type="text" label="Подпись таймера" tag="p"
              baseStyle={{ fontSize: 12, color: MUTED, margin: '0 0 6px' }}>
              Подтвердите оплату в течение:
            </Sel>
            <Sel id="processing-timer" type="text" label="Таймер" tag="p"
              baseStyle={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '0.04em' }}>
              {mm}:{ss}
            </Sel>
          </motion.div>
        )}
      </div>

      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {btnSecondary && onSecondary && (
          <Sel id="processing-btn-secondary" type="container" label="Вторичная кнопка"
            baseStyle={{ width: '100%', height: 56, borderRadius: 28, background: 'none', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onSecondary}
              style={{ width: '100%', height: '100%', borderRadius: 28, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Sel id="processing-btn-secondary-label" type="text" label="Текст кнопки" tag="span"
                baseStyle={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
                {btnSecondary}
              </Sel>
            </motion.button>
          </Sel>
        )}
        <Sel id="processing-btn-primary" type="container" label="Главная кнопка"
          baseStyle={{ width: '100%', height: 56, borderRadius: 28, background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onPrimary}
            style={{ width: '100%', height: '100%', borderRadius: 28, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Sel id="processing-btn-primary-label" type="text" label="Текст кнопки" tag="span"
              baseStyle={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
              {btnPrimary}
            </Sel>
          </motion.button>
        </Sel>
      </div>
      <HomeBar />
    </div>
  );
}

// ─── Shared inspector row components (must live outside parent to keep DOM stable) ─
function INumRow({ label, k, min, max, step = 1, def, ov, upd }: {
  label: string; k: string; min: number; max: number; step?: number; def?: number;
  ov: Record<string, any>; upd: (k: string, v: any) => void;
}) {
  const cur = ov[k] ?? def ?? Math.round((min + max) / 2);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 1 }}>{label}</span>
      <input type="number" min={min} max={max} step={step} value={cur}
        onChange={e => { const v = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value); if (!isNaN(v) && v >= min && v <= max) upd(k, v); }}
        style={{ width: 52, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: '#fff', fontFamily: 'monospace', textAlign: 'right', appearance: 'textfield', WebkitAppearance: 'textfield' } as React.CSSProperties}
      />
    </div>
  );
}

function IColorRow({ label, k, def = '#ffffff', ov, upd }: {
  label: string; k: string; def?: string;
  ov: Record<string, any>; upd: (k: string, v: any) => void;
}) {
  const cur = ov[k] ?? def;
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="color" value={cur.length === 7 ? cur : '#ffffff'} onChange={e => upd(k, e.target.value)}
          style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none', padding: 0 }} />
        <input type="text" value={cur}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) upd(k, e.target.value); }}
          style={{ width: 62, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '2px 5px', fontSize: 10, color: '#fff', fontFamily: 'monospace' }} />
      </div>
    </label>
  );
}

// ─── GradientBar ──────────────────────────────────────────────────────────────
function GradientBar({ ov, upd }: { ov: Record<string,any>; upd: (k:string,v:any)=>void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [selStop, setSelStop] = useState<'from'|'to'>('to');
  const draggingRef = useRef<'from'|'to'|null>(null);
  const updRef = useRef(upd);
  updRef.current = upd;

  const c1 = ov.colorFrom ?? '#111115';
  const a1 = ov.alphaFrom ?? 0;
  const p1 = ov.posFrom ?? 0;
  const c2 = ov.colorTo ?? '#111115';
  const a2 = ov.alphaTo ?? 1;
  const p2 = ov.posTo ?? 100;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const which = draggingRef.current;
      if (!which || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pct = Math.round(Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100)));
      updRef.current(which === 'from' ? 'posFrom' : 'posTo', pct);
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startDrag = (which: 'from'|'to', e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSelStop(which);
    draggingRef.current = which;
  };

  // Explicit 4-stop CSS: start color fills 0→p1, transition p1→p2, end color fills p2→100
  const gradCss = `linear-gradient(90deg, ${hexToRgba(c1,a1)} 0%, ${hexToRgba(c1,a1)} ${p1}%, ${hexToRgba(c2,a2)} ${p2}%, ${hexToRgba(c2,a2)} 100%)`;
  const CHECKER = 'linear-gradient(45deg,#bbb 25%,transparent 25%),linear-gradient(-45deg,#bbb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#bbb 75%),linear-gradient(-45deg,transparent 75%,#bbb 75%)';

  const stops: { id: 'from'|'to'; pos: number; color: string; alpha: number }[] = [
    { id: 'from', pos: p1, color: c1, alpha: a1 },
    { id: 'to',   pos: p2, color: c2, alpha: a2 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Bar + handles */}
      <div style={{ position: 'relative', paddingBottom: 14 }}>
        <div ref={barRef} style={{ position: 'relative', height: 22, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: CHECKER, backgroundSize: '8px 8px', backgroundPosition: '0 0,0 4px,4px -4px,-4px 0' }} />
          <div style={{ position: 'absolute', inset: 0, background: gradCss }} />
        </div>
        {/* Stop handles */}
        {stops.map(s => (
          <div key={s.id} onMouseDown={e => startDrag(s.id, e)} style={{
            position: 'absolute', top: 26, left: `${s.pos}%`, transform: 'translateX(-50%)',
            width: 13, height: 13, borderRadius: '50%',
            background: hexToRgba(s.color, s.alpha),
            border: `2px solid ${selStop === s.id ? '#2196F3' : 'rgba(255,255,255,0.65)'}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.7)',
            cursor: 'grab',
          }} />
        ))}
      </div>
      {/* Selected stop controls */}
      {selStop === 'from' ? (<>
        <IColorRow label="Цвет"  k="colorFrom" def="#111115" ov={ov} upd={upd} />
        <INumRow   label="Alpha" k="alphaFrom" min={0} max={1} step={0.05} def={0} ov={ov} upd={upd} />
      </>) : (<>
        <IColorRow label="Цвет"  k="colorTo"   def="#111115" ov={ov} upd={upd} />
        <INumRow   label="Alpha" k="alphaTo"   min={0} max={1} step={0.05} def={1} ov={ov} upd={upd} />
      </>)}
    </div>
  );
}

// ─── Inspector ────────────────────────────────────────────────────────────────
function Inspector({ ctx }: { ctx: SelCtxT }) {
  const sel = ctx.selections;
  const n   = sel.length;

  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 0, right: -252, width: 244,
    background: 'rgba(18,18,26,0.97)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
    padding: '12px 14px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: 10,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)', fontFamily: 'inherit',
    maxHeight: 720, overflowY: 'auto',
  };

  if (n === 0) return (
    <div style={panelStyle}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Inspector</span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" opacity="0.22">
          <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2"/>
          <path d="M18 18l7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 1.5 }}>
          Кликни на элемент,<br/>чтобы его настроить
        </span>
      </div>
    </div>
  );

  if (n > 1) return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{n} элемента</span>
        <button onClick={ctx.clearSel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {sel.map(s => (
          <span key={s.id} style={{ background: 'rgba(122,69,229,0.2)', border: '1px solid rgba(122,69,229,0.4)', color: '#a07ee6', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <button onClick={ctx.groupSel}
        style={{ background: 'rgba(122,69,229,0.15)', border: '1px solid rgba(122,69,229,0.35)', borderRadius: 10, padding: '9px 0', fontSize: 12, fontWeight: 600, color: '#a07ee6', cursor: 'pointer', fontFamily: 'inherit' }}>
        Объединить в контейнер
      </button>
    </div>
  );

  const item = sel[0];
  const ov   = ctx.overrides[item.id] ?? {};
  const upd  = (k: string, v: any) => ctx.setOv(item.id, { ...ov, [k]: v });
  const hasOv = Object.keys(ov).length > 0;

  const typeLabel = { text: 'Текст', icon: 'Иконка', container: 'Контейнер' }[item.type];
  const typeColor = { text: '#34C759', icon: '#2196F3', container: '#FF9500' }[item.type];

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: typeColor + '22', border: `1px solid ${typeColor}55`, color: typeColor, fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {typeLabel}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</span>
        </div>
        <button onClick={ctx.clearSel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
      </div>

      {item.type === 'text' && (
        <>
          <INumRow label="Font size"   k="fontSize"   min={8}   max={64}  def={16}  ov={ov} upd={upd} />
          <INumRow label="Line height" k="lineHeight" min={10}  max={60}  def={22}  ov={ov} upd={upd} />
          <INumRow label="Font weight" k="fontWeight" min={100} max={900} def={400} step={100} ov={ov} upd={upd} />
          <IColorRow label="Color" k="color" ov={ov} upd={upd} />
        </>
      )}

      {item.type === 'icon' && (
        <>
          <INumRow label="Size" k="size" min={12} max={56} def={18} ov={ov} upd={upd} />
          <IColorRow label="Color" k="color" ov={ov} upd={upd} />
        </>
      )}

      {item.type === 'container' && (
        <>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '2px 0 0' }}>Padding</p>
          <INumRow label="Сверху" k="paddingTop"    min={0} max={56} def={12} ov={ov} upd={upd} />
          <INumRow label="Справа" k="paddingRight"  min={0} max={56} def={16} ov={ov} upd={upd} />
          <INumRow label="Снизу"  k="paddingBottom" min={0} max={56} def={12} ov={ov} upd={upd} />
          <INumRow label="Слева"  k="paddingLeft"   min={0} max={56} def={16} ov={ov} upd={upd} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <INumRow label="Gap"           k="gap"          min={0} max={40} def={8}  ov={ov} upd={upd} />
          <INumRow label="Border radius" k="borderRadius" min={0} max={56} def={16} ov={ov} upd={upd} />
          <IColorRow label="Background" k="background" def="#212128" ov={ov} upd={upd} />
        </>
      )}

      {hasOv && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          <button onClick={() => ctx.resetOv(item.id)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Сбросить элемент
          </button>
        </>
      )}

      {Object.keys(ctx.overrides).length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <button onClick={ctx.resetAll}
            style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 8, padding: '6px 0', fontSize: 11, color: 'rgba(255,100,90,0.8)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Сбросить все изменения
          </button>
        </>
      )}
    </div>
  );
}

// ─── BgInspector ─────────────────────────────────────────────────────────────
function BgInspector({ ctx, onClose }: { ctx: SelCtxT; onClose: () => void }) {
  const selId = ctx.bgSelId;
  const setSelId = (id: string | null) => ctx.setBgSelId(id);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 0, right: -252, width: 244,
    background: 'rgba(18,18,26,0.97)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
    padding: '12px 14px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8,
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)', fontFamily: 'inherit',
    maxHeight: 720, overflowY: 'auto',
  };

  const ov = selId ? (ctx.bgLayers[selId] ?? {}) : {};
  const upd = (k: string, v: any) => { if (selId) ctx.setBgLayer(selId, { ...ov, [k]: v }); };

  // Screen background color (separate from layer overrides)
  const screenBgOv = ctx.bgLayers['bg-screen'] ?? {};
  const updScreenBg = (k: string, v: any) => ctx.setBgLayer('bg-screen', { ...screenBgOv, [k]: v });

  const layer = selId ? BG_LAYERS.find(l => l.id === selId) : null;
  const hasSelOv = selId ? Object.keys(ctx.bgLayers[selId] ?? {}).filter(k => k !== 'hidden').length > 0 : false;
  const anyBgOv = Object.keys(ctx.bgLayers).some(id => Object.keys(ctx.bgLayers[id]).length > 0);

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Фон</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
      </div>

      {/* Screen background color */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Фон экрана</span>
        <IColorRow label="Цвет" k="color" def={BG} ov={screenBgOv} upd={updScreenBg} />
      </div>

      {/* Layers: displayed top-to-bottom = visually topmost first (like Figma) */}
      {[...ctx.layerOrder].reverse().map(lid => BG_LAYERS.find(b => b.id === lid)).filter((l): l is BgLayerDef => !!l).map(l => {
        const layerOv = ctx.bgLayers[l.id] ?? {};
        const modified = Object.keys(layerOv).some(k => k !== 'hidden');
        const isHidden = !!layerOv.hidden;
        const isSel = selId === l.id;
        const isDragging = dragId === l.id;
        const isDragOver = dragOverId === l.id && dragId !== l.id;
        return (
          <div key={l.id}
            draggable
            onDragStart={e => { e.stopPropagation(); setDragId(l.id); }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(l.id); }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              if (dragId && dragId !== l.id) {
                const display = [...ctx.layerOrder].reverse();
                const fi = display.indexOf(dragId);
                const ti = display.indexOf(l.id);
                if (fi !== -1 && ti !== -1) {
                  display.splice(fi, 1);
                  display.splice(ti, 0, dragId);
                  ctx.setLayerOrder([...display].reverse());
                }
              }
              setDragId(null); setDragOverId(null);
            }}
            onDragEnd={() => { setDragId(null); setDragOverId(null); }}
            onClick={() => setSelId(isSel ? null : l.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8,
              cursor: 'pointer',
              background: isSel ? 'rgba(33,150,243,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isDragOver ? '#2196F3' : isSel ? 'rgba(33,150,243,0.45)' : 'rgba(255,255,255,0.07)'}`,
              opacity: isHidden ? 0.4 : isDragging ? 0.3 : 1,
              transition: 'opacity 0.1s',
            }}>
            <div style={{ cursor: 'grab', color: 'rgba(255,255,255,0.22)', fontSize: 13, lineHeight: 1, flexShrink: 0, userSelect: 'none' }}
              onClick={e => e.stopPropagation()}>⠿</div>
            <span style={{ fontSize: 11, color: '#fff', flex: 1, fontWeight: isSel ? 600 : 400 }}>{l.label}</span>
            {modified && <span style={{ fontSize: 8, color: '#2196F3' }}>●</span>}
            <button onClick={e => { e.stopPropagation(); const cur = ctx.bgLayers[l.id] ?? {}; ctx.setBgLayer(l.id, { ...cur, hidden: !isHidden }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', lineHeight: 1, opacity: 0.65, flexShrink: 0 }}>
              {isHidden ? (
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5S3 1 7 1s6 4 6 4-2 4-6 4-6-4-6-4Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2"/><path d="M1.5 8.5l11-7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" strokeLinecap="round"/></svg>
              ) : (
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5S3 1 7 1s6 4 6 4-2 4-6 4-6-4-6-4Z" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2"/><circle cx="7" cy="5" r="1.5" fill="rgba(255,255,255,0.6)"/></svg>
              )}
            </button>
          </div>
        );
      })}

      {layer && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '2px 0 0' }}>{layer.label}</p>

          {layer.kind === 'ellipse' && (<>
            <INumRow label="X"       k="x"    min={-400} max={500} def={layer.def.x}    ov={ov} upd={upd} />
            <INumRow label="Y"       k="y"    min={-200} max={800} def={layer.def.y}    ov={ov} upd={upd} />
            <INumRow label="Ширина"  k="w"    min={50}   max={700} def={layer.def.w}    ov={ov} upd={upd} />
            <INumRow label="Высота"  k="h"    min={50}   max={700} def={layer.def.h}    ov={ov} upd={upd} />
            <INumRow label="Blur"    k="blur" min={0}    max={300} def={layer.def.blur} ov={ov} upd={upd} />
            <INumRow label="Opacity" k="opacity" min={0} max={1} step={0.05} def={1}   ov={ov} upd={upd} />
            <IColorRow label="Цвет" k="color" def={layer.def.color} ov={ov} upd={upd} />
          </>)}

          {layer.kind === 'dotgrid' && (<>
            <INumRow label="Прозрачность точек" k="dotOpacity" min={0} max={1} step={0.01} def={0.14} ov={ov} upd={upd} />
            <INumRow label="Размер сетки"       k="gridSize"   min={8} max={60}            def={20}   ov={ov} upd={upd} />
            <INumRow label="Opacity"            k="opacity"    min={0} max={1}  step={0.05} def={0.9} ov={ov} upd={upd} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Позиция маски</span>
            <INumRow label="X"      k="maskX" min={-400} max={800} step={1} def={343} ov={ov} upd={upd} />
            <INumRow label="Y"      k="maskY" min={-400} max={800} step={1} def={-9}  ov={ov} upd={upd} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Размер маски</span>
            <INumRow label="Ширина" k="maskW" min={10} max={800} step={1} def={242} ov={ov} upd={upd} />
            <INumRow label="Высота" k="maskH" min={10} max={800} step={1} def={251} ov={ov} upd={upd} />
          </>)}

          {layer.kind === 'gradient' && (<>
            <INumRow label="Угол" k="angle" min={0} max={360} step={1} def={180} ov={ov} upd={upd} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <GradientBar ov={ov} upd={upd} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <INumRow label="Opacity" k="opacity" min={0} max={1} step={0.05} def={1} ov={ov} upd={upd} />
          </>)}

          {layer.kind === 'solid' && (<>
            <INumRow label="Высота" k="height" min={100} max={832} def={432} ov={ov} upd={upd} />
            <IColorRow label="Цвет" k="color" def={BG} ov={ov} upd={upd} />
          </>)}

          {hasSelOv && (<>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <button onClick={() => { if (selId) ctx.resetBgLayer(selId); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Сбросить слой
            </button>
          </>)}
        </>
      )}

      {anyBgOv && (<>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <button onClick={ctx.resetAllBg}
          style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.25)', borderRadius: 8, padding: '6px 0', fontSize: 11, color: 'rgba(255,100,90,0.8)', cursor: 'pointer', fontFamily: 'inherit' }}>
          Сбросить фон
        </button>
      </>)}
    </div>
  );
}

// ─── HomeBar ───────────────────────────────────────────────────────────────────
function HomeBar() {
  return (
    <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'inherit', flexShrink: 0 }}>
      <div style={{ width: 134, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.3)' }} />
    </div>
  );
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

function BuyAssetSheet({ onClose, onSelect }: { onClose: () => void; onSelect: (a: Asset) => void }) {
  const buy = ASSETS.slice(0, 4);
  return (
    <BottomSheetWrap onClose={onClose}>
      <div style={{ padding: '4px 16px 10px' }}>
        <Sel id="sheet-buy-title" type="text" label="Заголовок шита «Купить»" tag="p"
          baseStyle={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Купить</Sel>
      </div>
      {buy.map((a, i) => (
        <motion.button key={a.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(a)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
          <CoinIcon id={a.id} color={a.color} size={40} />
          <Sel id={`sheet-buy-name-${a.id}`} type="text" label={`${a.name} в шите`} tag="span"
            baseStyle={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{a.name}</Sel>
        </motion.button>
      ))}
      <div style={{ height: 24 }} />
    </BottomSheetWrap>
  );
}

function WithdrawMethodSheet({ onClose, onSelect }: { onClose: () => void; onSelect: (m: 'sbp' | 'crypto') => void }) {
  return (
    <BottomSheetWrap onClose={onClose}>
      <div style={{ padding: '4px 16px 10px' }}>
        <Sel id="sheet-withdraw-title" type="text" label="Заголовок шита «Вывести»" tag="p"
          baseStyle={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Вывести</Sel>
      </div>
      {[
        { id: 'sbp' as const, label: 'СБП', icon: <SbpIcon size={40} /> },
        { id: 'crypto' as const, label: 'Криптовалюта', icon: (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2A2A3A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke={MUTED} strokeWidth="1.8"/>
              <path d="M8 12h8M12 8v8" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
        )},
      ].map((m, i) => (
        <motion.button key={m.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(m.id)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
          {m.icon}
          <Sel id={`sheet-withdraw-method-${m.id}`} type="text" label={`Метод ${m.label}`} tag="span"
            baseStyle={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{m.label}</Sel>
        </motion.button>
      ))}
      <div style={{ height: 24 }} />
    </BottomSheetWrap>
  );
}

function BuyMethodSheet({ onClose, onSelect }: { onClose: () => void; onSelect: (m: 'sberpay' | 'sbp') => void }) {
  return (
    <BottomSheetWrap onClose={onClose}>
      <div style={{ padding: '4px 16px 10px' }}>
        <Sel id="sheet-pay-method-title" type="text" label="Заголовок «Способ оплаты»" tag="p"
          baseStyle={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Способ оплаты</Sel>
      </div>
      {[
        { id: 'sberpay' as const, label: 'SberPay', sub: 'до 600 тыс.', icon: <SberPayIcon size={40} /> },
        { id: 'sbp' as const, label: 'СБП', sub: 'до 100 тыс.', icon: <SbpIcon size={40} /> },
      ].map((m, i) => (
        <motion.button key={m.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(m.id)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
          {m.icon}
          <div style={{ flex: 1, textAlign: 'left' }}>
            <Sel id={`sheet-pay-method-name-${m.id}`} type="text" label={`Название ${m.label}`} tag="div"
              baseStyle={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{m.label}</Sel>
          </div>
          <Sel id={`sheet-pay-method-limit-${m.id}`} type="text" label={`Лимит ${m.label}`} tag="span"
            baseStyle={{ fontSize: 14, color: MUTED }}>{m.sub}</Sel>
        </motion.button>
      ))}
      <div style={{ height: 24 }} />
    </BottomSheetWrap>
  );
}

function WithdrawAssetSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheetWrap onClose={onClose}>
      <div style={{ padding: '4px 16px 10px' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Выберите актив</p>
      </div>
      {[ASSETS[0], ASSETS[1]].map((a, i) => (
        <motion.button key={a.id} whileTap={{ scale: 0.97 }} onClick={onClose}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
          <CoinIcon id={a.id} color={a.color} size={40} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{a.name}</div>
            <div style={{ fontSize: 14, color: MUTED }}>{a.sub}</div>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{a.val}</span>
        </motion.button>
      ))}
      <div style={{ height: 24 }} />
    </BottomSheetWrap>
  );
}

function WithdrawConfirmSheet({ amount, onClose, onConfirm }: { amount: string; onClose: () => void; onConfirm: () => void }) {
  const num = parseFloat(amount.replace(',', '.')) || 180.23;
  const fiat = Math.round(num * 76.98);
  const commission = Math.round(fiat * 0.023);
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <Overlay onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: SHEET, borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column', maxHeight: '92%',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '10px auto 0' }} />

        {/* Title */}
        <div style={{ textAlign: 'center', padding: '16px 16px 0' }}>
          <p style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Подтверждение вывода</p>
        </div>

        {/* Amount display */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 0', gap: 8 }}>
          <CoinIcon id="usdt" color="#26A17B" size={56} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 600, color: '#fff' }}>{amount || '180,23'}</span>
            <span style={{ fontSize: 14, color: MUTED }}>USDT</span>
          </div>
          <div style={{ background: 'rgba(180,141,255,0.15)', borderRadius: 10, padding: '4px 12px' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#B48DFF' }}>{fiat.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        {/* Details card */}
        <div style={{ margin: '20px 16px 0', background: 'rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
          {[
            { label: 'Курс', value: `${(76.98 + Math.random() * 3).toFixed(2)} ₽/USDT` },
            { label: 'Банк', value: 'Сбербанк' },
            { label: 'Комиссия', value: `${commission.toLocaleString('ru-RU')}₽` },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
              <span style={{ fontSize: 16, color: MUTED }}>{row.label}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Agree checkbox */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setAgreed(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', fontFamily: 'inherit' }}>
          <motion.div animate={{ background: agreed ? P : 'transparent', borderColor: agreed ? P : 'rgba(255,255,255,0.3)' }}
            style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {agreed && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4 7.5L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </motion.div>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#fff', textAlign: 'left' }}>Даю согласие на автообмен</span>
        </motion.button>

        {/* Button */}
        <div style={{ padding: '0 16px 20px' }}>
          <motion.button whileTap={{ scale: 0.98 }} onClick={onConfirm}
            style={{ width: '100%', height: 56, borderRadius: 28, background: P, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'inherit' }}>
            Вывести
          </motion.button>
        </div>
        <HomeBar />
      </motion.div>
    </>
  );
}

function ExchangeTargetSheet({ onClose, onSelect, current }: {
  onClose: () => void;
  onSelect: (a: typeof EXCHANGE_ASSETS[number] | typeof TON) => void;
  current: string;
}) {
  const targets = [ASSETS[1], ASSETS[2], ASSETS[0], ASSETS[3], ASSETS[4], ASSETS[5], TON] as any[];
  return (
    <BottomSheetWrap onClose={onClose}>
      <div style={{ padding: '4px 16px 10px' }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: '#fff', margin: 0 }}>Актив для обмена</p>
      </div>
      {targets.map((a: any, i: number) => (
        <motion.button key={a.id} whileTap={{ scale: 0.97 }} onClick={() => onSelect(a)}
          style={{ width: '100%', background: a.id === current ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
          <CoinIcon id={a.id} color={a.color} size={40} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{a.name}</div>
          </div>
          {a.id === current && (
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M1 6l4.5 4.5L15 1" stroke={P} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </motion.button>
      ))}
      <div style={{ height: 24 }} />
    </BottomSheetWrap>
  );
}

function ExchangeConfirmSheet({ sourceAsset, targetAsset, amount, onClose, onConfirm }: {
  sourceAsset: any; targetAsset: any; amount: string;
  onClose: () => void; onConfirm: () => void;
}) {
  const num = parseFloat(amount.replace(',', '.')) || 246.04;
  const toRate = targetAsset.rate > 0 ? sourceAsset.rate / targetAsset.rate : 0;
  const receive = num * toRate;

  const formatAmt = (n: number) => {
    if (n < 0.0001) return n.toFixed(8).replace('.', ',');
    if (n < 1) return n.toFixed(5).replace('.', ',');
    return n.toFixed(4).replace('.', ',');
  };

  return (
    <>
      <Overlay onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50, background: SHEET, borderRadius: '24px 24px 0 0', maxHeight: '92%', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '10px auto 0' }} />

        <div style={{ textAlign: 'center', padding: '16px 16px 0' }}>
          <p style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: 0 }}>Подтверждение</p>
        </div>

        {/* Icons overlap */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 0', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CoinIcon id={sourceAsset.id} color={sourceAsset.color} size={48} />
            <div style={{ marginLeft: -12, zIndex: 1, border: '2px solid ' + SHEET, borderRadius: '50%' }}>
              <CoinIcon id={targetAsset.id} color={targetAsset.color} size={48} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 600, color: '#fff' }}>{amount || '246,04'}</span>
              <span style={{ fontSize: 14, color: MUTED }}>USDT</span>
            </div>
            <div style={{ fontSize: 16, color: MUTED, marginTop: 4 }}>{formatAmt(receive)} {targetAsset.name === 'Bitcoin' ? 'BTC' : targetAsset.name}</div>
          </div>
        </div>

        {/* Details */}
        <div style={{ margin: '20px 16px 0', background: 'rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden' }}>
          {[
            { label: 'Курс', value: `1 USDT / ${formatAmt(toRate)} ${targetAsset.name === 'Bitcoin' ? 'BTC' : targetAsset.name}` },
            { label: 'Отдаю', value: `${amount || '246,04'} USDT` },
            { label: 'Получаю', value: `${formatAmt(receive)} ${targetAsset.name === 'Bitcoin' ? 'BTC' : targetAsset.name}` },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderTop: i > 0 ? `1px solid ${DIV}` : 'none' }}>
              <span style={{ fontSize: 16, color: MUTED }}>{row.label}</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 16px 20px' }}>
          <motion.button whileTap={{ scale: 0.98 }} onClick={onConfirm}
            style={{ width: '100%', height: 56, borderRadius: 28, background: P, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'inherit' }}>
            Подтвердить
          </motion.button>
        </div>
        <HomeBar />
      </motion.div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function WalletApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [buyAsset, setBuyAsset] = useState<Asset>(ASSETS[0]);
  const [buyAmount, setBuyAmount] = useState('180,23');
  const [withdrawAmount, setWithdrawAmount] = useState('180,23');
  const [exchangeSource, setExchangeSource] = useState<any>(ASSETS[0]);
  const [exchangeTarget, setExchangeTarget] = useState<any>(ASSETS[1]);
  const [exchangeAmount, setExchangeAmount] = useState('246,04');
  const [homeActive, setHomeActive] = useState<'buy' | 'withdraw' | 'exchange' | 'receive' | undefined>();
  const [tok] = useState<Tok>(DEFAULT_TOK);
  const [editOpen, setEditOpen] = useState(false);
  const [bgEditOpen, setBgEditOpen] = useState(false);
  const [bgSelId, setBgSelId] = useState<string | null>(null);

  // Selection system — overrides и groups персистентны через localStorage
  const [selections, setSelections] = useState<SelItem[]>([]);
  const [overrides,  setOverrides]  = useState<Record<string, Record<string, any>>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [bgLayers, setBgLayersState] = useState<Record<string, Record<string, any>>>({});
  const [layerOrder, setLayerOrderState] = useState<string[]>(['bg-e1','bg-e2','bg-e3','bg-solid','bg-grad','bg-dots']);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const groupCounter = useRef(0);
  // mounted.current предотвращает запись {} в LS до загрузки данных
  const mounted = useRef(false);

  // Save effects defined first so they skip on initial mount (mounted.current = false)
  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem('wallet-overrides', JSON.stringify(overrides));
  }, [overrides]);

  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem('wallet-groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem('wallet-bg', JSON.stringify(bgLayers));
  }, [bgLayers]);

  useEffect(() => {
    if (!mounted.current) return;
    localStorage.setItem('wallet-layer-order', JSON.stringify(layerOrder));
  }, [layerOrder]);

  // Load from localStorage after mount (client-only, runs after save effects)
  useEffect(() => {
    try {
      const savedOv = JSON.parse(localStorage.getItem('wallet-overrides') ?? '{}');
      const savedGr = JSON.parse(localStorage.getItem('wallet-groups') ?? '[]');
      const savedBg = JSON.parse(localStorage.getItem('wallet-bg') ?? '{}');
      if (Object.keys(savedOv).length > 0) setOverrides(savedOv);
      if (savedGr.length > 0) setGroups(savedGr);
      if (Object.keys(savedBg).length > 0) setBgLayersState(savedBg);
      const savedOrder = JSON.parse(localStorage.getItem('wallet-layer-order') ?? 'null');
      if (Array.isArray(savedOrder) && savedOrder.length === BG_LAYERS.length) setLayerOrderState(savedOrder);
    } catch {}
    mounted.current = true;
  }, []);

  const selCtx: SelCtxT = {
    editMode: editOpen,
    bgEditMode: bgEditOpen,
    bgSelId,
    selections, overrides, hoveredId, groups, bgLayers,
    select: (item, multi) => {
      setSelections(prev => {
        if (multi) {
          const exists = prev.some(s => s.id === item.id);
          return exists ? prev.filter(s => s.id !== item.id) : [...prev, item];
        }
        if (prev.length === 1 && prev[0].id === item.id) return [];
        return [item];
      });
    },
    clearSel: () => setSelections([]),
    setOv: (id, ov) => setOverrides(prev => ({ ...prev, [id]: ov })),
    resetOv:  (id) => setOverrides(prev => { const n = { ...prev }; delete n[id]; return n; }),
    resetAll: () => { setOverrides({}); setGroups([]); setSelections([]); },
    groupSel: () => {
      if (selections.length < 2) return;
      groupCounter.current += 1;
      const gid   = `group-${groupCounter.current}`;
      const glabel = `Группа ${groupCounter.current}`;
      setGroups(prev => [...prev, { id: gid, memberIds: selections.map(s => s.id), label: glabel }]);
      setSelections([{ id: gid, type: 'container', label: glabel }]);
    },
    setHov: setHoveredId,
    setBgLayer:   (id, ov) => setBgLayersState(prev => ({ ...prev, [id]: ov })),
    resetBgLayer: (id) => setBgLayersState(prev => { const n = { ...prev }; delete n[id]; return n; }),
    resetAllBg:   () => { setBgLayersState({}); setLayerOrderState(['bg-e1','bg-e2','bg-e3','bg-solid','bg-grad','bg-dots']); },
    setBgSelId,
    layerOrder,
    setLayerOrder: setLayerOrderState,
  };

  const go = (s: Screen) => setScreen(s);

  const simulate = (processing: Screen, success: Screen, error: Screen) => {
    go(processing);
    setTimeout(() => {
      go(Math.random() > 0.25 ? success : error);
    }, 3000);
  };

  return (
    <TokCtx.Provider value={tok}>
    <SelCtx.Provider value={selCtx}>
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a1025 0%, #0a0a0c 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-inter), "Inter", sans-serif',
      padding: '32px 16px',
    }}
    onClick={() => { if (editOpen) selCtx.clearSel(); }}
    >
      {/* Phone shell */}
      <div style={{
        position: 'relative', width: 395, height: 832, borderRadius: 50, background: '#1a1a1c',
        boxShadow: '0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 40px 120px rgba(0,0,0,0.7)',
        flexShrink: 0,
      }}>
        {/* Edit mode toggle (pencil) */}
        <button onClick={(e) => { e.stopPropagation(); setEditOpen(v => !v); setBgEditOpen(false); setBgSelId(null); if (editOpen) selCtx.clearSel(); }}
          style={{
            position: 'absolute', top: -12, right: -12, width: 32, height: 32,
            borderRadius: '50%', background: editOpen ? tok.P : 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, transition: 'background 0.15s',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 2l2 2-7 7H3v-2l7-7Z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M8.5 3.5l2 2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </button>
        {/* Background editor toggle (palette) */}
        <button onClick={(e) => { e.stopPropagation(); setBgEditOpen(v => { if (v) setBgSelId(null); return !v; }); setEditOpen(false); selCtx.clearSel(); }}
          title="Редактировать фон"
          style={{
            position: 'absolute', top: 26, right: -12, width: 32, height: 32,
            borderRadius: '50%', background: bgEditOpen ? '#2196F3' : 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, transition: 'background 0.15s',
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="7" r="1" fill="#fff"/>
            <circle cx="5.5" cy="4" r="1" fill="#fff"/>
            <circle cx="8.5" cy="4" r="1" fill="#fff"/>
            <circle cx="10" cy="7" r="1" fill="#fff"/>
            <path d="M7 1.5C3.96 1.5 1.5 3.96 1.5 7c0 3.04 2.46 5.5 5.5 5.5.55 0 1-.45 1-1V11a.5.5 0 0 1 .5-.5h1.5c1.38 0 2.5-1.12 2.5-2.5 0-3.04-2.46-5.5-5.5-5.5Z" stroke="#fff" strokeWidth="1.2"/>
          </svg>
        </button>
        {editOpen && <Inspector ctx={selCtx} />}
        {bgEditOpen && <BgInspector ctx={selCtx} onClose={() => setBgEditOpen(false)} />}

        {/* Side buttons */}
        {[116, 162, 238].map((top, i) => (
          <div key={i} style={{ position: 'absolute', left: -4, top, width: 4, height: i === 0 ? 34 : 64, background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
        ))}
        <div style={{ position: 'absolute', right: -4, top: 180, width: 4, height: 96, background: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />

        {/* Screen */}
        <div style={{ position: 'absolute', inset: 10, borderRadius: 40, overflow: 'hidden', background: (selCtx.bgLayers['bg-screen'] ?? {}).color ?? tok.BG }}>
          {/* Dynamic Island */}
          <div style={{ position: 'absolute', top: 11, left: 'calc(50% - 55px)', width: 110, height: 32, background: '#000', borderRadius: 18, zIndex: 100 }} />

          <AnimatePresence mode="wait">
            {/* ── HOME ── */}
            {(screen === 'home' || screen === 'buy-sheet' || screen === 'withdraw-sheet') && (
              <motion.div key="home-layer" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <HomeScreen
                  active={screen === 'buy-sheet' ? 'buy' : screen === 'withdraw-sheet' ? 'withdraw' : homeActive}
                  onBuy={() => { setHomeActive('buy'); go('buy-sheet'); }}
                  onWithdraw={() => { setHomeActive('withdraw'); go('withdraw-sheet'); }}
                  onExchange={() => { setHomeActive('exchange'); go('exchange-select'); }}
                />
                <AnimatePresence>
                  {screen === 'buy-sheet' && (
                    <BuyAssetSheet onClose={() => go('home')} onSelect={(a) => { setBuyAsset(a); go('buy-amount'); }} />
                  )}
                  {screen === 'withdraw-sheet' && (
                    <WithdrawMethodSheet onClose={() => go('home')} onSelect={() => go('withdraw-amount')} />
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── BUY AMOUNT ── */}
            {(screen === 'buy-amount' || screen === 'buy-method-sheet') && (
              <motion.div key="buy-amount" style={{ position: 'absolute', inset: 0 }} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                <BuyAmountScreen
                  asset={buyAsset}
                  onBack={() => go('buy-sheet')}
                  onContinue={() => simulate('buy-processing', 'buy-success', 'buy-error')}
                  onPaymentTap={() => go('buy-method-sheet')}
                />
                <AnimatePresence>
                  {screen === 'buy-method-sheet' && (
                    <BuyMethodSheet onClose={() => go('buy-amount')} onSelect={() => go('buy-amount')} />
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── BUY STATES ── */}
            {screen === 'buy-processing' && (
              <motion.div key="buy-proc" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <ProcessingScreen title="Обработка покупки" type="loading"
                  subtitle="В ожидании..." note="Подтвердите оплату в мобильном приложении СберБанк Онлайн"
                  timer btnPrimary="На главную" onPrimary={() => go('home')} />
              </motion.div>
            )}
            {screen === 'buy-success' && (
              <motion.div key="buy-ok" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка покупки" type="success"
                  subtitle={`+180,23 ${buyAsset.name === 'USDT' ? 'USDT' : buyAsset.name}`}
                  note="Информация о транзакции доступна в разделе История"
                  btnPrimary="На главную" btnSecondary="Купить ещё"
                  onPrimary={() => go('home')} onSecondary={() => { setBuyAmount('0'); go('buy-amount'); }} />
              </motion.div>
            )}
            {screen === 'buy-error' && (
              <motion.div key="buy-err" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка покупки" type="error"
                  subtitle="Отклонено" note="Запрос был отклонён или истекло время оплаты"
                  btnPrimary="На главную" btnSecondary="Попробовать снова"
                  onPrimary={() => go('home')} onSecondary={() => go('buy-amount')} />
              </motion.div>
            )}

            {/* ── WITHDRAW AMOUNT ── */}
            {(screen === 'withdraw-amount' || screen === 'withdraw-asset-sheet' || screen === 'withdraw-confirm') && (
              <motion.div key="withdraw-amount" style={{ position: 'absolute', inset: 0 }} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                <WithdrawAmountScreen
                  onBack={() => go('withdraw-sheet')}
                  onContinue={() => go('withdraw-confirm')}
                  onAssetTap={() => go('withdraw-asset-sheet')}
                />
                <AnimatePresence>
                  {screen === 'withdraw-asset-sheet' && (
                    <WithdrawAssetSheet onClose={() => go('withdraw-amount')} />
                  )}
                  {screen === 'withdraw-confirm' && (
                    <WithdrawConfirmSheet
                      amount={withdrawAmount}
                      onClose={() => go('withdraw-amount')}
                      onConfirm={() => simulate('withdraw-processing', 'withdraw-success', 'withdraw-error')}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── WITHDRAW STATES ── */}
            {screen === 'withdraw-processing' && (
              <motion.div key="w-proc" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка вывода" type="loading"
                  subtitle="Обрабатываем вывод" note="Обычно операция занимает до 15 минут, в отдельных случаях — до 24 часов"
                  timer btnPrimary="На главную" onPrimary={() => go('home')} />
              </motion.div>
            )}
            {screen === 'withdraw-success' && (
              <motion.div key="w-ok" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка вывода" type="success"
                  subtitle="-246,04 USDT" note="Информация о транзакции доступна в разделе История"
                  btnPrimary="На главную" btnSecondary="Вывести ещё"
                  onPrimary={() => go('home')} onSecondary={() => go('withdraw-amount')} />
              </motion.div>
            )}
            {screen === 'withdraw-error' && (
              <motion.div key="w-err" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка вывода" type="error"
                  subtitle="Отклонено" note="Запрос был отклонён или истекло время оплаты"
                  btnPrimary="На главную" btnSecondary="Попробовать снова"
                  onPrimary={() => go('home')} onSecondary={() => go('withdraw-amount')} />
              </motion.div>
            )}

            {/* ── EXCHANGE SELECT ── */}
            {screen === 'exchange-select' && (
              <motion.div key="ex-sel" style={{ position: 'absolute', inset: 0 }} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                <ExchangeSelectScreen onBack={() => go('home')} onSelect={(a) => { setExchangeSource(a); go('exchange-amount'); }} />
              </motion.div>
            )}

            {/* ── EXCHANGE AMOUNT ── */}
            {(screen === 'exchange-amount' || screen === 'exchange-target-sheet' || screen === 'exchange-confirm') && (
              <motion.div key="ex-amt" style={{ position: 'absolute', inset: 0 }} initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -60, opacity: 0 }} transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}>
                <ExchangeAmountScreen
                  sourceAsset={exchangeSource}
                  targetAsset={exchangeTarget}
                  onBack={() => go('exchange-select')}
                  onContinue={() => go('exchange-confirm')}
                  onTargetTap={() => go('exchange-target-sheet')}
                />
                <AnimatePresence>
                  {screen === 'exchange-target-sheet' && (
                    <ExchangeTargetSheet
                      current={exchangeTarget.id}
                      onClose={() => go('exchange-amount')}
                      onSelect={(a) => { setExchangeTarget(a); go('exchange-amount'); }}
                    />
                  )}
                  {screen === 'exchange-confirm' && (
                    <ExchangeConfirmSheet
                      sourceAsset={exchangeSource}
                      targetAsset={exchangeTarget}
                      amount={exchangeAmount}
                      onClose={() => go('exchange-amount')}
                      onConfirm={() => simulate('exchange-processing', 'exchange-success', 'exchange-success')}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── EXCHANGE STATES ── */}
            {screen === 'exchange-processing' && (
              <motion.div key="ex-proc" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка обмена" type="loading"
                  subtitle="Обмен подтверждён" note="Обработка заявки может занять до 24 часов. Информация о транзакции доступна в разделе История"
                  btnPrimary="На главную" onPrimary={() => go('home')} />
              </motion.div>
            )}
            {screen === 'exchange-success' && (
              <motion.div key="ex-ok" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProcessingScreen title="Обработка обмена" type="success"
                  subtitle={`${exchangeAmount} USDT → 0,0033 ${exchangeTarget.name === 'Bitcoin' ? 'BTC' : exchangeTarget.name}`}
                  note="Информация о транзакции доступна в разделе История"
                  btnPrimary="На главную" btnSecondary="Обменять ещё"
                  onPrimary={() => go('home')} onSecondary={() => go('exchange-select')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
    </SelCtx.Provider>
    </TokCtx.Provider>
  );
}
