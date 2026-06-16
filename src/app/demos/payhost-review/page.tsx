'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Session timer ───────────────────────────────────── */
function useSessionTimer(initialSeconds = 13 * 60 + 22) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ─── Copy ────────────────────────────────────────────── */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(field);
    setTimeout(() => setCopied(null), 1800);
  }
  return { copied, copy };
}

/* ─── Icons ───────────────────────────────────────────── */
function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" stroke="#6E6E6E" strokeWidth="1.4"/>
      <path d="M10.5 5.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h1.5" stroke="#6E6E6E" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconCheck({ color = '#22c55e' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 3L5 8l5 5" stroke="#808080" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="#525252" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2.5L18 17H2L10 2.5Z" fill="#FFC300" strokeLinejoin="round"/>
      <path d="M10 8v4" stroke="#141414" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="10" cy="14.5" r="0.8" fill="#141414"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="#16A34A" strokeWidth="1.4"/>
      <path d="M7 4v3.5l2 1.5" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke="#808080" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── SBP Logo ────────────────────────────────────────── */
function SBPLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="white"/>
      <rect x="3"    y="5"  width="2.5" height="10" rx="1" fill="#5B57A2"/>
      <rect x="7"    y="9"  width="2.5" height="6"  rx="1" fill="#D90751"/>
      <rect x="11"   y="7"  width="2.5" height="8"  rx="1" fill="#FAB718"/>
      <rect x="14.5" y="5"  width="2.5" height="10" rx="1" fill="#149BC9"/>
    </svg>
  );
}

/* ─── Payhost Logo ────────────────────────────────────── */
function PayhostLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 14 : 18;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <svg width={h} height={h} viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="#141414"/>
        <path d="M6 5h4a3 3 0 0 1 0 6H7v3H6V5Z" fill="white"/>
      </svg>
      <span style={{ fontSize: size === 'sm' ? '12px' : '15px', fontWeight: 600, color: '#525252', letterSpacing: '-0.3px' }}>payhost</span>
    </div>
  );
}

/* ─── Detail row ──────────────────────────────────────── */
function DetailRow({ label, value, fieldId, copied, onCopy }: {
  label: string; value: string; fieldId: string;
  copied: string | null; onCopy: (val: string, field: string) => void;
}) {
  const isCopied = copied === fieldId;
  return (
    <div style={{ background: '#F5F5F5', borderRadius: '10px', padding: '12px 12px 12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#929BA8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#141415', letterSpacing: '-0.2px' }}>{value}</div>
      </div>
      <motion.button whileTap={{ scale: 0.88 }} onClick={() => onCopy(value, fieldId)}
        style={{ width: '36px', height: '36px', background: isCopied ? '#f0fdf4' : '#E3E3E3', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
        <AnimatePresence mode="wait">
          {isCopied
            ? <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}><IconCheck /></motion.span>
            : <motion.span key="copy"  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}><IconCopy /></motion.span>
          }
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

/* ─── Locked button — sweep fill + badge countdown ───── */
const LOCK_SECONDS = 5;

function PaidButton({ onPaid }: { onPaid: () => void }) {
  const [locked, setLocked]       = useState(true);
  const [countdown, setCountdown] = useState(LOCK_SECONDS);
  const startRef                  = useRef<number>(Date.now());

  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => {
      const elapsed   = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, LOCK_SECONDS - elapsed);
      setCountdown(Math.ceil(remaining));
      if (remaining <= 0) { setLocked(false); clearInterval(id); }
    }, 50);
    return () => clearInterval(id);
  }, [locked]);

  if (locked) {
    return (
      <div style={{ position: 'relative', height: '48px', borderRadius: '12px', overflow: 'hidden', background: '#EBEBEB', userSelect: 'none' }}>
        {/* Sweep fill */}
        <motion.div
          initial={{ width: '0%' }} animate={{ width: '100%' }}
          transition={{ duration: LOCK_SECONDS, ease: 'linear' }}
          style={{ position: 'absolute', inset: 0, background: '#141414', borderRadius: '12px' }} />
        {/* Content */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          {/* Countdown badge */}
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mixBlendMode: 'normal' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', lineHeight: 1, mixBlendMode: 'difference' }}>{countdown}</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.2px', mixBlendMode: 'difference' }}>
            Please wait
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
      whileTap={{ scale: 0.975 }} onClick={onPaid}
      style={{ width: '100%', height: '48px', background: '#141414', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.2px', fontFamily: 'inherit', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
      I've paid
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════
   INSTRUCTIONS MODAL
   ════════════════════════════════════════════════════ */
const STEPS = [
  {
    n: 1,
    title: 'Copy the details',
    desc: 'Tap the copy button next to each field — phone number, bank name, and the exact amount.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="7" y="7" width="12" height="12" rx="2.5" stroke="#141414" strokeWidth="1.6"/>
        <path d="M15 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="#141414" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: 2,
    title: 'Open your banking app',
    desc: 'Launch the Sberbank app or any app that supports SBP transfers to individuals.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="5" y="2" width="12" height="18" rx="3" stroke="#141414" strokeWidth="1.6"/>
        <circle cx="11" cy="17" r="1" fill="#141414"/>
        <path d="M8 6h6" stroke="#141414" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: 3,
    title: 'Find "Transfer by phone"',
    desc: 'In the app, select Transfers → By phone number (SBP). Paste the phone number.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 6h14M4 11h10M4 16h6" stroke="#141414" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="17" cy="16" r="3" stroke="#141414" strokeWidth="1.6"/>
        <path d="M19.5 18.5l1.5 1.5" stroke="#141414" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    n: 4,
    title: 'Enter the exact amount',
    desc: 'Type exactly 1 500 RUB. Any difference in amount will delay your payment.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M6 11h10M11 6v10" stroke="#141414" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="11" cy="11" r="8" stroke="#141414" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    n: 5,
    title: 'Confirm the transfer',
    desc: 'Approve the transaction in your bank app, then return here and tap "I\'ve paid".',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 11l5 5 9-9" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.32)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F0F0F0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#141414', letterSpacing: '-0.4px' }}>How to pay</h2>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#929BA8' }}>SBP transfer · Sberbank of Russia</p>
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={onClose}
            style={{ width: '32px', height: '32px', background: '#F5F5F5', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconClose />
          </motion.button>
        </div>

        {/* Steps */}
        <div style={{ padding: '8px 0 4px' }}>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.24, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '14px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}>

              {/* Vertical connector line */}
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', left: '35px', top: '52px', width: '1px', height: '32px', background: '#EBEBEB' }} />
              )}

              {/* Step icon bubble */}
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {step.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, paddingTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#C0C0C0', letterSpacing: '0.05em' }}>STEP {step.n}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#141414', letterSpacing: '-0.2px', marginBottom: '3px' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: '#696969', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px 24px', borderTop: '1px solid #F0F0F0' }}>
          <motion.button whileTap={{ scale: 0.98 }} onClick={onClose}
            style={{ width: '100%', height: '46px', background: '#141414', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#fff', fontFamily: 'inherit', letterSpacing: '-0.2px' }}>
            Got it
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Success screen ──────────────────────────────────── */
function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 32px', gap: '16px', textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.1 }}
        style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M5 14l7 7 11-11" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#141414', letterSpacing: '-0.4px' }}>Payment confirmed</div>
        <div style={{ fontSize: '14px', color: '#525252', marginTop: '6px', lineHeight: 1.5 }}>We're verifying your transfer.<br/>This usually takes a few minutes.</div>
      </div>
      <button onClick={onReset}
        style={{ marginTop: '8px', background: 'none', border: '1px solid #E3E3E3', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', color: '#525252', cursor: 'pointer', fontFamily: 'inherit' }}>
        Back to demo
      </button>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────── */
export default function PayhostReviewPage() {
  const sessionTimer               = useSessionTimer();
  const { copied, copy }           = useCopy();
  const [paid, setPaid]            = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [buttonKey, setButtonKey]  = useState(0);

  return (
    <>
      <div style={{ minHeight: '100dvh', background: '#F7F7F7', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, "Inter", "Helvetica Neue", sans-serif' }}>

        {/* ── Header ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #EBEBEB', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', position: 'relative' }}>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <IconBack />
          </button>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <PayhostLogo size="md" />
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#EFEFEF', border: 'none', borderRadius: '20px', padding: '6px 10px 6px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>🇬🇧</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#141414' }}>English</span>
            <IconChevronDown />
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #EBEBEB', padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>

              <AnimatePresence mode="wait">
                {paid ? (
                  <SuccessScreen key="success" onReset={() => { setPaid(false); setButtonKey(k => k + 1); }} />
                ) : (
                  <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F4F4F4', borderRadius: '20px', padding: '6px 10px 6px 8px' }}>
                        <SBPLogo size={20} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#141414' }}>СБП</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#BFFFDA', borderRadius: '20px', padding: '6px 10px 6px 8px' }}>
                        <IconClock />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#141414', fontVariantNumeric: 'tabular-nums' }}>{sessionTimer}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: '20px' }}>
                      <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 700, color: '#141414', letterSpacing: '-0.5px' }}>Top Up</h1>
                      <p style={{ margin: 0, fontSize: '14px', color: '#525252', lineHeight: 1.55 }}>
                        Open your banking app and send the payment to the specified recipient.
                      </p>
                    </div>

                    {/* Warning */}
                    <div style={{ background: '#FFF0BF', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ flexShrink: 0 }}><IconWarning /></div>
                      <span style={{ fontSize: '13px', color: '#525252', lineHeight: 1.45 }}>Please check the amount before paying.</span>
                    </div>

                    {/* Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                      <DetailRow label="Phone Number" value="+7 915 999 88 77" fieldId="phone" copied={copied} onCopy={copy} />
                      <DetailRow label="Bank"         value="Sberbank of Russia" fieldId="bank" copied={copied} onCopy={copy} />
                      <DetailRow label="Amount"       value="1 500 RUB"          fieldId="amount" copied={copied} onCopy={copy} />
                      <div style={{ background: '#F5F5F5', borderRadius: '10px', padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#525252', lineHeight: 1.6 }}>
                          Copy the details → Open the banking app → Paste details → Confirm the transfer
                        </span>
                      </div>
                    </div>

                    {/* Instructions link */}
                    <div style={{ textAlign: 'center', margin: '14px 0 14px' }}>
                      <button onClick={() => setShowInstructions(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#525252', textDecoration: 'underline', textDecorationColor: 'rgba(82,82,82,0.4)', textUnderlineOffset: '3px', fontFamily: 'inherit', padding: '4px 8px' }}>
                        How to use this data?
                      </button>
                    </div>

                    {/* Button */}
                    <div style={{ marginBottom: '20px' }}>
                      <PaidButton key={buttonKey} onPaid={() => setPaid(true)} />
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#808080' }}>Powered by</span>
                      <PayhostLogo size="sm" />
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Payment logos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px', opacity: 0.35 }}>
              {['VISA', 'MC', 'МИР'].map(l => (
                <div key={l} style={{ background: '#C2C2C2', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions modal — portal-like, outside card */}
      <AnimatePresence>
        {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      </AnimatePresence>
    </>
  );
}
