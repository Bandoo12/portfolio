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
  zenit:   `${BASE}/img/zenit_real.png`,
  spartak: `${BASE}/img/spartak_real.png`,
};

const CARD_W = 314;
const GAP = 8;
const STEP = CARD_W + GAP;

const PENALTY_SERIES = [
  { player: 'Смолов',  team: 'Зенит',   oddsYes: '1.30', oddsNo: '3.80', pct: '77%', scored: true  },
  { player: 'Промес',  team: 'Спартак',  oddsYes: '1.45', oddsNo: '2.70', pct: '69%', scored: true  },
  { player: 'Дзюба',   team: 'Зенит',   oddsYes: '1.20', oddsNo: '4.50', pct: '83%', scored: false },
  { player: 'Соболев', team: 'Спартак',  oddsYes: '1.60', oddsNo: '2.35', pct: '63%', scored: false },
  { player: 'Малком',  team: 'Зенит',   oddsYes: '1.35', oddsNo: '3.40', pct: '74%', scored: true  },
] as const;

const CARDS = [
  { id: 1, type: 'yesno'    as const, question: 'Будет угловой\nследующие',        timer: 30, start: 30, unit: 'секунд', period: 'в период 34:00–34:30', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '1.55', odds2: '2.40', pct1: '62%', pct2: '38%', label1: 'Да',    label2: 'Нет',     hint1: 'угловой каждые ~6 мин',  hint2: '2 угловых в тайме',     question2nd: '' },
  { id: 2, type: 'team'     as const, question: 'Кто дольше будет\nвладеть мячом', timer: 30, start: 20, unit: 'секунд', period: 'в период 34:00–34:30', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '1.70', odds2: '3.20', pct1: '67%', pct2: '33%', label1: 'Зенит', label2: 'Спартак', hint1: '67% владения за 10 мин',  hint2: 'потерял мяч 3 раза',    question2nd: '' },
  { id: 3, type: 'yesno'    as const, question: 'Будет отбор мяча\nследующие',     timer: 30, start: 24, unit: 'секунд', period: 'в период 34:00–34:30', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '2.05', odds2: '1.85', pct1: '50%', pct2: '50%', label1: 'Да',    label2: 'Нет',     hint1: 'отбор раз в ~2 мин',     hint2: '5 отборов в тайме',     question2nd: 'Ещё один отбор\nв 10 секунд?' },
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

function VirtualCard({ card, i, x, vIdx, onCanvasRef, onBet, activeBet, onClearBet, onExpire, isGhost, onExpireInactive, onBetPlaced, onBetWon, onBetResult, showTracker, onToggleTracker }: {
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
  onBetResult?: (won: boolean, label: string, odds: string, amount: number, market: string) => void;
  showTracker: boolean;
  onToggleTracker: (v: boolean) => void;
}) {
  const isActive = i === vIdx;

  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    setTabVisible(!document.hidden);
    const h = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  // Penalty series state (used only for card.type === 'penalty')
  const [penaltyRoundIdx, setPenaltyRoundIdx] = useState(0);
  const [penaltyScore, setPenaltyScore] = useState({ z: 0, s: 0 });
  const [penaltySeriesOver, setPenaltySeriesOver] = useState(false);
  const penaltyRoundInitRef = useRef(true);
  const [roundResultTimer, setRoundResultTimer] = useState(0);

  // Reset per-round state when penalty round advances
  useEffect(() => {
    if (card.type !== 'penalty') return;
    if (penaltyRoundInitRef.current) { penaltyRoundInitRef.current = false; return; }
    setTimeLeft(card.timer);
    setBetPlaced(false);
    setBetResult(false);
    setBetWon(true);
  }, [penaltyRoundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const placedBetRef = useRef<{ label: string; odds: string; amount: number }>({ label: '', odds: '', amount: 0 });

  const pct1Num = parseInt(card.pct1 || '50', 10) || 50;
  const [momentumPct, setMomentumPct] = useState(pct1Num);
  const momentumMV = useMotionValue(pct1Num);
  const momentumRef = useRef(pct1Num);
  const ballPosX = useMotionValue(157);
  const ballPosY = useMotionValue(87.5);
  const [eventFlash, setEventFlash] = useState<string | null>(null);
  const eventFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ballShadowY = useTransform(ballPosY, (v: number) => v + 2.5);
  const directionAngle = useTransform(
    [ballPosX, ballPosY],
    (values: number[]) => Math.atan2(values[1] - 87.5, values[0] - 157) * 180 / Math.PI
  );

  const [scActive, setScActive]     = useState(false);
  const [scTimeLeft, setScTimeLeft] = useState(10);
  const [scLabel, setScLabel]       = useState<string | null>(null);
  const [scBetPlaced, setScBetPlaced] = useState(false);
  const [scBetWon, setScBetWon]     = useState<boolean | null>(null);

  // Round result countdown (penalty only — shows time pressure on the "next kick" button)
  useEffect(() => {
    if (!betResult || penaltySeriesOver || card.type !== 'penalty') { setRoundResultTimer(0); return; }
    setRoundResultTimer(card.timer);
  }, [betResult, penaltySeriesOver]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (roundResultTimer <= 0) return;
    const id = setTimeout(() => setRoundResultTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [roundResultTimer]);

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
    let tidRef: ReturnType<typeof setTimeout>;
    // Track active framer controls so cleanup can stop them immediately
    let activeAnims: { stop: () => void }[] = [];

    const runMove = () => {
      if (!alive) return;
      activeAnims.forEach(a => a.stop());
      const p = phase % 5;
      let anims: { stop: () => void }[];
      if (p === 0) anims = [
        animate(ballY, [0, -38, 0], { duration: 0.65, ease: [0.22, 1, 0.36, 1] }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() + 160], { duration: 0.65 }),
      ]; else if (p === 1) anims = [
        animate(ballX, [0, -22, 0], { duration: 0.6 }),
        animate(ballY, [0, -12, 0], { duration: 0.6 }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() - 100], { duration: 0.6 }),
      ]; else if (p === 2) anims = [
        animate(ballY, [0, -24, 2, 0], { duration: 0.7, ease: 'easeOut' }),
        animate(ballScale, [1, 1.18, 0.88, 1], { duration: 0.7 }),
      ]; else if (p === 3) anims = [
        animate(ballX, [0, 26, 0], { duration: 0.5 }),
        animate(ballY, [0, -8, 0], { duration: 0.5 }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() + 100], { duration: 0.5 }),
      ]; else anims = [
        animate(ballY, [0, -32, 0], { duration: 0.75 }),
        animate(ballRotate, [ballRotate.get(), ballRotate.get() - 220], { duration: 0.75 }),
        animate(ballScale, [1, 1.08, 1], { duration: 0.75 }),
      ];
      activeAnims = anims;
      phase++;
      Promise.all(anims).then(() => {
        if (!alive) return;
        tidRef = setTimeout(runMove, 320);
      });
    };
    runMove();
    return () => {
      alive = false;
      clearTimeout(tidRef);
      activeAnims.forEach(a => a.stop());
      ballX.set(0); ballY.set(0); ballRotate.set(0); ballScale.set(1);
    };
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!betPlaced || card.type === 'penalty') return;
    const won = card.id !== 3;
    const delay = 6000;
    const t = setTimeout(() => {
      setBetWon(won);
      setBetPlaced(false);
      setBetResult(true);
      if (won) onBetWon();
      else setTimeout(() => setScActive(true), 700);
      onBetResult?.(won, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
    }, delay);
    return () => clearTimeout(t);
  }, [betPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  // Penalty: bet result based on actual round outcome
  useEffect(() => {
    if (!betPlaced || card.type !== 'penalty') return;
    const round = PENALTY_SERIES[penaltyRoundIdx];
    const userBetYes = placedBetRef.current.label === 'Да';
    const won = round.scored ? userBetYes : !userBetYes;
    const t = setTimeout(() => {
      setBetWon(won);
      setBetPlaced(false);
      setBetResult(true);
      if (won) onBetWon();
      onBetResult?.(won, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, `Забьёт ${round.player}?`);
    }, 5000);
    return () => clearTimeout(t);
  }, [betPlaced, penaltyRoundIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!scActive || scBetPlaced || scBetWon !== null || !tabVisible) return;
    if (scTimeLeft <= 0) { setIsExiting(true); return; }
    const t = setTimeout(() => setScTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [scActive, scTimeLeft, scBetPlaced, scBetWon, tabVisible]);

  useEffect(() => {
    if (!scBetPlaced) return;
    const t = setTimeout(() => { setScBetWon(true); onBetWon(); }, 2500);
    return () => clearTimeout(t);
  }, [scBetPlaced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (betResult && !isActive && !isGhost && card.type !== 'line' && card.type !== 'lineevent' && card.type !== 'penalty') onExpireInactive(i);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tabVisible) return;
    const id = setInterval(() => setTimeLeft(t => (t <= 0 ? 0 : t - 1)), 1000);
    return () => clearInterval(id);
  }, [tabVisible]);

  const isExpired = timeLeft === 0;

  useEffect(() => {
    if (!isExpired || !isActive || isGhost || betPlaced || betResult) return;
    onClearBet();
    if (card.type === 'penalty') {
      // Auto-reveal round result when time runs out
      const t = setTimeout(() => setBetResult(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(t);
  }, [isExpired, isActive, betPlaced, betResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isExpired || isActive || isGhost || card.type === 'penalty') return;
    onExpireInactive(i);
  }, [isExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showTracker) return;
    const bias = pct1Num / 100;
    const isEven = pct1Num === 50;
    const id = setInterval(() => {
      const cur = momentumRef.current;
      const drift = (bias - cur / 100) * (isEven ? 3 : 7);
      const rand = (Math.random() - 0.5) * (isEven ? 20 : 11);
      const next = Math.max(28, Math.min(72, cur + drift + rand));
      momentumRef.current = next;
      setMomentumPct(Math.round(next));
      animate(momentumMV, next, { duration: 0.7, ease: 'easeOut' });
    }, 950);
    return () => clearInterval(id);
  }, [showTracker]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showTracker || card.type === 'penalty') return;
    let alive = true;
    let tid: ReturnType<typeof setTimeout>;
    const CORNERS = [{ x: 18, y: 18 }, { x: 296, y: 18 }, { x: 18, y: 157 }, { x: 296, y: 157 }];

    const flash = (text: string) => {
      if (eventFlashTimerRef.current) clearTimeout(eventFlashTimerRef.current);
      setEventFlash(text);
      eventFlashTimerRef.current = setTimeout(() => setEventFlash(null), 2000);
    };

    const move = () => {
      if (!alive) return;
      const mom = momentumRef.current;
      const isCornerMkt = card.question.includes('угловой');
      const isPossessionMkt = card.type === 'team';
      let tx: number, ty: number;

      if (isCornerMkt) {
        if (mom > 58 && Math.random() < (mom - 58) / 55) {
          const c = CORNERS[Math.floor(Math.random() * CORNERS.length)];
          tx = c.x + (Math.random() - 0.5) * 20;
          ty = c.y + (Math.random() - 0.5) * 20;
          flash('↗ Движение к углу!');
        } else if (mom > 64 && Math.random() < 0.4) {
          const side = Math.random() > 0.5;
          tx = side ? (253 + Math.random() * 44) : (17 + Math.random() * 44);
          ty = 52 + Math.random() * 71;
          flash('⚡ Атака на ворота');
        } else {
          tx = 50 + Math.random() * 214;
          ty = 22 + Math.random() * 131;
        }
      } else if (isPossessionMkt) {
        const goLeft = Math.random() * 100 < mom;
        tx = goLeft ? (14 + Math.random() * 115) : (185 + Math.random() * 105);
        ty = 20 + Math.random() * 135;
        if (goLeft && mom > 70) flash(`${card.label1} давит`);
        else if (!goLeft && mom < 30) flash(`${card.label2} давит`);
      } else if (card.type === 'line' || card.type === 'lineevent') {
        tx = 20 + Math.random() * 274;
        ty = 14 + Math.random() * 147;
        const lineFlashes = ['⚽ Атака', '⚡ Единоборство', '↗ Прострел', '→ Зенит давит', '← Спартак давит'];
        if (Math.random() < 0.35) flash(lineFlashes[Math.floor(Math.random() * lineFlashes.length)]);
      } else {
        tx = 95 + Math.random() * 124;
        ty = 38 + Math.random() * 99;
        if (mom > 66 && Math.random() < 0.45) flash('⚡ Борьба за мяч!');
      }

      tx = Math.max(14, Math.min(300, tx));
      ty = Math.max(14, Math.min(161, ty));
      const dur = 0.85 + Math.random() * 1.2;
      animate(ballPosX, tx, { duration: dur, ease: [0.4, 0, 0.2, 1] });
      animate(ballPosY, ty, { duration: dur, ease: [0.4, 0, 0.2, 1] });
      tid = setTimeout(move, (dur + 0.12 + Math.random() * 0.6) * 1000);
    };
    move();
    return () => {
      alive = false;
      clearTimeout(tid);
      if (eventFlashTimerRef.current) clearTimeout(eventFlashTimerRef.current);
    };
  }, [showTracker]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = timeLeft / card.timer;
  const [r, g, b] = glowColorAt(pct);
  const timerColor = card.type === 'penalty' ? timerColorAt(0) : timerColorAt(pct);
  const pulseDuration = pulseDurationAt(pct);

  const progress = useTransform(x, (xVal: number) => {
    const dist = Math.abs(xVal + i * STEP - 23);
    return Math.max(0, 1 - dist / STEP);
  });
  const cardScale   = useTransform(progress, (t: number) => 0.88 + 0.12 * t);
  const cardOpacity = useTransform(progress, (t: number) => 0.72 + 0.28 * t);
  const cardFilter  = useTransform(progress, (t: number) => `grayscale(${(1 - t).toFixed(2)})`);

  const origin = i < vIdx ? 'right center' : 'left center';

  const initPct = card.type === 'penalty' ? 0 : card.start / card.timer;
  const [initR, initG, initB] = glowColorAt(initPct);
  const rMV = useMotionValue(initR);
  const gMV = useMotionValue(initG);
  const bMV = useMotionValue(initB);
  useEffect(() => {
    if (card.type === 'line' || card.type === 'penalty') return;
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

  const sheetOpen = !!(activeBet && isActive && !betPlaced && !betResult);

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
      data-nodrag="true"
    >
      <div ref={chipsRef} style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', background: '#171C1F', padding: '12px 8px 4px', overflowX: 'auto', scrollbarWidth: 'none', cursor: 'grab', userSelect: 'none', touchAction: 'none' } as React.CSSProperties}
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
        <div onClick={() => { if (betAmount > 0 && activeBet) { placedBetRef.current = { label: activeBet.label, odds: activeBet.odds, amount: betAmount }; setBetPlaced(true); onBetPlaced(); setBetAmount(0); setChipIdx(null); setKeyboardOpen(false); onClearBet(); } }} style={{ height: 56, background: betAmount > 0 ? '#00a344' : 'rgba(0,163,68,0.3)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: betAmount > 0 ? 'pointer' : 'default', transition: 'background 0.2s' }}>
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

  const handleNextMarket = () => {
    if (card.type === 'line' || card.type === 'lineevent') {
      setBetPlaced(false); setBetResult(false); setBetWon(true);
      setScActive(false); setScTimeLeft(10); setScLabel(null); setScBetPlaced(false); setScBetWon(null);
    } else { setIsExiting(true); }
  };

  const BetResultArea = () => {
    const isLoss = betResult && !betWon;

    if (isLoss) return (
      <>
        {/* Top: icon + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence>
              {betPlaced && <motion.div key="ball" style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale, position: 'absolute', top: 0, left: 0 }} exit={{ scale: 0.15, opacity: 0, transition: { duration: 0.35 } }}><SoccerBallSVG size={56} /></motion.div>}
              {betResult && !scBetWon && <motion.div key="x" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }} style={{ position: 'absolute', top: 0, left: 0 }}>
                <svg width="56" height="56" viewBox="0 0 88 88" fill="none"><circle cx="44" cy="44" r="37" fill="rgba(220,50,50,0.18)" stroke="rgba(220,50,50,0.35)" strokeWidth="1.5"/><path d="M30 30L58 58M58 30L30 58" stroke="#e04444" strokeWidth="3.5" strokeLinecap="round"/></svg>
              </motion.div>}
              {scBetWon && <motion.div key="check" style={{ position: 'absolute', top: -2, left: 0 }} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}><CheckCircleSVG size={56} /></motion.div>}
            </AnimatePresence>
          </div>
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center', lineHeight: '22px' }}>
            {scBetWon ? '2-й шанс зашёл!' : 'Ставка не зашла'}
          </motion.p>
          {scBetWon && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ fontSize: 12, color: 'rgba(238,239,243,0.6)', margin: 0 }}>+1 850₽ к твоему банку</motion.p>}
        </div>

        {/* Badge + question — middle content */}
        {betResult && !scBetWon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f4a019', background: 'rgba(244,160,25,0.15)', borderRadius: 10, padding: '3px 10px', letterSpacing: 0.3 }}>⚡ 2-й шанс</span>
              {scActive && !scBetPlaced && <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(244,160,25,0.8)' }}>{scTimeLeft}с</span>}
            </div>
            {!scActive && !scBetPlaced && scBetWon === null && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Готовим шанс отыграться...</span>
            )}
            {scActive && !scBetPlaced && (
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center', lineHeight: '20px' }}>{card.question2nd}</p>
            )}
          </motion.div>
        )}

        {/* Buttons — pinned to bottom */}
        <div style={{ marginTop: 'auto', paddingTop: 8, width: '100%', position: 'relative', zIndex: 12 }} onPointerDown={e => e.stopPropagation()}>
          {betResult && !scBetWon && scActive && !scBetPlaced && (
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ l: 'Да', o: card.odds1 }, { l: 'Нет', o: card.odds2 }].map((btn) => (
                <div key={btn.l} onClick={() => { setScLabel(btn.l); setScBetPlaced(true); setScActive(false); }}
                  style={{ flex: 1, height: 92, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, paddingBottom: 10, gap: 4, cursor: 'pointer', position: 'relative', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 28, background: 'linear-gradient(225deg, rgba(255,255,255,0.09) 0%, transparent 40%)', pointerEvents: 'none' }} />
                  <div style={{ height: 34, display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{btn.l}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(238,239,243,0.65)' }}>{btn.o}</span>
                </div>
              ))}
            </div>
          )}
          {betResult && !scBetWon && scBetPlaced && scBetWon === null && (
            <div style={{ height: 92, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', borderRadius: 28, padding: '0 20px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{scLabel}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Ожидаем результат...</span>
            </div>
          )}
          {(scBetWon !== null || (scActive && scTimeLeft <= 0)) && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} onClick={handleNextMarket} onPointerDown={e => e.stopPropagation()} style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{(card.type === 'line' || card.type === 'lineevent') ? 'Поставить ещё раз' : 'Следующий маркет'}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.div>
          )}
        </div>
      </>
    );

    return (
      <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={betResult ? 'r' : 'w'} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.25 }} style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: '22px', textAlign: 'center', margin: 0, whiteSpace: 'nowrap' }}>
              {betResult ? 'Ставка выиграла!' : 'Ожидаем результат:'}
            </motion.p>
          </AnimatePresence>
          <div style={{ position: 'relative', width: 80, height: 80, marginTop: 16, flexShrink: 0 }}>
            <AnimatePresence>
              {betPlaced && <motion.div key="ball" style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale, position: 'absolute', top: 0, left: 0 }} exit={{ scale: 0.15, opacity: 0, transition: { duration: 0.35 } }}><SoccerBallSVG size={80} /></motion.div>}
              {betResult && <motion.div key="check" style={{ position: 'absolute', top: -4, left: 0 }} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}><CheckCircleSVG size={80} /></motion.div>}
            </AnimatePresence>
          </div>
          {betResult && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} style={{ fontSize: 12, fontWeight: 400, color: 'rgba(238,239,243,0.7)', textAlign: 'center', marginTop: 4, marginBottom: 0 }}>+2 000₽ к твоему банку</motion.p>}
        </div>
        <div style={{ paddingTop: 16, width: '100%', position: 'relative', zIndex: 12 }}>
          {betPlaced && <div style={{ height: 60, borderRadius: 24, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(0,200,80,0.06)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{placedBetRef.current.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{placedBetRef.current.odds}</span>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="#00a344"/><path d="M6.5 11L9.5 14L15.5 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>}
          {betResult && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }} onClick={handleNextMarket} onPointerDown={e => e.stopPropagation()} style={{ marginTop: 8, height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', pointerEvents: 'auto' }}><span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{(card.type === 'line' || card.type === 'lineevent') ? 'Поставить ещё раз' : 'Следующий маркет'}</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></motion.div>}
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

  const MediaSlot = ({ collapse }: { collapse?: boolean }) => {
    const trackerState = betResult ? (betWon ? 'win' : 'loss') : betPlaced ? 'live' : 'setup';
    const isCornerMkt = card.question.includes('угловой');
    const isPossessionMkt = card.type === 'team';
    const cornerGlow = Math.max(0, (momentumPct - 50) / 40);
    const leftAlpha = isPossessionMkt ? (momentumPct / 100) * 0.32 : 0;
    const rightAlpha = isPossessionMkt ? ((100 - momentumPct) / 100) * 0.32 : 0;
    const tacklePulse = (!isCornerMkt && !isPossessionMkt) ? Math.max(0, (momentumPct - 35) / 65) * 0.28 : 0;
    if (!showTracker) return (
      <div style={{ position: 'relative' }}>
        <VideoBlock collapse={collapse} />
        <div onClick={() => onToggleTracker(true)}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 10, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="0.5" y="0.5" width="13" height="13" rx="3" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
            <rect x="3" y="3" width="8" height="5" rx="1" fill="rgba(255,255,255,0.15)"/>
            <path d="M3 10.5H11M3 12H8" stroke="rgba(255,255,255,0.45)" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>трекер</span>
        </div>
      </div>
    );

    return (
      <motion.div
        initial={false}
        animate={{ height: (collapse && keyboardOpen) ? 0 : 175 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: 'relative', width: '100%', borderRadius: 32, overflow: 'hidden', flexShrink: 0 }}
      >
        {/* SVG football pitch */}
        <svg width="314" height="175" viewBox="0 0 314 175" style={{ display: 'block', position: 'absolute', inset: 0 }}>
          {/* Base field with subtle gradient */}
          <defs>
            <radialGradient id="fieldGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e6b32" />
              <stop offset="100%" stopColor="#154e24" />
            </radialGradient>
          </defs>
          <rect width="314" height="175" fill="url(#fieldGrad)" />
          {/* Alternating stripes */}
          {[0,2,4,6].map(i => (
            <rect key={i} x={8 + i * 37.25} y={8} width={37.25} height={159} fill="rgba(0,0,0,0.06)" />
          ))}

          {/* Possession heat zones */}
          {isPossessionMkt && (
            <>
              <rect x="8" y="8" width="149" height="159" fill={`rgba(50,200,120,${leftAlpha})`} />
              <rect x="157" y="8" width="149" height="159" fill={`rgba(220,70,70,${rightAlpha})`} />
            </>
          )}

          {/* Corner danger zones */}
          {isCornerMkt && cornerGlow > 0 && (
            <>
              <circle cx="8" cy="8" r="44" fill={`rgba(255,210,30,${cornerGlow * 0.5})`} />
              <circle cx="306" cy="8" r="44" fill={`rgba(255,210,30,${cornerGlow * 0.5})`} />
              <circle cx="8" cy="167" r="44" fill={`rgba(255,210,30,${cornerGlow * 0.5})`} />
              <circle cx="306" cy="167" r="44" fill={`rgba(255,210,30,${cornerGlow * 0.5})`} />
              {/* Corner flag dots */}
              <circle cx="8" cy="8" r="3" fill={`rgba(255,230,80,${cornerGlow})`} />
              <circle cx="306" cy="8" r="3" fill={`rgba(255,230,80,${cornerGlow})`} />
              <circle cx="8" cy="167" r="3" fill={`rgba(255,230,80,${cornerGlow})`} />
              <circle cx="306" cy="167" r="3" fill={`rgba(255,230,80,${cornerGlow})`} />
            </>
          )}

          {/* Tackle: center hot zone */}
          {tacklePulse > 0 && (
            <circle cx="157" cy="87.5" r="46" fill={`rgba(255,200,50,${tacklePulse})`} />
          )}

          {/* Field lines */}
          <rect x="8" y="8" width="298" height="159" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <line x1="157" y1="8" x2="157" y2="167" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
          <circle cx="157" cy="87.5" r="26" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <circle cx="157" cy="87.5" r="2" fill="rgba(255,255,255,0.6)" />
          <rect x="8" y="51" width="54" height="73" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <rect x="252" y="51" width="54" height="73" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <rect x="8" y="68" width="20" height="39" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <rect x="286" y="68" width="20" height="39" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <circle cx="47" cy="87.5" r="2" fill="rgba(255,255,255,0.55)" />
          <circle cx="267" cy="87.5" r="2" fill="rgba(255,255,255,0.55)" />
          <path d="M 18,8 A 10,10 0 0,0 8,18" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <path d="M 296,8 A 10,10 0 0,1 306,18" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <path d="M 8,157 A 10,10 0 0,1 18,167" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />
          <path d="M 296,167 A 10,10 0 0,0 306,157" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" />

          {/* Team1 players (attacking, cluster around ball) */}
          <motion.g style={{ x: ballPosX, y: ballPosY }}>
            <circle cx="-22" cy="12" r="4" fill="rgba(80,220,140,0.85)" />
            <circle cx="-12" cy="-19" r="4" fill="rgba(80,220,140,0.85)" />
            <circle cx="-30" cy="-6" r="3.5" fill="rgba(80,220,140,0.7)" />
          </motion.g>
          {/* Team2 players (defending, slightly offset) */}
          <motion.g style={{ x: ballPosX, y: ballPosY }}>
            <circle cx="25" cy="-12" r="4" fill="rgba(220,80,80,0.85)" />
            <circle cx="16" cy="20" r="4" fill="rgba(220,80,80,0.85)" />
            <circle cx="32" cy="6" r="3.5" fill="rgba(220,80,80,0.7)" />
          </motion.g>

          {/* Direction arrow from center toward ball */}
          <line x1="157" y1="87.5" x2="0" y2="0" stroke="none" />

          {/* Ball glow halo */}
          <motion.circle cx={0} cy={0} r={22} fill="rgba(255,255,255,0.1)" style={{ x: ballPosX, y: ballPosY }} />
          {/* Ball shadow */}
          <motion.circle cx={0} cy={0} r={5.5} fill="rgba(0,0,0,0.3)" style={{ x: ballPosX, y: ballShadowY }} />
          {/* Ball body */}
          <motion.circle cx={0} cy={0} r={5.2} fill="white" style={{ x: ballPosX, y: ballPosY }} />
          {/* Ball panel lines */}
          <motion.circle cx={0} cy={0} r={5.2} fill="none" stroke="rgba(30,30,30,0.25)" strokeWidth="0.7" style={{ x: ballPosX, y: ballPosY }} />

        </svg>

        {/* Direction arrow overlay (CSS, rotates toward ball) */}
        {(trackerState === 'setup' || trackerState === 'live') && !isPossessionMkt && (
          <div style={{ position: 'absolute', left: 157, top: 87.5, zIndex: 6, pointerEvents: 'none' }}>
            <motion.div style={{ rotate: directionAngle, width: 46, height: 14, transformOrigin: '0 50%', display: 'flex', alignItems: 'center', marginTop: -7 }}>
              <div style={{ flex: 1, height: 1.5, background: 'rgba(255,255,255,0.28)', borderRadius: 1 }} />
              <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '7px solid rgba(255,255,255,0.28)' }} />
            </motion.div>
          </div>
        )}

        {/* Event flash — центр поля */}
        <AnimatePresence>
          {eventFlash && (
            <motion.div key={eventFlash + timeLeft} initial={{ opacity: 0, scale: 0.88, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ duration: 0.22 }}
              style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 25, pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 10, padding: '5px 13px', border: '1px solid rgba(255,255,255,0.14)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{eventFlash}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WIN / LOSS overlays */}
        <AnimatePresence>
          {trackerState === 'win' && (
            <motion.div key="win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,110,48,0.68)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 32 }}>
              <CheckCircleSVG size={52} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Ставка выиграла!</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{placedBetRef.current.label} · ×{placedBetRef.current.odds}</span>
            </motion.div>
          )}
          {trackerState === 'loss' && (
            <motion.div key="loss" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(130,15,15,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 32 }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: 'rgba(255,80,80,0.18)', border: '1px solid rgba(255,80,80,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 4L18 18M18 4L4 18" stroke="#ff6666" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Не зашло</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{placedBetRef.current.label} · ×{placedBetRef.current.odds}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LIVE badge */}
        {trackerState === 'live' && (
          <div style={{ position: 'absolute', top: 10, left: 14, zIndex: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <motion.div animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 0.9, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: 3, background: '#ff3333', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#ff4444', letterSpacing: 0.5 }}>В ИГРЕ</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginLeft: 3 }}>{placedBetRef.current.label} · ×{placedBetRef.current.odds}</span>
          </div>
        )}


        {/* Possession team labels — bottom corners */}
        {isPossessionMkt && trackerState === 'setup' && (
          <>
            <div style={{ position: 'absolute', bottom: 10, left: 14, zIndex: 20, background: `rgba(40,180,100,${0.2 + leftAlpha * 0.5})`, borderRadius: 7, padding: '3px 8px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7fffd4' }}>{card.label1} {momentumPct}%</span>
            </div>
            <div style={{ position: 'absolute', bottom: 10, right: 54, zIndex: 20, background: `rgba(200,60,60,${0.2 + rightAlpha * 0.5})`, borderRadius: 7, padding: '3px 8px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ffaaaa' }}>{card.label2} {100 - momentumPct}%</span>
            </div>
          </>
        )}

        {/* Market label (corner / tackle) */}
        {trackerState === 'setup' && !isPossessionMkt && (
          <div style={{ position: 'absolute', bottom: 10, right: 54, zIndex: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 9px' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {isCornerMkt ? `угловой · ${momentumPct}%` : `отбор · ${momentumPct}%`}
            </span>
          </div>
        )}

        {/* Toggle to video */}
        <div onClick={() => onToggleTracker(false)}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 10, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <rect x="0.5" y="0.5" width="12" height="9" rx="1.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
            <path d="M5 3L9 5L5 7V3Z" fill="rgba(255,255,255,0.5)"/>
          </svg>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>видео</span>
        </div>
      </motion.div>
    );
  };

  const VideoBlock = ({ collapse }: { collapse?: boolean }) => (
    <motion.div
      initial={false}
      animate={{ height: (collapse && keyboardOpen) ? 0 : 175 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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
            <MediaSlot />
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
                              <div key={bi} style={{ width: btn.full ? '100%' : 'calc(50% - 4px)', height: 62, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)', position: 'relative', overflow: 'hidden' }} onClick={() => onBet(btn.label, btn.odds)}>
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
            <MediaSlot />
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
                              <div key={bi} style={{ width: 'calc((100% - 16px) / 3)', height: 62, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }} onClick={() => onBet(btn.l, btn.o)}>
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
    const round = PENALTY_SERIES[penaltyRoundIdx];
    const isLastRound = penaltyRoundIdx >= PENALTY_SERIES.length - 1;
    const penaltyColor = timerColorAt(0);
    const resultScoreZ = penaltyScore.z + (round.team === 'Зенит' && round.scored ? 1 : 0);
    const resultScoreS = penaltyScore.s + (round.team === 'Спартак' && round.scored ? 1 : 0);
    const betWasPlaced = !!placedBetRef.current.label;

    const PenaltyTracker = ({ isResult }: { isResult?: boolean }) => {
      const zenitKicks   = PENALTY_SERIES.map((r, i) => ({ ...r, i })).filter(r => r.team === 'Зенит');
      const spartakKicks = PENALTY_SERIES.map((r, i) => ({ ...r, i })).filter(r => r.team === 'Спартак');
      const currentIdx = isResult ? penaltyRoundIdx + 1 : penaltyRoundIdx;

      const Dot = ({ kick }: { kick: { i: number; scored: boolean } }) => {
        const done = kick.i < currentIdx;
        const current = kick.i === penaltyRoundIdx && !isResult;
        const color = done ? (kick.scored ? '#27db55' : '#ff4444') : 'rgba(255,255,255,0.12)';
        if (current) return <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><SoccerBallSVG size={18} /></div>;
        return (
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' }}>
            {done && <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>{kick.scored ? '✓' : '✗'}</span>}
          </div>
        );
      };

      return (
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
          {[{ team: 'Зенит', logo: card.logo1, kicks: zenitKicks }, { team: 'Спартак', logo: card.logo2, kicks: spartakKicks }].map(({ team, logo, kicks }) => (
            <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Logo + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 72, flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team}</span>
              </div>
              {/* Dots */}
              <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
                {kicks.map(kick => <Dot key={kick.i} kick={kick} />)}
              </div>
              {/* Score */}
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', minWidth: 14, textAlign: 'right', flexShrink: 0 }}>
                {isResult ? (team === 'Зенит' ? resultScoreZ : resultScoreS) : (team === 'Зенит' ? penaltyScore.z : penaltyScore.s)}
              </span>
            </div>
          ))}
        </div>
      );
    };

    const handleNextRound = () => {
      setRoundResultTimer(0);
      const newZ = penaltyScore.z + (round.team === 'Зенит' && round.scored ? 1 : 0);
      const newS = penaltyScore.s + (round.team === 'Спартак' && round.scored ? 1 : 0);
      setPenaltyScore({ z: newZ, s: newS });
      if (isLastRound) { setPenaltySeriesOver(true); return; }
      placedBetRef.current = { label: '', odds: '', amount: 0 };
      onClearBet();
      setPenaltyRoundIdx(r => r + 1);
    };

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
            <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 8px 8px', minHeight: 268 }}>

              {penaltySeriesOver ? (
                // ── SERIES OVER ──
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#ff6b6b', background: 'rgba(220,50,50,0.15)', border: '1px solid rgba(220,50,50,0.3)', borderRadius: 20, padding: '3px 12px', letterSpacing: 0.6 }}>⚽ СЕРИЯ ЗАВЕРШЕНА</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.logo1} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                      <span style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>{penaltyScore.z} : {penaltyScore.s}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.logo2} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                    </div>
                    <p style={{ fontSize: 20, fontWeight: 800, color: '#00c958', margin: 0, textAlign: 'center' }}>
                      {penaltyScore.z > penaltyScore.s ? 'Зенит' : 'Спартак'} выигрывает серию!
                    </p>
                  </div>
                  <div style={{ width: '100%', paddingTop: 8 }}>
                    <div onClick={() => setIsExiting(true)} onPointerDown={e => e.stopPropagation()} style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Следующий маркет</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>

              ) : betPlaced ? (
                // ── WAITING FOR RESULT ──
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <motion.div style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale }}>
                      <SoccerBallSVG size={56} />
                    </motion.div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Ожидаем результат...</p>
                  </div>
                  <div style={{ width: '100%', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{placedBetRef.current.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.7 }}>{placedBetRef.current.odds}</span>
                  </div>
                </motion.div>

              ) : betResult ? (
                // ── ROUND RESULT ──
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <PenaltyTracker isResult />
                  {/* Ball + text centered in remaining space */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {round.scored ? <SoccerBallSVG size={60} /> : (
                        <svg width="60" height="60" viewBox="0 0 88 88" fill="none"><circle cx="44" cy="44" r="37" fill="rgba(220,50,50,0.18)" stroke="rgba(220,50,50,0.35)" strokeWidth="1.5"/><path d="M30 30L58 58M58 30L30 58" stroke="#e04444" strokeWidth="3.5" strokeLinecap="round"/></svg>
                      )}
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>
                      {round.scored ? `${round.player} забил! ⚽` : `${round.player} не забил`}
                    </p>
                    {betWasPlaced && (
                      <div style={{ fontSize: 13, color: betWon ? '#00c958' : 'rgba(238,239,243,0.45)' }}>
                        {betWon ? '✓ Ставка выиграла!' : 'Ставка не зашла'}
                      </div>
                    )}
                  </div>
                  {/* Button pinned to bottom */}
                  <div style={{ width: '100%', paddingTop: 6 }} onPointerDown={e => e.stopPropagation()}>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                      onClick={handleNextRound}
                      style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                        {isLastRound ? 'Результат серии'
                          : roundResultTimer > 0 ? `Следующий удар через ${roundResultTimer}с`
                          : `Следующий удар · ${penaltyRoundIdx + 2}/${PENALTY_SERIES.length}`}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </motion.div>
                  </div>
                </motion.div>

              ) : (
                // ── ACTIVE BETTING ──
                <>
                  <PenaltyTracker />
                  {/* Question */}
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, marginTop: 4, textAlign: 'center', lineHeight: '22px' }}>Забьёт пенальти?</p>
                  {/* Who kicks */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={round.team === 'Зенит' ? card.logo1 : card.logo2} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{round.team} бьёт · {round.player}</span>
                  </div>
                  {/* Timer */}
                  <motion.span animate={{ color: penaltyColor }} style={{ fontSize: 40, fontWeight: 700, lineHeight: '44px', marginTop: 2 }}>
                    {timeLeft}
                  </motion.span>
                  <div style={{ width: '100%', marginTop: 'auto', paddingTop: 7, position: 'relative', zIndex: 11 }}>
                    <AnimatePresence mode="wait" initial={false}>
                      {activeBet ? (
                        <motion.div key="selected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} onPointerDown={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', pointerEvents: 'auto' }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{activeBet.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.8 }}>{activeBet.odds}</span>
                            <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer' }}>
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex', gap: 8 }}>
                          {[{ label: 'Да', odds: round.oddsYes, pct: round.pct }, { label: 'Нет', odds: round.oddsNo, pct: '' }].map((btn, bi) => (
                            <div key={bi} onClick={() => onBet(btn.label, btn.odds)} onPointerDown={e => e.stopPropagation()}
                              style={{ flex: 1, height: 92, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 14, paddingBottom: 10, gap: 4, position: 'relative', cursor: 'pointer', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)' }}>
                              <div style={{ position: 'absolute', inset: 0, borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(225deg, rgba(255,255,255,0.09) 0%, transparent 40%)', pointerEvents: 'none' }} />
                              {btn.pct && <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', background: '#262a33', borderRadius: 16, height: 14, padding: '0 5px', display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#929bae' }}>{btn.pct}</span>
                              </div>}
                              <div style={{ height: 34, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 24, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{btn.label}</span>
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(238,239,243,0.65)', lineHeight: '16px' }}>{btn.odds}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
            <motion.div animate={{ borderRadius: 32, opacity: (betResult || penaltySeriesOver) ? 0 : 1 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, boxShadow: glowBoxShadow }} />
            {betResult && betWasPlaced && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: betWon ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 18px 0px rgba(255,255,255,0.12), inset 0px 8px 30px 2px rgba(200,50,50,0.3)' }} />}
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
          <MediaSlot collapse />

          <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 8px 8px', minHeight: (betPlaced || betResult) ? 268 : sheetOpen ? 260 : 268 }}>
            {(betPlaced || betResult) ? BetResultArea() : isExpired ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '0 8px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M33.998 20.2841V14C33.998 8.486 29.512 4 23.998 4C18.484 4 13.998 8.486 13.998 14V20.2841C10.556 21.1781 7.99805 24.284 7.99805 28V36C7.99805 40.412 11.586 44 15.998 44H31.998C36.41 44 39.998 40.412 39.998 36V28C39.998 24.284 37.44 21.1781 33.998 20.2841ZM17.998 14C17.998 10.692 20.69 8 23.998 8C27.306 8 29.998 10.692 29.998 14V20H17.998V14ZM35.998 36C35.998 38.206 34.204 40 31.998 40H15.998C13.792 40 11.998 38.206 11.998 36V28C11.998 25.794 13.792 24 15.998 24H31.998C34.204 24 35.998 25.794 35.998 28V36ZM22.696 35.938H25.306L26.668 27.938H21.3361L22.696 35.938Z" fill="#EEEFF3" fillOpacity={0.5}/>
                  </svg>
                  <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(238,239,243,0.5)' }}>Время вышло</span>
                </div>
                <div onClick={() => setIsExiting(true)} onPointerDown={e => e.stopPropagation()} style={{ width: '100%', height: 48, background: 'transparent', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Следующий маркет</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
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
              <span style={{ fontSize: 10, fontWeight: 500, color: '#929bae', lineHeight: '12px', marginTop: 5 }}>{card.period}</span>


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
                            <div style={{ height: 34, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{btn.label}</span>
                            </div>
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
    id: 4, label: 'Серия пенальти', title: 'Серия пенальти', badge: '⚽',
    steps: ['Карточка остаётся до конца серии (5 ударов)', 'На каждый удар — 8 секунд, действуйте быстро!', 'Нажмите «Да» (забьёт) или «Нет»', 'Введите сумму и сделайте ставку', 'Карточка показывает счёт серии и переходит к следующему удару'],
    note: 'Серия из 5 пенальти (Смолов, Промес, Дзюба, Соболев, Малком). Оцените: передаёт ли интерфейс напряжение и счёт серии?',
  },
  {
    id: 5, label: 'Ситуативный маркет', title: 'Следующее событие', badge: null,
    steps: ['Выберите одно из событий: Гол, Угловой, Фол, Аут...', 'Нажмите на исход', 'Введите сумму и подтвердите ставку'],
    note: 'Мультиисходный маркет. Оцените: понятно ли какой из исходов выбрать? Не слишком ли много вариантов?',
  },
  {
    id: 6, label: 'Обычная линия', title: 'Исход матча', badge: null,
    steps: ['Выберите исход: П1, X или П2', 'Или комбинированный: 1X, 12, 2X', 'Введите сумму и сделайте ставку'],
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
  const [sessionPnL, setSessionPnL] = useState(850);
  const [sessionWins, setSessionWins] = useState(3);
  const [totalBets, setTotalBets] = useState(5);
  const [bottomTab, setBottomTab] = useState<'stats' | 'history'>('stats');

  type BetHistoryItem = { id: number; won: boolean; label: string; odds: string; amount: number; market: string; pnl: number };
  const [betHistory, setBetHistory] = useState<BetHistoryItem[]>([
    { id: 1, won: true,  label: 'Да',    odds: '1.55', amount: 500,  market: 'Будет угловой следующие',    pnl: 275  },
    { id: 2, won: false, label: 'Зенит', odds: '1.70', amount: 300,  market: 'Кто дольше будет владеть',   pnl: -300 },
    { id: 3, won: true,  label: 'Нет',   odds: '1.85', amount: 1000, market: 'Будет отбор мяча следующие', pnl: 850  },
    { id: 4, won: true,  label: 'Да',    odds: '1.30', amount: 750,  market: 'Забьёт Смолов?',             pnl: 225  },
    { id: 5, won: false, label: 'Нет',   odds: '2.35', amount: 200,  market: 'Забьёт Соболев?',            pnl: -200 },
  ]);
  const historyIdRef = useRef(6);
  const [lockedIdx, setLockedIdx] = useState(-1);

  const [resetKey, setResetKey] = useState(0);
  const [liveCards, setLiveCards] = useState<CardData[]>(() => [...CARDS]);
  const liveCardsRef = useRef<CardData[]>([...CARDS]);
  const liveN = liveCards.length;
  const liveNRef = useRef(liveN);
  liveNRef.current = liveN;
  const liveVirtual = liveN > 0 ? [liveCards[liveN - 1], ...liveCards, liveCards[0]] : [];

  const [vIdx, setVIdx] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const vIdxRef      = useRef(1);
  const draggingRef  = useRef(false);
  const dragTrackRef = useRef(false);
  const wasDragRef   = useRef(false);
  const startX       = useRef(0);
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

  const onDownCapture = (e: React.PointerEvent) => {
    if (liveNRef.current <= 1 || selectedBet) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-nodrag]')) return;
    wasDragRef.current = false;
    dragTrackRef.current = true;
    startX.current = e.clientX;
  };
  const onMoveCapture = (e: React.PointerEvent) => {
    if (!dragTrackRef.current) return;
    const dx = e.clientX - startX.current;
    if (!wasDragRef.current && Math.abs(dx) > 8) {
      wasDragRef.current = true;
      draggingRef.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      stopShift();
      if (animCtrl.current) { animCtrl.current.stop(); animCtrl.current = null; }
      const curN = liveNRef.current;
      if (vIdxRef.current === 0) { x.set(getX(curN)); vIdxRef.current = curN; setVIdx(curN); }
      if (vIdxRef.current === curN + 1) { x.set(getX(1)); vIdxRef.current = 1; setVIdx(1); }
    }
    if (wasDragRef.current) x.set(getX(vIdxRef.current) + dx);
  };
  const onUpCapture = (e: React.PointerEvent) => {
    if (!dragTrackRef.current) return;
    dragTrackRef.current = false;
    if (!wasDragRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const offset = e.clientX - startX.current;
    let next = vIdxRef.current;
    if (offset < -50) next++;
    else if (offset > 50) next--;
    next = Math.max(0, Math.min(liveNRef.current + 1, next));
    snapTo(next);
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (wasDragRef.current) { e.stopPropagation(); wasDragRef.current = false; }
  };

  const lastWheelTime = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (selectedBet || liveN <= 1) return;
    if (Math.abs(e.deltaX) < 8) return;
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.7) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 600) return;
    lastWheelTime.current = now;
    const next = Math.max(0, Math.min(liveNRef.current + 1, vIdxRef.current + (e.deltaX > 0 ? 1 : -1)));
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
  const handleScenarioClick = (scenarioIdx: number) => {
    const targetCard = CARDS[scenarioIdx];
    if (!targetCard) return;
    stopShift();
    if (animCtrl.current) { animCtrl.current.stop(); animCtrl.current = null; }
    // Penalty series: show only the penalty card (no other cards in carousel)
    if (scenarioIdx === 3) {
      const penaltyOnly = [targetCard];
      liveCardsRef.current = penaltyOnly;
      vIdxRef.current = 1;
      flushSync(() => { setLiveCards(penaltyOnly); setVIdx(1); });
      x.set(getX(1));
    } else {
      const currentCards = liveCardsRef.current;
      const existingPos = currentCards.findIndex(c => c.id === targetCard.id);
      if (existingPos >= 0) {
        const newVIdx = existingPos + 1;
        vIdxRef.current = newVIdx;
        x.set(getX(newVIdx));
        setVIdx(newVIdx);
      } else {
        const newCards = [...currentCards, targetCard].sort((a, b) => a.id - b.id);
        const newPos = newCards.findIndex(c => c.id === targetCard.id);
        const newVIdx = newPos + 1;
        liveCardsRef.current = newCards;
        vIdxRef.current = newVIdx;
        flushSync(() => { setLiveCards(newCards); setVIdx(newVIdx); });
        x.set(getX(newVIdx));
      }
    }
    setLockedIdx(scenarioIdx);
    setSelectedBet(null);
    setResetKey(k => k + 1);
  };

  const currentCard = liveCards[realIdx];
  const scenarioIndex = currentCard ? currentCard.id - 1 : 0;
  const displayIdx = lockedIdx >= 0 ? lockedIdx : scenarioIndex;
  const scenario = SCENARIOS[Math.min(displayIdx, SCENARIOS.length - 1)];

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
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Режим</div>
          </div>
          <div
            onClick={() => { setLockedIdx(-1); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', cursor: 'pointer', background: lockedIdx === -1 ? 'rgba(255,255,255,0.06)' : 'transparent', borderLeft: `3px solid ${lockedIdx === -1 ? '#00c958' : 'transparent'}`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ width: 24, height: 24, minWidth: 24, borderRadius: 7, background: lockedIdx === -1 ? 'rgba(0,201,88,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              🔓
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: lockedIdx === -1 ? '#eeeff3' : 'rgba(255,255,255,0.5)', lineHeight: '15px' }}>Свободный просмотр</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>Без инструкций</div>
            </div>
          </div>
          <div style={{ padding: '10px 18px 6px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>Сценарии</div>
          </div>
          {SCENARIOS.map((sc, i) => {
            const isActive = lockedIdx === i;
            return (
              <div
                key={sc.id}
                onClick={() => handleScenarioClick(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', cursor: 'pointer', background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent', borderLeft: `3px solid ${isActive ? '#00c958' : 'transparent'}` }}
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
          <div style={{ padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: '14px' }}>Нажмите сценарий чтобы перейти на нужную карточку</div>
          </div>
        </div>
      </div>

      {/* Phone mockup */}
      <div style={{ width: 360, height: 800, position: 'relative', overflow: 'hidden', borderRadius: 40, flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/img/microbet-bg.png`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0, background: '#0a0c0b', borderRadius: '32px 32px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ width: 134, height: 5, background: '#ffffff', borderRadius: 100, marginTop: 13, flexShrink: 0 }} />

          <div style={{ width: '100%', marginTop: 4, flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 2 }} onWheel={onWheel}
            onPointerDownCapture={onDownCapture}
            onPointerMoveCapture={onMoveCapture}
            onPointerUpCapture={onUpCapture}
            onPointerCancelCapture={onUpCapture}
            onClickCapture={onClickCapture}
          >
            <motion.div
              style={{ display: 'flex', gap: GAP, x, cursor: (selectedBet || liveN <= 1) ? 'default' : (dragging ? 'grabbing' : 'grab'), userSelect: 'none' }}
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
                    onBet={(label, odds, logo) => { setSelectedBet({ label, odds, logo }); }}
                    activeBet={selectedBet}
                    onClearBet={() => setSelectedBet(null)}
                    onExpire={handleExpire}
                    isGhost={isGhost}
                    onExpireInactive={handleExpireInactive}
                    onBetPlaced={() => { setBetsInPlay(n => n + 1); setTotalBets(n => n + 1); }}
                    onBetWon={() => { setBetsInPlay(n => Math.max(0, n - 1)); setSessionWins(n => n + 1); setSessionPnL(n => n + Math.floor(Math.random() * 300 + 150)); }}
                    onBetResult={(won, label, odds, amount, market) => {
                      const pnl = won ? Math.round(amount * (parseFloat(odds) - 1)) : -amount;
                      setBetHistory(h => [{ id: historyIdRef.current++, won, label, odds, amount, market, pnl }, ...h]);
                      if (!won) setBetsInPlay(n => Math.max(0, n - 1));
                      setSessionPnL(n => n + pnl);
                      setBottomTab('history');
                    }}
                    showTracker={showTracker}
                    onToggleTracker={setShowTracker}
                  />
                );
              })}
            </motion.div>
          </div>

          {!selectedBet && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {liveCards.map((_, i) => (
                  <div key={i} onClick={() => liveN > 1 ? snapTo(i + 1) : undefined} style={{ width: i === realIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === realIdx ? '#ffffff' : 'rgba(255,255,255,0.4)', transition: 'width 0.3s ease, background 0.3s ease', cursor: liveN > 1 ? 'pointer' : 'default' }} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom tabs */}
          <div style={{ marginTop: 12, width: 312, flexShrink: 0 }}>
            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 22, padding: 3, marginBottom: 10 }}>
              {(['stats', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  style={{ flex: 1, border: 'none', cursor: 'pointer', borderRadius: 19, padding: '8px 0', fontSize: 12, fontWeight: 600, transition: 'background 0.2s ease, color 0.2s ease', background: bottomTab === tab ? 'rgba(255,255,255,0.12)' : 'transparent', color: bottomTab === tab ? '#eeeff3' : 'rgba(255,255,255,0.35)' }}
                >
                  {tab === 'stats' ? 'Матч' : `История · ${betHistory.length}`}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {bottomTab === 'stats' ? (
                <motion.div key="stats" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}
                  style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}><img src={`${BASE}/img/zenit_real.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#eeeff3' }}>Зенит</span>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em', textTransform: 'uppercase', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>Матч</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#eeeff3' }}>Спартак</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}><img src={`${BASE}/img/spartak_real.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                    </div>
                  </div>
                  {[
                    { label: 'Владение', home: 58, away: 42, pct: true },
                    { label: 'Удары',    home: 7,  away: 4,  pct: false },
                    { label: 'Угловые', home: 3,  away: 1,  pct: false },
                    { label: '🟡 Карточки', home: 2, away: 1, pct: false },
                  ].map((s, i) => {
                    const total = s.home + s.away;
                    const homePct = (s.home / total) * 100;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 3 ? 7 : 0 }}>
                        <span style={{ width: 28, fontSize: 12, fontWeight: 700, color: '#eeeff3', textAlign: 'right', flexShrink: 0 }}>
                          {s.pct ? `${s.home}%` : s.home}
                        </span>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${homePct}%`, background: '#27db55', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 72, textAlign: 'center', flexShrink: 0 }}>{s.label}</span>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${100 - homePct}%`, background: '#e03030', borderRadius: 2 }} />
                        </div>
                        <span style={{ width: 28, fontSize: 12, fontWeight: 700, color: '#eeeff3', flexShrink: 0 }}>
                          {s.pct ? `${s.away}%` : s.away}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="history" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
                  <div onPointerDown={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <AnimatePresence initial={false}>
                      {betHistory.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -24, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                          style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${item.won ? 'rgba(84,199,99,0.15)' : 'rgba(255,80,80,0.12)'}`, borderRadius: 24, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#eeeff3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{item.label} · {item.odds}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{item.market}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: item.won ? '#54C763' : '#ff6b6b' }}>
                              {item.won ? '+' : '−'}₽{Math.abs(item.pnl).toLocaleString('ru-RU')}
                            </div>
                            <div style={{ fontSize: 10, color: item.won ? 'rgba(84,199,99,0.5)' : 'rgba(255,80,80,0.5)', marginTop: 1 }}>
                              {item.won ? '✓ выиграно' : '✗ проиграно'}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ height: 32, flexShrink: 0 }} />

        </div>
      </div>

      {/* Right panel */}
      <div className="sp" style={{ width: 232, flexShrink: 0, alignSelf: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden' }}>
          {lockedIdx === -1 ? (
            <>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 18, lineHeight: 1 }}>🔓</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#eeeff3', lineHeight: '15px' }}>Свободный просмотр</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Режим без ограничений</div>
                </div>
              </div>
              <div style={{ padding: '10px 18px' }}>
                {[
                  { icon: '👆', text: 'Свайпайте карточки влево/вправо чтобы переключать маркеты' },
                  { icon: '🎯', text: 'Нажмите Да/Нет или выберите исход — ставка зафиксируется' },
                  { icon: '💰', text: 'Введите сумму и нажмите «Сделать ставку»' },
                  { icon: '⏱', text: 'Дождитесь результата — он придёт автоматически' },
                  { icon: '⚡', text: 'На пенальти — всего 8 секунд, действуйте быстро!' },
                  { icon: '2️⃣', text: 'Если ставка не зашла — появится «2-й шанс»' },
                ].map((item, si) => (
                  <div key={si} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: si < 5 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ fontSize: 14, lineHeight: '17px', flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: '17px' }}>{item.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ margin: '0 18px 16px', padding: '10px 12px', background: 'rgba(100,100,255,0.07)', border: '1px solid rgba(100,100,255,0.18)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(150,150,255,0.8)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Подсказка</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: '15px' }}>Выберите конкретный сценарий слева — я проведу тебя через него с пошаговыми инструкциями</div>
              </div>
              <div style={{ margin: '0 18px 16px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Индикатор рамки</div>
                {[
                  { dot: '#00cc66', text: 'Много времени — спокойный медленный пульс' },
                  { dot: '#ffcc00', text: 'Мало времени — пульс быстрее, цвет янтарный' },
                  { dot: '#ff4444', text: 'Критично — красный, быстро мигает' },
                  { dot: '#ff4444', text: 'Пенальти — всегда красный (экстренный режим)' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < 3 ? 5 : 0 }}>
                    <div style={{ width: 8, height: 8, minWidth: 8, borderRadius: '50%', background: item.dot, boxShadow: `0 0 6px ${item.dot}` }} />
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: '14px' }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(0,201,88,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#00c958', flexShrink: 0 }}>{lockedIdx + 1}</div>
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
                <div style={{ margin: '8px 18px 8px', padding: '10px 12px', background: 'rgba(255,200,0,0.07)', border: '1px solid rgba(255,200,0,0.15)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,200,0,0.7)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Что оцениваем</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: '15px' }}>{scenario.note}</div>
                </div>
              )}
              <div style={{ margin: '4px 18px 16px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Рамка карточки</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[['#00cc66','Зелёная — много времени'],['#ffcc00','Жёлтая — мало времени'],['#ff4444','Красная — критично / пенальти']].map(([c,t]) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 7, height: 7, minWidth: 7, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: '13px' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
