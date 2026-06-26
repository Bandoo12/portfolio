'use client';
import React, { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { motion, useMotionValue, useTransform, animate, MotionValue, AnimatePresence } from 'framer-motion';

/* MicroBet Live v2 — CustDev improvements:
   - micro-analytics hints (builds trust / "not 50/50")
   - probability fill bars on outcome buttons
   - 30s timers (users asked for more time)
   - market counter "Маркет X из Y" (removes confusion about stack depth)
*/

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const IMG = {
  zenit:   `${BASE}/img/zenit.svg`,
  spartak: `${BASE}/img/spartak.svg`,
};

const CARD_W = 314;
const GAP = 8;
const STEP = CARD_W + GAP;

const CARDS = [
  { id: 1, type: 'yesno'    as const, question: 'Будет угловой\nследующие',        timer: 30, start: 30, unit: 'секунд', period: 'в период 34:00–34:30', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '1.55', odds2: '2.40', pct1: '62%', pct2: '38%', label1: 'Да',    label2: 'Нет',     hint1: 'угловой каждые ~6 мин',  hint2: '2 угловых в тайме',     question2nd: '' },
  { id: 2, type: 'team'     as const, question: 'Кто дольше будет\nвладеть мячом', timer: 30, start: 20, unit: 'секунд', period: 'в период 34:00–34:30', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '1.70', odds2: '3.20', pct1: '67%', pct2: '33%', label1: 'Зенит', label2: 'Спартак', hint1: '67% владения за 10 мин',  hint2: 'потерял мяч 3 раза',    question2nd: '' },
  { id: 3, type: 'yesno'    as const, question: 'Будет отбор мяча\nследующие',     timer: 30, start: 24, unit: 'секунд', period: 'в период 34:00–34:30', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '2.05', odds2: '1.85', pct1: '52%', pct2: '48%', label1: 'Да',    label2: 'Нет',     hint1: 'отбор раз в ~2 мин',     hint2: '5 отборов в тайме',     question2nd: 'Ещё один отбор\nв 10 секунд?' },
  { id: 4, type: 'penalty'  as const, question: 'Забьёт Смолов?',                  timer:  8, start:  8, unit: 'секунд', period: '2 тайм. 118:20',        logo1: IMG.zenit, logo2: IMG.spartak, odds1: '1.30', odds2: '3.80', pct1: '77%', pct2: '23%', label1: 'Да',    label2: 'Нет',     hint1: '',                        hint2: '',                      question2nd: '' },
  { id: 5, type: 'line'     as const, question: '',                                 timer: 999999, start: 999999, unit: '', period: '',                    logo1: IMG.zenit, logo2: IMG.spartak, odds1: '', odds2: '', pct1: '', pct2: '', label1: '', label2: '', hint1: '', hint2: '', question2nd: '' },
  { id: 6, type: 'lineevent' as const, question: '',                                timer: 999999, start: 999999, unit: '', period: '',                    logo1: IMG.zenit, logo2: IMG.spartak, odds1: '', odds2: '', pct1: '', pct2: '', label1: '', label2: '', hint1: '', hint2: '', question2nd: '' },
];

const N = CARDS.length;
const VIRTUAL = [CARDS[N - 1], ...CARDS, CARDS[0]];

const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 } as const;
const getX = (v: number) => 23 - v * STEP;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function glowColorAt(pct: number): [number, number, number] {
  const green: [number, number, number] = [10, 220, 80];
  const amber: [number, number, number] = [230, 155, 10];
  const red:   [number, number, number] = [230, 20, 20];
  const p = Math.max(0, Math.min(1, pct));
  if (p >= 0.5) {
    const t = (1 - p) / 0.5;
    return [Math.round(lerp(green[0], amber[0], t)), Math.round(lerp(green[1], amber[1], t)), Math.round(lerp(green[2], amber[2], t))];
  }
  const t = (0.5 - p) / 0.5;
  return [Math.round(lerp(amber[0], red[0], t)), Math.round(lerp(amber[1], red[1], t)), Math.round(lerp(amber[2], red[2], t))];
}

function timerColorAt(pct: number): string {
  const p = Math.max(0, Math.min(1, pct));
  let rv: number, gv: number, bv: number;
  if (p >= 0.5) {
    const t = (1 - p) / 0.5;
    rv = Math.round(lerp(145, 224, t)); gv = Math.round(lerp(250, 190, t)); bv = Math.round(lerp(186, 104, t));
  } else {
    const t = (0.5 - p) / 0.5;
    rv = Math.round(lerp(224, 255, t)); gv = Math.round(lerp(190, 109, t)); bv = Math.round(lerp(104, 109, t));
  }
  return `rgb(${rv},${gv},${bv})`;
}

function pulseDurationAt(pct: number): number {
  const p = Math.max(0, Math.min(1, pct));
  if (p >= 0.5) return lerp(1.32, 2.42, (p - 0.5) / 0.5);
  return lerp(0.6, 1.32, p / 0.5);
}

type CardData = (typeof CARDS)[number];

function SoccerBallSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.0509 31.7733C21.7923 29.9902 21.2393 27.8676 20.5778 25.3282L18.595 17.7161L18.5601 17.582C21.1642 15.072 24.1387 12.9443 27.3932 11.2891L33.3781 15.8283C35.4298 17.3845 37.1547 18.6929 38.6818 19.5958C39.4815 20.0686 40.2867 20.468 41.1268 20.7536V31.834C40.6754 32.0443 40.2427 32.3086 39.8383 32.6263L32.7532 38.194C32.4888 38.4019 32.2437 38.6267 32.0182 38.8665L22.1983 34.6143C22.2577 33.686 22.1918 32.7447 22.0509 31.7733Z" fill="#91FABA"/>
      <path d="M14.8319 37.4096C13.7502 38.3413 12.2274 39.3808 9.93756 40.9358L7.35645 42.6892C7.61858 35.2188 10.1128 28.3171 14.1918 22.6318L15.2172 26.5684C15.9266 29.2918 16.3981 31.1179 16.6077 32.5627C16.8076 33.9406 16.7221 34.698 16.4972 35.3076C16.2741 35.9123 15.8572 36.526 14.8319 37.4096Z" fill="#91FABA"/>
      <path d="M19.4374 61.9122C21.9842 61.9122 24.1312 61.9122 25.8852 62.1183C26.8103 62.2268 27.6937 62.3988 28.5363 62.6829L33.7272 55.8908C33.5381 55.5241 33.3808 55.1369 33.2591 54.7318L30.4763 45.4683C30.3384 45.0092 30.2511 44.5436 30.212 44.0783L20.2145 39.749C19.6928 40.4043 19.0888 41.0023 18.4221 41.5769C17.0726 42.7396 15.2841 43.954 13.1556 45.3997L7.68701 49.1137C8.32725 53.7073 9.81756 58.0285 11.9937 61.9122H19.4374Z" fill="#91FABA"/>
      <path d="M43.2366 36.9508C43.435 36.7954 43.6586 36.7246 43.8768 36.7246C44.095 36.7246 44.3186 36.7954 44.517 36.9508L51.6021 42.5187C51.7909 42.6672 51.9347 42.8776 52.0098 43.1273C52.0824 43.3693 52.0857 43.633 52.0098 43.8856L49.2268 53.1494C49.1506 53.4043 49.0065 53.6067 48.8319 53.7478C48.6391 53.9037 48.4121 53.9843 48.1789 53.9843H39.5747C39.3415 53.9843 39.1145 53.9037 38.9217 53.7478C38.7471 53.6067 38.603 53.4043 38.5264 53.1494L35.7437 43.8856C35.6678 43.633 35.671 43.3693 35.7437 43.1273C35.8188 42.8776 35.9626 42.6672 36.1516 42.5187L43.2366 36.9508Z" fill="#91FABA"/>
      <path d="M49.0448 19.7107C50.591 18.8418 52.3433 17.572 54.4267 16.0618L60.8096 11.4365C63.9802 13.0845 66.8798 15.1831 69.4237 17.6476L67.4228 25.3287C66.7614 27.8682 66.2084 29.9907 65.9499 31.7738C65.8098 32.74 65.7439 33.6764 65.8014 34.5999L55.7463 38.8784C55.5179 38.6342 55.2689 38.4054 55.0005 38.1942L47.9154 32.6265C47.511 32.3087 47.0783 32.0444 46.627 31.8342V20.7979C47.4545 20.5318 48.2517 20.1566 49.0448 19.7107Z" fill="#91FABA"/>
      <path d="M41.481 14.8613C40.2592 14.1389 38.7863 13.0271 36.5773 11.3516L33.3413 8.89724C36.7015 7.87993 40.2658 7.33301 43.9578 7.33301C47.744 7.33301 51.396 7.90816 54.8313 8.97597L51.326 11.5162C49.082 13.1423 47.5863 14.2209 46.3499 14.9158C45.1748 15.5762 44.4909 15.7368 43.9072 15.7303C43.3235 15.7238 42.6426 15.5479 41.481 14.8613Z" fill="#91FABA"/>
      <path d="M69.5785 41.5766C70.9278 42.7393 72.7164 43.9537 74.8449 45.3995L80.236 49.061C79.5998 53.6741 78.1064 58.0132 75.9222 61.9116H69.1088C66.5619 61.9116 64.4151 61.9116 62.6609 62.1177C61.6973 62.2306 60.7788 62.4125 59.9047 62.7186L54.0762 55.7912C54.243 55.4542 54.3834 55.1 54.4942 54.7312L57.2772 45.4677C57.4136 45.0134 57.5005 44.5521 57.5401 44.0916L67.7759 39.7363C68.2999 40.3967 68.9075 40.9984 69.5785 41.5766Z" fill="#91FABA"/>
      <path d="M54.2973 68.2973C53.5578 69.9334 52.882 72.0186 52.0742 74.5116L50.2545 80.1271C48.2088 80.482 46.1049 80.6668 43.9577 80.6668C42.043 80.6668 40.1623 80.5198 38.3268 80.236L36.4719 74.5116C35.6641 72.0186 34.9884 69.9334 34.2486 68.2973C33.8708 67.4621 33.4506 66.6825 32.9448 65.9719L38.0426 59.3015C38.5358 59.4214 39.0491 59.4845 39.5746 59.4845H48.1788C48.7423 59.4845 49.2923 59.4115 49.8185 59.2744L55.5341 66.0673C55.0582 66.7518 54.6585 67.4991 54.2973 68.2973Z" fill="#91FABA"/>
      <path d="M31.2865 76.3518C30.4196 73.6762 29.8354 71.8862 29.2371 70.5636C28.666 69.3004 28.1955 68.7328 27.7031 68.3676C27.2171 68.0076 26.5638 67.7355 25.2434 67.5804C23.8479 67.4165 22.0259 67.4121 19.2798 67.4121H15.77C20.0159 72.5304 25.6259 76.4732 32.0417 78.6823L31.2865 76.3518Z" fill="#91FABA"/>
      <path d="M63.3027 67.5804C64.6982 67.4165 66.5202 67.4121 69.2661 67.4121H72.1456C68.0576 72.3397 62.705 76.1784 56.5864 78.4286L57.2596 76.3518C58.1264 73.6762 58.7105 71.8862 59.3089 70.5636C59.8802 69.3004 60.3506 68.7328 60.8431 68.3676C61.3289 68.0076 61.9823 67.7355 63.3027 67.5804Z" fill="#91FABA"/>
      <path d="M71.3925 32.5631C71.6023 31.1183 72.0738 29.2922 72.7833 26.5688L73.7862 22.7188C77.8177 28.3725 80.2857 35.2208 80.5574 42.6306L78.0629 40.9362C75.7731 39.3812 74.2503 38.3417 73.1687 37.41C72.1431 36.5265 71.7262 35.9127 71.5033 35.3081C71.2781 34.6984 71.1927 33.941 71.3925 32.5631Z" fill="#91FABA"/>
    </svg>
  );
}

function CheckCircleSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M80.6668 43.9997C80.6668 64.2499 64.2504 80.6663 44.0002 80.6663C23.7497 80.6663 7.3335 64.2499 7.3335 43.9997C7.3335 23.7492 23.7497 7.33301 44.0002 7.33301C64.2504 7.33301 80.6668 23.7492 80.6668 43.9997ZM58.7779 32.8885C59.8519 33.9624 59.8519 35.7036 58.7779 36.7774L40.4446 55.1108C39.3706 56.1847 37.6297 56.1847 36.5556 55.1108L29.2223 47.7774C28.1484 46.7035 28.1484 44.9625 29.2223 43.8886C30.2962 42.8146 32.0374 42.8146 33.1114 43.8886L38.5002 49.2771L46.6944 41.0828L54.8891 32.8885C55.963 31.8145 57.704 31.8145 58.7779 32.8885Z" fill="#91FABA"/>
    </svg>
  );
}

function VirtualCard({ card, i, x, vIdx, onCanvasRef, onBet, activeBet, onClearBet, onExpire, isGhost, onExpireInactive, onBetPlaced, onBetWon }: {
  card: CardData; i: number; x: MotionValue<number>; vIdx: number;
  onCanvasRef: (el: HTMLCanvasElement | null) => void;
  onBet: (label: string, odds: string, logo?: string) => void;
  activeBet: { label: string; odds: string; logo?: string } | null;
  onClearBet: () => void;
  onExpire: () => void;
  isGhost: boolean;
  onExpireInactive: (virtualIdx: number) => void;
  onBetPlaced: () => void;
  onBetWon: () => void;
}) {
  const isActive = i === vIdx;

  const [timeLeft, setTimeLeft] = useState(card.start);
  const [isExiting, setIsExiting] = useState(false);
  const [chipIdx, setChipIdx] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const chipsDrag = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null);
  const pressedChip = useRef<number | null>(null);

  const [betPlaced, setBetPlaced] = useState(false);
  const [betResult, setBetResult] = useState(false);
  const [betWon, setBetWon] = useState(true);
  const placedBetRef = useRef<{ label: string; odds: string }>({ label: '', odds: '' });

  const [scActive, setScActive]     = useState(false);
  const [scTimeLeft, setScTimeLeft] = useState(10);
  const [scLabel, setScLabel]       = useState<string | null>(null);
  const [scBetPlaced, setScBetPlaced] = useState(false);
  const [scBetWon, setScBetWon]     = useState<boolean | null>(null);

  const ballX = useMotionValue(0);
  const ballY = useMotionValue(0);
  const ballRotate = useMotionValue(0);
  const ballScale = useMotionValue(1);

  useEffect(() => {
    if (!betPlaced) {
      ballX.set(0); ballY.set(0); ballRotate.set(0); ballScale.set(1);
      return;
    }
    let alive = true;
    let phase = 0;
    const moves = [
      () => Promise.all([
        animate(ballY, [0, -38, 0], { duration: 0.65, ease: [0.22, 1, 0.36, 1] }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() + 160], { duration: 0.65 }),
      ]),
      () => Promise.all([
        animate(ballX, [0, -22, 0], { duration: 0.6 }),
        animate(ballY, [0, -12, 0], { duration: 0.6 }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() - 100], { duration: 0.6 }),
      ]),
      () => Promise.all([
        animate(ballY, [0, -24, 2, 0], { duration: 0.7, ease: 'easeOut' }),
        animate(ballScale, [1, 1.18, 0.88, 1], { duration: 0.7 }),
      ]),
      () => Promise.all([
        animate(ballX, [0, 26, 0], { duration: 0.5 }),
        animate(ballY, [0, -8, 0], { duration: 0.5 }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() + 100], { duration: 0.5 }),
      ]),
      () => Promise.all([
        animate(ballY, [0, -32, 0], { duration: 0.75 }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() - 220], { duration: 0.75 }),
        animate(ballScale, [1, 1.08, 1], { duration: 0.75 }),
      ]),
    ];
    const loop = async () => {
      while (alive) {
        await moves[phase % moves.length]();
        phase++;
        await new Promise<void>(r => setTimeout(r, 320));
      }
    };
    loop();
    return () => { alive = false; };
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!betPlaced) return;
    const won = card.id !== 3;
    const delay = card.type === 'penalty' ? 5000 : 15000;
    const t = setTimeout(() => {
      setBetWon(won);
      setBetPlaced(false);
      setBetResult(true);
      if (won) onBetWon();
      else setTimeout(() => setScActive(true), 700);
    }, delay);
    return () => clearTimeout(t);
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scActive || scBetPlaced || scBetWon !== null) return;
    if (scTimeLeft <= 0) { setIsExiting(true); return; }
    const t = setTimeout(() => setScTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [scActive, scTimeLeft, scBetPlaced, scBetWon]);

  useEffect(() => {
    if (!scBetPlaced) return;
    const t = setTimeout(() => { setScBetWon(true); onBetWon(); }, 2500);
    return () => clearTimeout(t);
  }, [scBetPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (betResult && !isActive && !isGhost) onExpireInactive(i);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => (t <= 0 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const isExpired = timeLeft === 0;

  useEffect(() => {
    if (!isExpired || !isActive || isGhost || betPlaced || betResult) return;
    onClearBet();
    const t = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(t);
  }, [isExpired, isActive, betPlaced, betResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isExpired || isActive || isGhost) return;
    onExpireInactive(i);
  }, [isExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = timeLeft / card.timer;
  const [r, g, b] = glowColorAt(pct);
  const timerColor = timerColorAt(pct);
  const pulseDuration = pulseDurationAt(pct);

  const progress = useTransform(x, (xVal: number) => {
    const dist = Math.abs(xVal + i * STEP - 23);
    return Math.max(0, 1 - dist / STEP);
  });
  const cardScale   = useTransform(progress, (t: number) => 0.88 + 0.12 * t);
  const cardOpacity = useTransform(progress, (t: number) => 0.72 + 0.28 * t);
  const cardFilter  = useTransform(progress, (t: number) => `grayscale(${(1 - t).toFixed(2)})`);

  const origin = i < vIdx ? 'right center' : 'left center';

  const initPct = card.start / card.timer;
  const [initR, initG, initB] = glowColorAt(initPct);
  const rMV = useMotionValue(initR);
  const gMV = useMotionValue(initG);
  const bMV = useMotionValue(initB);
  useEffect(() => {
    if (card.type === 'line') return;
    animate(rMV, r, { duration: 0.9, ease: 'easeOut' });
    animate(gMV, g, { duration: 0.9, ease: 'easeOut' });
    animate(bMV, b, { duration: 0.9, ease: 'easeOut' });
  }, [r, g, b]); // eslint-disable-line react-hooks/exhaustive-deps

  const pulseDurationRef = useRef(pulseDuration);
  pulseDurationRef.current = pulseDuration;

  const intensityMV = useMotionValue(0.35);
  const stepCtrlRef = useRef<{ stop: () => void } | null>(null);
  const pulseAlive  = useRef(false);
  useEffect(() => {
    pulseAlive.current = true;
    stepCtrlRef.current?.stop();

    if (card.type === 'line') {
      const ctrl = animate(intensityMV, 0.45, { duration: 0.3 });
      stepCtrlRef.current = ctrl;
      return () => { pulseAlive.current = false; ctrl.stop(); };
    }

    if (isExpired || !isActive) {
      const ctrl = animate(intensityMV, isExpired ? 0 : 0.35, { duration: 0.7, ease: 'easeOut' });
      stepCtrlRef.current = ctrl;
      return () => { pulseAlive.current = false; ctrl.stop(); };
    }

    const step = (toMax: boolean) => {
      if (!pulseAlive.current) return;
      const dur = pulseDurationRef.current / 2;
      const ctrl = animate(intensityMV, toMax ? 0.86 : 0.48, { duration: dur, ease: 'easeInOut' });
      stepCtrlRef.current = ctrl;
      ctrl.then(() => step(!toMax));
    };
    step(true);

    return () => { pulseAlive.current = false; stepCtrlRef.current?.stop(); };
  }, [isActive, isExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  const glowBoxShadow = useTransform(
    [rMV, gMV, bMV, intensityMV] as MotionValue<number>[],
    ([rv, gv, bv, iv]: number[]) =>
      `inset 0px 0px 18px 1px rgba(255,255,255,${iv.toFixed(2)}), inset 0px 1px 34px 3px rgba(${Math.round(rv)},${Math.round(gv)},${Math.round(bv)},${iv.toFixed(2)})`
  );

  const chipEllipseColor = useTransform(
    [rMV, gMV, bMV] as MotionValue<number>[],
    ([rv, gv, bv]: number[]) => `rgba(${Math.round(rv)},${Math.round(gv)},${Math.round(bv)},0.5)`
  );

  const sheetOpen = !!(activeBet && isActive);

  useEffect(() => {
    if (!sheetOpen) setKeyboardOpen(false);
  }, [sheetOpen]);

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setBetAmount(prev => Math.floor(prev / 10));
      setChipIdx(null);
    } else if (key === '') {
      setBetAmount(0);
      setChipIdx(null);
    } else {
      setBetAmount(prev => prev < 100000 ? prev * 10 + parseInt(key) : prev);
      setChipIdx(null);
    }
  };

  const BetSheetContent = () => (
    <motion.div
      initial={false}
      animate={{ height: sheetOpen ? (keyboardOpen ? 356 : 188) : 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
      style={{ overflow: 'hidden', pointerEvents: 'auto', background: '#171C1F', borderRadius: '0 0 24px 24px' }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div ref={chipsRef} style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', background: '#171C1F', padding: '12px 8px 4px', overflowX: 'auto', scrollbarWidth: 'none', cursor: 'grab', userSelect: 'none' }}
        onPointerDown={e => {
          e.stopPropagation();
          const el = chipsRef.current;
          if (!el) return;
          chipsDrag.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const d = chipsDrag.current;
          if (!d) return;
          const dx = e.clientX - d.startX;
          if (Math.abs(dx) > 4) d.moved = true;
          if (chipsRef.current) chipsRef.current.scrollLeft = d.scrollLeft - dx;
        }}
        onPointerUp={() => {
          if (!chipsDrag.current?.moved && pressedChip.current !== null) {
            const CHIPS = [{ value: 50 }, { value: 100 }, { value: 200 }, { value: 500 }, { value: 1000 }, { value: 5000 }, { value: 21214 }];
            setChipIdx(pressedChip.current);
            setBetAmount(CHIPS[pressedChip.current].value);
          }
          chipsDrag.current = null;
          pressedChip.current = null;
        }}
      >
        {[{ label: 'Мин.', value: 50 }, { label: '100 ₽', value: 100 }, { label: '200 ₽', value: 200 }, { label: '500 ₽', value: 500 }, { label: '1 000 ₽', value: 1000 }, { label: 'Макс.', value: 5000 }, { label: 'Весь банк', value: 21214 }].map((chip, idx) => (
          <div key={chip.label} onPointerDown={() => { pressedChip.current = idx; }} style={{ height: 32, background: 'rgba(255,255,255,0.07)', borderRadius: 999, padding: '0 10px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0, border: idx === chipIdx ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent', cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 400, color: idx === chipIdx ? '#eeeff3' : '#929bae' }}>{chip.label}</span>
          </div>
        ))}
      </div>
      <div style={{ background: '#171C1F', padding: '8px 8px' }}>
        <div onClick={() => setKeyboardOpen(true)} style={{ height: 56, background: 'rgba(0,0,0,0.2)', borderRadius: 22, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, cursor: 'text' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            {betAmount === 0 && !keyboardOpen ? (
              <span style={{ fontSize: 16, fontWeight: 400, color: '#555f71' }}>Введите сумму</span>
            ) : betAmount === 0 ? (
              <span style={{ fontSize: 16, fontWeight: 600, color: '#eeeff3', display: 'flex', alignItems: 'center' }}>0<span style={{ display: 'inline-block', width: 2, height: 18, background: '#eeeff3', borderRadius: 1, marginLeft: 2, animation: 'cursor-blink 1s steps(1) infinite' }} /></span>
            ) : (
              <>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#eeeff3', display: 'flex', alignItems: 'center' }}>{betAmount.toLocaleString('ru-RU')}{keyboardOpen && <span style={{ display: 'inline-block', width: 2, height: 18, background: '#eeeff3', borderRadius: 1, marginLeft: 2, animation: 'cursor-blink 1s steps(1) infinite' }} />}</span>
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5H11M11 5L7.5 1M11 5L7.5 9" stroke="#929bae" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#929bae' }}>{activeBet ? Math.round(betAmount * parseFloat(activeBet.odds)).toLocaleString('ru-RU') : '—'}</span>
              </>
            )}
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)', flexShrink: 0, margin: '0 12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, color: '#555f71', lineHeight: '13px' }}>Баланс</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#eeeff3', lineHeight: '16px' }}>21 214₽</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.34448 2.34292C-0.77445 5.46171 -0.774569 10.537 2.34422 13.6559C5.463 16.7749 10.5376 16.7743 13.6565 13.6555C16.7755 10.5367 16.7763 5.46212 13.6575 2.34319C10.5387 -0.775743 5.46341 -0.775863 2.34448 2.34292ZM12.0007 7.19994L12.0007 8.79938L8.80051 8.79926L8.80048 11.9995L7.20102 11.9994L7.20114 8.79924L4.0003 8.79992L4.00027 7.20046L7.2012 7.19987L7.20123 3.99966L8.80067 3.99978L8.80055 7.19991L12.0007 7.19994Z" fill="#555F71"/></svg>
        </div>
      </div>
      <div style={{ background: '#171C1F', padding: '4px 8px 8px' }}>
        <div onClick={() => { if (betAmount > 0 && activeBet) { placedBetRef.current = { label: activeBet.label, odds: activeBet.odds }; setBetPlaced(true); onBetPlaced(); setBetAmount(0); setChipIdx(null); setKeyboardOpen(false); onClearBet(); } }} style={{ height: 56, background: betAmount > 0 ? '#00a344' : 'rgba(0,163,68,0.3)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: betAmount > 0 ? 'pointer' : 'default', transition: 'background 0.2s' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: betAmount > 0 ? '#ffffff' : 'rgba(255,255,255,0.35)' }}>Сделать ставку</span>
        </div>
      </div>
      <div style={{ padding: '4px 8px 8px', background: '#171C1F' }}>
        {([['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']] as const).map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 4, marginBottom: ri < 3 ? 4 : 0 }}>
            {row.map((key, ci) => (
              <div key={ci} onClick={() => key !== '' && handleKey(key)} style={{ flex: 1, height: 36, background: key === '' ? 'transparent' : key === '⌫' ? 'rgba(255,255,255,0.06)' : '#24282F', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: key === '' ? 'default' : 'pointer', userSelect: 'none' }}>
                {key === '⌫' ? <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M7.5 1H19V13H7.5L1 7L7.5 1Z" stroke="#929bae" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 5L16 9M16 5L12 9" stroke="#929bae" strokeWidth="1.5" strokeLinecap="round"/></svg> : key !== '' ? <span style={{ fontSize: 20, fontWeight: 500, color: '#eeeff3', lineHeight: 1 }}>{key}</span> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );

  const BetResultArea = () => {
    const isLoss = betResult && !betWon;

    if (isLoss) return (
      <>
        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: '22px', textAlign: 'center', margin: 0 }}>
          {scBetWon ? '2-й шанс зашёл!' : 'Ставка не зашла'}
        </motion.p>
        <div style={{ position: 'relative', width: 80, height: 80, marginTop: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {betPlaced && <motion.div key="ball" style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale, position: 'absolute', top: 0, left: 0 }} exit={{ scale: 0.15, opacity: 0, transition: { duration: 0.35 } }}><SoccerBallSVG size={80} /></motion.div>}
            {betResult && !scBetWon && <motion.div key="x" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }} style={{ position: 'absolute', top: 0, left: 0 }}>
              <svg width="80" height="80" viewBox="0 0 88 88" fill="none"><circle cx="44" cy="44" r="37" fill="rgba(220,50,50,0.18)" stroke="rgba(220,50,50,0.35)" strokeWidth="1.5"/><path d="M30 30L58 58M58 30L30 58" stroke="#e04444" strokeWidth="3.5" strokeLinecap="round"/></svg>
            </motion.div>}
            {scBetWon && <motion.div key="check" style={{ position: 'absolute', top: -4, left: 0 }} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}><CheckCircleSVG size={80} /></motion.div>}
          </AnimatePresence>
        </div>

        {scBetWon && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }} style={{ fontSize: 12, color: 'rgba(238,239,243,0.7)', textAlign: 'center', margin: '6px 0 0' }}>+1 850₽ к твоему банку</motion.p>}

        {/* 2-й шанс блок */}
        {betResult && !scBetWon && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.3 }} style={{ width: '100%', marginTop: 12, borderRadius: 20, border: '1px solid rgba(244,160,25,0.35)', padding: '10px 10px 12px', background: 'rgba(244,140,0,0.07)' }} onPointerDown={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f4a019', background: 'rgba(244,160,25,0.15)', borderRadius: 10, padding: '2px 8px', letterSpacing: 0.3 }}>⚡ 2-й шанс</span>
              {scActive && !scBetPlaced && <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(244,160,25,0.7)' }}>{scTimeLeft}с</span>}
            </div>
            {!scActive && !scBetPlaced && scBetWon === null && (
              <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Готовим шанс отыграться...</span>
              </div>
            )}
            {scActive && !scBetPlaced && (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', margin: '0 0 8px', whiteSpace: 'pre-line', textAlign: 'center' }}>{card.question2nd}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ l: 'Да', o: card.odds1 }, { l: 'Нет', o: card.odds2 }].map((btn) => (
                    <div key={btn.l} onClick={() => { setScLabel(btn.l); setScBetPlaced(true); setScActive(false); }} style={{ flex: 1, height: 54, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,160,25,0.25)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{btn.l}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{btn.o}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {scBetPlaced && scBetWon === null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{scLabel}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Ожидаем...</span>
              </div>
            )}
          </motion.div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 12, width: '100%', position: 'relative', zIndex: 12 }}>
          {(scBetWon !== null || (scActive && scTimeLeft <= 0)) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} onClick={() => setIsExiting(true)} onPointerDown={e => e.stopPropagation()} style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', pointerEvents: 'auto' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Следующий маркет</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.div>
          )}
        </div>
      </>
    );

    return (
      <>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={betResult ? 'r' : 'w'} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }} style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: '22px', textAlign: 'center', margin: 0, whiteSpace: 'nowrap' }}>
            {betResult ? 'Ставка выиграла!' : 'Ожидаем результат:'}
          </motion.p>
        </AnimatePresence>
        <div style={{ position: 'relative', width: 80, height: 80, marginTop: 32, flexShrink: 0 }}>
          <AnimatePresence>
            {betPlaced && <motion.div key="ball" style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale, position: 'absolute', top: 0, left: 0 }} exit={{ scale: 0.15, opacity: 0, transition: { duration: 0.35 } }}><SoccerBallSVG size={80} /></motion.div>}
            {betResult && <motion.div key="check" style={{ position: 'absolute', top: -4, left: 0 }} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}><CheckCircleSVG size={80} /></motion.div>}
          </AnimatePresence>
        </div>
        {betResult && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} style={{ fontSize: 12, fontWeight: 400, color: 'rgba(238,239,243,0.7)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>+2 000₽ к твоему банку</motion.p>}
        <div style={{ marginTop: 'auto', paddingTop: 16, width: '100%', position: 'relative', zIndex: 12 }}>
          {betPlaced && <div style={{ height: 60, borderRadius: 24, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(0,200,80,0.06)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{placedBetRef.current.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{placedBetRef.current.odds}</span>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="#00a344"/><path d="M6.5 11L9.5 14L15.5 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>}
          {betResult && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }} onClick={() => setIsExiting(true)} onPointerDown={e => e.stopPropagation()} style={{ marginTop: 8, height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', pointerEvents: 'auto' }}><span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Следующий маркет</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></motion.div>}
        </div>
      </>
    );
  };

  const TeamHeader = () => (
    <div style={{ height: 50, borderRadius: '32px 32px 0 0', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 4, position: 'relative', zIndex: 11 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 400, color: '#eeeff3', textAlign: 'right' }}>Зенит</span>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.logo1} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
        <span style={{ fontSize: 20, fontWeight: 500, color: '#ffffff', lineHeight: 1 }}>0:0</span>
        <span style={{ fontSize: 8, fontWeight: 400, color: '#eeeff3', whiteSpace: 'nowrap', marginTop: 2 }}>1 пер. 00:04</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.logo2} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 400, color: '#eeeff3', lineHeight: '12px' }}>Спартак{'\n'}Москва</span>
      </div>
    </div>
  );

  const VideoBlock = ({ collapse }: { collapse?: boolean }) => (
    <motion.div
      initial={false}
      animate={{ height: collapse && keyboardOpen ? 0 : 175 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
      style={{ position: 'relative', width: '100%', borderRadius: 32, overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
        <canvas ref={onCanvasRef} width={314} height={175} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 34, zIndex: 12, pointerEvents: 'none', borderRadius: '0 0 32px 32px', background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#eeeff3', whiteSpace: 'nowrap', letterSpacing: -0.1 }}>Возможна задержка, можете переключиться на</span>
        <svg width="16" height="13" viewBox="258 11 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M271.574 23.875H261.657C260.095 23.875 258.824 22.6042 258.824 21.0417V13.9583C258.824 12.3957 260.095 11.125 261.657 11.125H271.574C273.136 11.125 274.407 12.3957 274.407 13.9583V21.0417C274.407 22.6042 273.136 23.875 271.574 23.875ZM272.99 13.9583C272.99 13.177 272.356 12.5417 271.574 12.5417H261.657C260.875 12.5417 260.24 13.177 260.24 13.9583V21.0417C260.24 21.823 260.875 22.4583 261.657 22.4583H271.574C272.356 22.4583 272.99 21.823 272.99 21.0417V13.9583ZM270.157 17.5C269.375 17.5 268.74 16.866 268.74 16.0833C268.74 15.3006 269.375 14.6667 270.157 14.6667C270.94 14.6667 271.574 15.3006 271.574 16.0833C271.574 16.866 270.94 17.5 270.157 17.5ZM263.782 17.5C263.39 17.5 263.074 17.1834 263.074 16.7917C263.074 16.4 263.39 16.0833 263.782 16.0833C264.174 16.0833 264.49 16.4 264.49 16.7917C264.49 17.1834 264.174 17.5 263.782 17.5ZM262.365 16.0833C261.974 16.0833 261.657 15.7667 261.657 15.375C261.657 14.9833 261.974 14.6667 262.365 14.6667C262.757 14.6667 263.074 14.9833 263.074 15.375C263.074 15.7667 262.757 16.0833 262.365 16.0833ZM265.199 18.9167C264.807 18.9167 264.49 18.6 264.49 18.2083C264.49 17.8166 264.807 17.5 265.199 17.5C265.59 17.5 265.907 17.8166 265.907 18.2083C265.907 18.6 265.59 18.9167 265.199 18.9167ZM268.032 18.9167C267.64 18.9167 267.324 18.6 267.324 18.2083C267.324 17.8166 267.64 17.5 268.032 17.5C268.424 17.5 268.74 17.8166 268.74 18.2083C268.74 18.6 268.424 18.9167 268.032 18.9167ZM266.615 20.3333C266.224 20.3333 265.907 20.0167 265.907 19.625C265.907 19.2333 266.224 18.9167 266.615 18.9167C267.007 18.9167 267.324 19.2333 267.324 19.625C267.324 20.0167 267.007 20.3333 266.615 20.3333Z" fill="#EEEFF3"/>
        </svg>
      </div>
    </motion.div>
  );

  if (card.type === 'line') {
    const lineEvents = [
      { label: 'Гол',            odds: '1.65', full: false },
      { label: 'Угловой',        odds: '3.55', full: false },
      { label: 'Фол',            odds: '1.65', full: false },
      { label: 'Аут',            odds: '3.55', full: false },
      { label: 'Удары от ворот', odds: '3.55', full: true  },
    ];
    return (
      <motion.div
        initial={false}
        animate={activeBet
          ? { width: isActive ? 328 : CARD_W, opacity: isActive ? 1 : 0, background: isActive ? '#171C1F' : 'rgba(0,0,0,0)', borderRadius: isActive ? '32px 32px 24px 24px' : 32 }
          : { width: CARD_W, opacity: 1, background: 'rgba(0,0,0,0)', borderRadius: 32 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 0 0' : 32, background: '#121214' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#121214', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            <TeamHeader />
            <VideoBlock />
            <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: (sheetOpen && !betPlaced && !betResult) ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 8px 8px', minHeight: (sheetOpen && !betPlaced && !betResult) ? 0 : 268 }}>
              {(betPlaced || betResult) ? BetResultArea() : (
                <>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: '22px', textAlign: 'center', margin: 0, whiteSpace: 'nowrap' }}>Что произойдет следующим?</p>
                  <div style={{ width: '100%', marginTop: sheetOpen ? 12 : 'auto', paddingTop: sheetOpen ? 0 : 16, position: 'relative', zIndex: 11 }}>
                    <AnimatePresence mode="wait" initial={false}>
                      {activeBet ? (
                        <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} onPointerDown={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', pointerEvents: 'auto' }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{activeBet.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', opacity: 0.8 }}>{activeBet.odds}</span>
                            <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer', flexShrink: 0, pointerEvents: 'auto' }}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="grid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {lineEvents.map((btn, bi) => (
                              <div key={bi} style={{ width: btn.full ? '100%' : 'calc(50% - 4px)', height: 62, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)', position: 'relative', overflow: 'hidden' }} onPointerDown={e => { e.stopPropagation(); onBet(btn.label, btn.odds); }}>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'linear-gradient(225deg, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents: 'none' }} />
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', position: 'relative' }}>{btn.label}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', position: 'relative' }}>{btn.odds}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, borderRadius: 32, boxShadow: (betPlaced || betResult) ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 20px 1px rgba(180,194,255,0.45), inset 0px 10px 40px 4px rgba(14,34,51,0.7)' }} />
          </div>
        </motion.div>
        <BetSheetContent />
        </motion.div>
      </motion.div>
    );
  }

  if (card.type === 'lineevent') {
    const STATIC_GLOW = 'inset 0px 0px 20px 1px rgba(180,194,255,0.45), inset 0px 10px 40px 4px rgba(14,34,51,0.7)';
    const btns = [
      { l: 'П1', o: '1.65' }, { l: 'X', o: '3.55' }, { l: 'П2', o: '3.55' },
      { l: '1x', o: '3.55' }, { l: '12', o: '3.55' }, { l: '2x', o: '3.55' },
    ];
    return (
      <motion.div
        initial={false}
        animate={activeBet
          ? { width: isActive ? 328 : CARD_W, opacity: isActive ? 1 : 0, background: isActive ? '#171C1F' : 'rgba(0,0,0,0)', borderRadius: isActive ? '32px 32px 24px 24px' : 32 }
          : { width: CARD_W, opacity: 1, background: 'rgba(0,0,0,0)', borderRadius: 32 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 0 0' : 32, background: '#121214' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#121214', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            <TeamHeader />
            <VideoBlock />
            <div style={{ background: (sheetOpen && !betPlaced && !betResult) ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: (sheetOpen && !betPlaced && !betResult) ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 8px 8px', minHeight: (sheetOpen && !betPlaced && !betResult) ? 0 : 268 }}>
              {(betPlaced || betResult) ? BetResultArea() : (
                <>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#ffffff', marginBottom: sheetOpen ? 12 : 14 }}>Исход матча</span>
                  <div style={{ width: '100%', position: 'relative', zIndex: 11 }}>
                    <AnimatePresence mode="wait" initial={false}>
                      {activeBet ? (
                        <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} onPointerDown={e => e.stopPropagation()} style={{ borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', pointerEvents: 'auto' }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{activeBet.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', opacity: 0.8 }}>{activeBet.odds}</span>
                            <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer', flexShrink: 0, pointerEvents: 'auto' }}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="grid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: 6, columnGap: 8 }}>
                            {btns.map((btn, bi) => (
                              <div key={bi} style={{ width: 'calc((100% - 16px) / 3)', height: 62, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }} onPointerDown={e => { e.stopPropagation(); onBet(btn.l, btn.o); }}>
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{btn.l}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#555f71', lineHeight: 1 }}>{btn.o}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ paddingTop: 12 }} onPointerDown={e => e.stopPropagation()}>
                            <div style={{ height: 56, background: 'transparent', border: '1px solid #8D9DCD', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>+120 исходов</span>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, borderRadius: 32, boxShadow: (betPlaced || betResult) ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : STATIC_GLOW }} />
          </div>
        </motion.div>
        <BetSheetContent />
        </motion.div>
      </motion.div>
    );
  }

  // penalty card — серия пенальти
  if (card.type === 'penalty') {
    const penaltyPct = timeLeft / card.timer;
    const penaltyColor = timerColorAt(penaltyPct);
    return (
      <motion.div
        initial={false}
        animate={activeBet
          ? { width: isActive ? 328 : CARD_W, opacity: isActive ? 1 : 0, background: isActive ? '#171C1F' : 'rgba(0,0,0,0)', borderRadius: isActive ? '32px 32px 24px 24px' : 32 }
          : { width: CARD_W, opacity: 1, background: 'rgba(0,0,0,0)', borderRadius: 32 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ flexShrink: 0, overflow: 'visible' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#121214', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            <TeamHeader />
            <VideoBlock collapse />
            <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 8px 8px', minHeight: 268 }}>
              {(betPlaced || betResult) ? BetResultArea() : <>
                {/* Penalty badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.3)', borderRadius: 20, padding: '4px 10px', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#ff6b6b', letterSpacing: 0.5 }}>⚽ СЕРИЯ ПЕНАЛЬТИ</span>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: '22px', textAlign: 'center', margin: 0 }}>{card.question}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={card.logo1} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Зенит бьёт</span>
                </div>
                <motion.span animate={{ color: penaltyColor }} transition={{ duration: 0.4 }} style={{ fontSize: 48, fontWeight: 700, lineHeight: '56px', marginTop: 4 }}>
                  {timeLeft}
                </motion.span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{card.unit}</span>
                <div style={{ width: '100%', marginTop: 'auto', paddingTop: 7, position: 'relative', zIndex: 11 }}>
                  <AnimatePresence mode="wait" initial={false}>
                    {activeBet ? (
                      <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} onPointerDown={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', pointerEvents: 'auto' }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{activeBet.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', opacity: 0.8 }}>{activeBet.odds}</span>
                          <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer' }}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex', gap: 8 }}>
                        {[{ label: card.label1, odds: card.odds1, pct: card.pct1 }, { label: card.label2, odds: card.odds2, pct: card.pct2 }].map((btn, bi) => (
                          <div key={bi} onClick={() => onBet(btn.label, btn.odds)} onPointerDown={e => e.stopPropagation()}
                            style={{ flex: 1, height: 80, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: '#262a33', borderRadius: 16, height: 14, padding: '0 5px', display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#929bae' }}>{btn.pct}</span>
                            </div>
                            <span style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{btn.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(238,239,243,0.65)' }}>{btn.odds}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>}
            </div>
            <motion.div animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, opacity: (betPlaced || betResult) ? 0 : 1 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, boxShadow: 'inset 0px 0px 18px 1px rgba(255,255,255,0.25), inset 0px 1px 34px 3px rgba(230,50,50,0.55)' }} />
            {(betPlaced || betResult) && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: betWon ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 18px 0px rgba(255,255,255,0.12), inset 0px 8px 30px 2px rgba(200,50,50,0.3)' }} />}
          </div>
        </motion.div>
        <BetSheetContent />
        </motion.div>
      </motion.div>
    );
  }

  // yesno / team cards
  const buttons = [
    { logo: card.logo1, odds: card.odds1, pct: card.pct1, label: card.label1, hint: card.hint1 },
    { logo: card.logo2, odds: card.odds2, pct: card.pct2, label: card.label2, hint: card.hint2 },
  ];

  return (
    <motion.div
      initial={false}
      animate={activeBet
        ? { width: isActive ? 328 : CARD_W, opacity: isActive ? 1 : 0, background: isActive ? '#171C1F' : 'rgba(0,0,0,0)', borderRadius: isActive ? '32px 32px 24px 24px' : 32 }
        : { width: CARD_W, opacity: 1, background: 'rgba(0,0,0,0)', borderRadius: 32 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ flexShrink: 0, overflow: 'visible' }}
    >
      <motion.div
        animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
        onAnimationComplete={() => { if (isExiting) onExpire(); }}
      >
      <motion.div
        animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
        transition={{ duration: 0.25 }}
        style={{ width: '100%', borderRadius: 32, background: '#121214', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
      >
        <div style={{ position: 'relative', isolation: 'isolate' }}>
          <TeamHeader />
          <VideoBlock collapse />

          <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 8px 8px', minHeight: (betPlaced || betResult) ? 268 : sheetOpen ? 260 : 268 }}>
            {(betPlaced || betResult) ? BetResultArea() : isExpired ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M33.998 20.2841V14C33.998 8.486 29.512 4 23.998 4C18.484 4 13.998 8.486 13.998 14V20.2841C10.556 21.1781 7.99805 24.284 7.99805 28V36C7.99805 40.412 11.586 44 15.998 44H31.998C36.41 44 39.998 40.412 39.998 36V28C39.998 24.284 37.44 21.1781 33.998 20.2841ZM17.998 14C17.998 10.692 20.69 8 23.998 8C27.306 8 29.998 10.692 29.998 14V20H17.998V14ZM35.998 36C35.998 38.206 34.204 40 31.998 40H15.998C13.792 40 11.998 38.206 11.998 36V28C11.998 25.794 13.792 24 15.998 24H31.998C34.204 24 35.998 25.794 35.998 28V36ZM22.696 35.938H25.306L26.668 27.938H21.3361L22.696 35.938Z" fill="#EEEFF3" fillOpacity={0.5}/>
                </svg>
                <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(238,239,243,0.5)' }}>Время вышло</span>
              </div>
            ) : <>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: '22px', textAlign: 'center', margin: 0, padding: '0 16px', whiteSpace: 'pre-line' }}>
                {card.question}
              </p>
              <motion.span animate={{ color: timerColor }} transition={{ duration: 0.6 }} style={{ fontSize: 40, fontWeight: 400, lineHeight: '48px', marginTop: 8, display: 'inline-block' }}>
                {timeLeft}
              </motion.span>
              <motion.span animate={{ color: timerColor }} transition={{ duration: 0.6 }} style={{ fontSize: 16, fontWeight: 400, lineHeight: '20px' }}>
                {card.unit}
              </motion.span>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#929bae', lineHeight: '12px', marginTop: 11 }}>{card.period}</span>


              <div style={{ width: '100%', marginTop: 'auto', paddingTop: 7, position: 'relative', zIndex: 11 }}>
                <AnimatePresence mode="wait" initial={false}>
                  {activeBet ? (
                    <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} onPointerDown={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', pointerEvents: 'auto' }}>
                      <motion.div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -119, width: 200, height: 100, borderRadius: '50%', background: chipEllipseColor, filter: 'blur(32px)', pointerEvents: 'none' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                        {activeBet.logo && <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}><img src={activeBet.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{activeBet.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', opacity: 0.8 }}>{activeBet.odds}</span>
                        <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer', flexShrink: 0 }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex', gap: 8 }}>
                      {buttons.map((btn, bi) => (
                        <div
                          key={bi}
                          onClick={() => onBet(btn.label, btn.odds, card.type === 'team' ? btn.logo : undefined)}
                          onPointerDown={e => e.stopPropagation()}
                          style={{ flex: 1, height: 92, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, paddingBottom: 10, gap: 4, position: 'relative', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)', cursor: 'pointer' }}
                        >
                          <div style={{ position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(225deg, rgba(255,255,255,0.09) 0%, transparent 40%)', pointerEvents: 'none' }} />
                          {/* pct badge */}
                          <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: '#262a33', borderRadius: 16, height: 14, padding: '0 5px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#929bae' }}>{btn.pct}</span>
                          </div>
                          {card.type === 'team' ? (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                              <img src={btn.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{btn.label}</span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(238,239,243,0.65)', lineHeight: '16px' }}>{btn.odds}</span>
                          {btn.hint && (
                            <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(145,250,186,0.55)', lineHeight: '12px', textAlign: 'center', padding: '0 6px' }}>{btn.hint}</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </> }
          </div>

          <motion.div animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, opacity: (betPlaced || betResult) ? 0 : 1 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, boxShadow: glowBoxShadow }} />
          {(betPlaced || betResult) && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' }} />}
          <motion.div animate={{ opacity: isExpired ? 1 : 0 }} transition={{ duration: 0.6 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: 'inset 0px 20px 80px 8px rgba(38,38,38,1), inset 0px 0px 40px 1px rgba(63,63,63,1)' }} />
        </div>
      </motion.div>

      <BetSheetContent />
      </motion.div>
    </motion.div>
  );
}

const SCENARIOS = [
  {
    id: 1, label: 'Интервальный маркет', title: 'Будет угловой?', badge: null,
    steps: ['Нажмите «Да» или «Нет»', 'Выберите сумму ставки из чипов или введите вручную', 'Нажмите «Сделать ставку»', 'Дождитесь результата (~15 сек)', 'Ставка выигрывает ✓'],
    note: 'Базовый сценарий — да/нет на игровое событие. Оцените: насколько понятен маркет без объяснений?',
  },
  {
    id: 2, label: 'Командный маркет', title: 'Кто владеет мячом?', badge: null,
    steps: ['Выберите команду — Зенит или Спартак', 'Обратите внимание на % вероятности и хинт под коэфом', 'Введите сумму и нажмите «Сделать ставку»', 'Дождитесь результата'],
    note: 'Вместо Да/Нет — логотипы команд. Оцените: помогает ли аналитика (% и хинт) принять решение быстрее?',
  },
  {
    id: 3, label: '2-й шанс', title: 'Будет отбор мяча?', badge: '⚡',
    steps: ['Сделайте ставку как обычно', 'Ставка не заходит — появляется «⚡ 2-й шанс»', 'У вас 10 секунд на новую ставку', 'Нажмите «Да» или «Нет» в блоке 2-го шанса', '2-й шанс выигрывает ✓'],
    note: 'Механика удержания после проигрыша. Оцените: хочется ли воспользоваться шансом? Не раздражает ли?',
  },
  {
    id: 4, label: 'Серия пенальти', title: 'Забьёт Смолов?', badge: '⚽',
    steps: ['Только 8 секунд — действуйте быстро!', 'Нажмите «Да» или «Нет»', 'Введите сумму ставки', 'Нажмите «Сделать ставку» — результат придёт за 5 сек'],
    note: 'Ситуативный маркет на пенальти. Оцените: передаёт ли интерфейс ощущение срочности и напряжения?',
  },
  {
    id: 5, label: 'Ситуативный маркет', title: 'Следующее событие', badge: null,
    steps: ['Выберите одно из событий: Гол, Угловой, Фол, Аут...', 'Нажмите на исход', 'Введите сумму и подтвердите ставку'],
    note: 'Мультиисходный маркет. Оцените: понятно ли какой из исходов выбрать? Не слишком ли много вариантов?',
  },
  {
    id: 6, label: 'Обычная линия', title: 'Исход матча', badge: null,
    steps: ['Выберите исход: П1, X или П2', 'Или комбинированный: 1X, 12, 2X', 'Нажмите «+120 исходов» чтобы увидеть полную роспись', 'Сделайте ставку'],
    note: 'Стандартная ставка на матч внутри микробета. Оцените: органично ли она вписывается в поток микробетинга?',
  },
];

export default function MicrobetLiveV2() {
  const sharedVideoRef = useRef<HTMLVideoElement>(null);
  const canvasEls = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const video = sharedVideoRef.current;
    if (!video) return;
    let rafId: number;
    const draw = () => {
      if (video.readyState >= 2) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        canvasEls.current.forEach(canvas => {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          const cw = canvas.width;
          const ch = canvas.height;
          const scale = Math.max(cw / vw, ch / vh);
          const sw = cw / scale;
          const sh = ch / scale;
          ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, cw, ch);
        });
      }
      rafId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const [selectedBet, setSelectedBet] = useState<{ label: string; odds: string; logo?: string } | null>(null);
  const [betsInPlay, setBetsInPlay] = useState(2);

  const [resetKey, setResetKey] = useState(0);
  const [liveCards, setLiveCards] = useState<CardData[]>(() => [...CARDS]);
  const liveCardsRef = useRef<CardData[]>([...CARDS]);
  const liveN = liveCards.length;
  const liveNRef = useRef(liveN);
  liveNRef.current = liveN;
  const liveVirtual = liveN > 0 ? [liveCards[liveN - 1], ...liveCards, liveCards[0]] : [];

  const [vIdx, setVIdx] = useState(1);
  const [dragging, setDragging] = useState(false);
  const vIdxRef    = useRef(1);
  const draggingRef = useRef(false);
  const startX     = useRef(0);
  const x          = useMotionValue(getX(1));
  const animCtrl   = useRef<{ stop: () => void } | null>(null);
  const shiftCtrl  = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (animCtrl.current) return;
    if (shiftCtrl.current) { shiftCtrl.current.stop(); shiftCtrl.current = null; }
    const target = getX(vIdxRef.current) + (selectedBet ? -7 : 0);
    const ctrl = animate(x, target, SPRING);
    shiftCtrl.current = ctrl;
    ctrl.then(() => { shiftCtrl.current = null; });
  }, [!!selectedBet]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopShift = () => {
    if (shiftCtrl.current) { shiftCtrl.current.stop(); shiftCtrl.current = null; }
  };

  const snapTo = (v: number, instant = false) => {
    stopShift();
    if (animCtrl.current) { animCtrl.current.stop(); animCtrl.current = null; }
    const target = getX(v);
    if (instant) {
      x.set(target);
    } else {
      const ctrl = animate(x, target, SPRING);
      animCtrl.current = ctrl;
      ctrl.then(() => {
        if (animCtrl.current !== ctrl) return;
        animCtrl.current = null;
        const curN = liveNRef.current;
        if (v === 0)         { x.set(getX(curN)); vIdxRef.current = curN; setVIdx(curN); }
        if (v === curN + 1)  { x.set(getX(1));    vIdxRef.current = 1;    setVIdx(1); }
      });
    }
    vIdxRef.current = v;
    setVIdx(v);
  };

  const onDown = (e: React.PointerEvent) => {
    stopShift();
    if (animCtrl.current) { animCtrl.current.stop(); animCtrl.current = null; }
    const curN = liveNRef.current;
    if (vIdxRef.current === 0)         { x.set(getX(curN)); vIdxRef.current = curN; setVIdx(curN); }
    if (vIdxRef.current === curN + 1)  { x.set(getX(1));    vIdxRef.current = 1;    setVIdx(1); }
    draggingRef.current = true;
    setDragging(true);
    startX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    x.set(getX(vIdxRef.current) + (e.clientX - startX.current));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const offset = e.clientX - startX.current;
    let next = vIdxRef.current;
    if (offset < -50) next++;
    else if (offset > 50) next--;
    next = Math.max(0, Math.min(liveNRef.current + 1, next));
    snapTo(next);
  };

  const handleExpire = () => {
    stopShift();
    if (animCtrl.current) { animCtrl.current.stop(); animCtrl.current = null; }
    const currentCards = liveCardsRef.current;
    const currentN = currentCards.length;
    if (currentN === 0) return;
    const currentVIdx = vIdxRef.current;
    const ri = ((currentVIdx - 1) % currentN + currentN) % currentN;
    setSelectedBet(null);
    const newCards = currentCards.filter((_, ci) => ci !== ri);
    liveCardsRef.current = newCards;
    if (newCards.length === 0) {
      setLiveCards(newCards);
      setTimeout(() => {
        const fresh = [...CARDS];
        liveCardsRef.current = fresh;
        vIdxRef.current = 1;
        x.set(getX(1));
        setLiveCards(fresh);
        setVIdx(1);
        setSelectedBet(null);
        setResetKey(k => k + 1);
      }, 1500);
      return;
    }
    const nextVIdx = currentVIdx + 1;
    const ctrl = animate(x, getX(nextVIdx), SPRING);
    animCtrl.current = ctrl;
    vIdxRef.current = nextVIdx;
    ctrl.then(() => {
      if (animCtrl.current !== ctrl) return;
      animCtrl.current = null;
      flushSync(() => {
        x.set(getX(1));
        setLiveCards(newCards);
        setVIdx(1);
        vIdxRef.current = 1;
      });
    });
  };

  const handleExpireInactive = (virtualIdx: number) => {
    const currentCards = liveCardsRef.current;
    const ri = virtualIdx - 1;
    if (ri < 0 || ri >= currentCards.length) return;
    const newCards = currentCards.filter((_, ci) => ci !== ri);
    liveCardsRef.current = newCards;
    const currentVIdx = vIdxRef.current;
    if (ri < currentVIdx - 1) {
      const newVIdx = currentVIdx - 1;
      stopShift();
      x.set(getX(newVIdx) + (selectedBet ? -7 : 0));
      vIdxRef.current = newVIdx;
      setLiveCards(newCards);
      setVIdx(newVIdx);
    } else {
      setLiveCards(newCards);
    }
  };

  const realIdx = liveN > 0 ? ((vIdx - 1) % liveN + liveN) % liveN : 0;
  const currentCard = liveCards[realIdx];
  const scenarioIndex = currentCard ? currentCard.id - 1 : 0;
  const scenario = SCENARIOS[Math.min(scenarioIndex, SCENARIOS.length - 1)];

  return (
    <div style={{ minHeight: '100vh', background: '#111214', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '24px 16px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", boxSizing: 'border-box' }}>
      <style>{`
        @keyframes cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @media (max-width: 900px) { .sp { display: none !important; } }
      `}</style>
      <video ref={sharedVideoRef} src={`${BASE}/img/microbet-match.mp4`} autoPlay muted loop playsInline style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 0, left: 0 }} />

      {/* Left panel */}
      <div className="sp" style={{ width: 232, flexShrink: 0, alignSelf: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Сценарии</div>
          </div>
          {SCENARIOS.map((sc, i) => {
            const isActive = i === scenarioIndex;
            return (
              <div
                key={sc.id}
                onClick={() => { if (liveN > 0) snapTo(i + 1); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', cursor: 'pointer', background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent', borderLeft: `3px solid ${isActive ? '#00c958' : 'transparent'}` }}
              >
                <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: 7, background: isActive ? 'rgba(0,201,88,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: isActive ? '#00c958' : 'rgba(255,255,255,0.35)' }}>
                  {i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#eeeff3' : 'rgba(255,255,255,0.5)', lineHeight: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sc.title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{sc.badge ? `${sc.badge} ` : ''}{sc.label}</div>
                </div>
              </div>
            );
          })}
          <div style={{ padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: '14px' }}>Свайпайте карточки или нажмите здесь</div>
          </div>
        </div>
      </div>

      {/* Phone mockup */}
      <div style={{ width: 360, height: 800, position: 'relative', overflow: 'hidden', borderRadius: 40, flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/img/microbet-bg.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0, background: '#0a0c0b', borderRadius: '32px 32px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
          <div style={{ width: 134, height: 5, background: '#ffffff', borderRadius: 100, marginTop: 13, flexShrink: 0 }} />

          <div style={{ width: '100%', marginTop: 4, flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 2 }}>
            <motion.div
              style={{ display: 'flex', gap: GAP, x, cursor: (selectedBet || liveN <= 1) ? 'default' : (dragging ? 'grabbing' : 'grab'), userSelect: 'none', pointerEvents: selectedBet ? 'none' : 'auto' }}
              onPointerDown={(selectedBet || liveN <= 1) ? undefined : onDown}
              onPointerMove={(selectedBet || liveN <= 1) ? undefined : onMove}
              onPointerUp={(selectedBet || liveN <= 1) ? undefined : onUp}
              onPointerCancel={(selectedBet || liveN <= 1) ? undefined : onUp}
            >
              {liveVirtual.map((card, i) => {
                const isGhost = i === 0 || i === liveN + 1;
                const keyPrefix = i === 0 ? 'gl' : isGhost ? 'gf' : 'r';
                if (liveN <= 1 && isGhost) return <div key={`${resetKey}-${keyPrefix}-empty`} style={{ width: CARD_W, flexShrink: 0 }} />;
                return (
                  <VirtualCard
                    key={`${resetKey}-${keyPrefix}-${card.id}`}
                    card={card} i={i} x={x} vIdx={vIdx}
                    onCanvasRef={el => { canvasEls.current[i] = el; }}
                    onBet={(label, odds, logo) => setSelectedBet({ label, odds, logo })}
                    activeBet={selectedBet}
                    onClearBet={() => setSelectedBet(null)}
                    onExpire={handleExpire}
                    isGhost={isGhost}
                    onExpireInactive={handleExpireInactive}
                    onBetPlaced={() => setBetsInPlay(n => n + 1)}
                    onBetWon={() => setBetsInPlay(n => Math.max(0, n - 1))}
                  />
                );
              })}
            </motion.div>
          </div>

          {!selectedBet && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {liveCards.map((_, i) => (
                  <div key={i} onClick={() => liveN > 1 ? snapTo(i + 1) : undefined} style={{ width: i === realIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === realIdx ? '#ffffff' : 'rgba(255,255,255,0.4)', transition: 'width 0.3s ease, background 0.3s ease', cursor: liveN > 1 ? 'pointer' : 'default' }} />
                ))}
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(238,239,243,0.35)' }}>
                Маркет {realIdx + 1} из {liveN}
              </span>
            </div>
          )}

          <div style={{ marginTop: 10, width: 312, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', padding: '12px 16px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#929bae' }}>Мои ставки</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#008900' }}>В игре</span>
              <div style={{ background: '#008900', borderRadius: 50, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#d9dde5' }}>{betsInPlay}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.66732 6.00016L8.00065 9.3335L11.334 6.00016" stroke="#929bae" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {[
            { team1: 'Зенит',     team2: 'Спартак',   logo1: IMG.zenit,   logo2: IMG.spartak, score: '0:0' },
            { team1: 'Спартак',   team2: 'Зенит',     logo1: IMG.spartak, logo2: IMG.zenit,   score: '1:1' },
            { team1: 'Зенит',     team2: 'Спартак',   logo1: IMG.zenit,   logo2: IMG.spartak, score: '0:0' },
          ].map((bet, i) => (
            <div key={i} style={{ marginTop: 8, width: 312, flexShrink: 0, height: 56, borderRadius: 24, background: 'linear-gradient(180deg, #252333 0%, #131214 55%)', display: 'flex', alignItems: 'center', padding: '0 16px 0 12px', gap: 8 }}>
              <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', marginRight: 8 }}>
                {[bet.logo1, bet.logo2].map((src, li) => (
                  <div key={li} style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, borderRadius: '50%', background: '#fff', overflow: 'hidden', border: '1px solid #434c5b', marginLeft: li ? -8 : 0, flexShrink: 0 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {[bet.team1, bet.team2].map((name) => (
                  <div key={name} style={{ fontSize: 14, fontWeight: 700, color: '#eeeff3', lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 20, fontWeight: 500, color: '#ffffff', flexShrink: 0 }}>{bet.score}</span>
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, background: 'linear-gradient(180deg, transparent 0%, #0a0c0b 100%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Right panel */}
      <div className="sp" style={{ width: 232, flexShrink: 0, alignSelf: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(0,201,88,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#00c958', flexShrink: 0 }}>{scenarioIndex + 1}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#eeeff3', lineHeight: '15px' }}>{scenario.title}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{scenario.label}</div>
            </div>
          </div>
          <div style={{ padding: '8px 18px 4px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Как пройти</div>
            {scenario.steps.map((step, si) => (
              <div key={si} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: si < scenario.steps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 20, height: 20, minWidth: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{si + 1}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: '17px' }}>{step}</div>
              </div>
            ))}
          </div>
          {scenario.note && (
            <div style={{ margin: '8px 18px 16px', padding: '10px 12px', background: 'rgba(255,200,0,0.07)', border: '1px solid rgba(255,200,0,0.15)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,200,0,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Что оцениваем</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: '15px' }}>{scenario.note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
