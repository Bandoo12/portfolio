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

const CARDS = [
  { id: 1, type: 'line'   as const, question: '', timer: 999999, start: 999999, unit: '', period: '', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '14.94', odds2: '2.21', pct1: '', pct2: '', label1: 'Гол', label2: 'Фол', hint1: '', hint2: '', question2nd: 'Что произойдет следующим?' },
  { id: 2, type: 'window' as const, question: '', timer: 600, start: 600, unit: '', period: '48:00–58:00', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '1.65', odds2: '3.55', pct1: '75%', pct2: '25%', label1: 'Фол', label2: 'Аут', hint1: '', hint2: '', question2nd: 'Что произойдет\nследующим?' },
];

const PENALTY_CARD = { id: 99, type: 'penalty' as const, question: '', timer: 999999, start: 999999, unit: '', period: '', logo1: IMG.zenit, logo2: IMG.spartak, odds1: '', odds2: '', pct1: '', pct2: '', label1: '', label2: '', hint1: '', hint2: '', question2nd: '' };

const PENALTY_SERIES = [
  { player: 'Смолов',  team: 'Зенит',   oddsYes: '1.30', oddsNo: '3.80', pct: '77%', scored: true  },
  { player: 'Промес',  team: 'Спартак',  oddsYes: '1.45', oddsNo: '2.70', pct: '69%', scored: true  },
  { player: 'Дзюба',   team: 'Зенит',   oddsYes: '1.20', oddsNo: '4.50', pct: '83%', scored: false },
  { player: 'Соболев', team: 'Спартак',  oddsYes: '1.60', oddsNo: '2.35', pct: '63%', scored: false },
  { player: 'Малком',  team: 'Зенит',   oddsYes: '1.35', oddsNo: '3.40', pct: '74%', scored: true  },
];

type CardData = (typeof CARDS)[number] | typeof PENALTY_CARD;

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

function SoccerBallSVG({ size = 80, w, h, color = '#91FABA' }: { size?: number; w?: number; h?: number; color?: string }) {
  return (
    <svg width={w ?? size} height={h ?? size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.0509 31.7733C21.7923 29.9902 21.2393 27.8676 20.5778 25.3282L18.595 17.7161L18.5601 17.582C21.1642 15.072 24.1387 12.9443 27.3932 11.2891L33.3781 15.8283C35.4298 17.3845 37.1547 18.6929 38.6818 19.5958C39.4815 20.0686 40.2867 20.468 41.1268 20.7536V31.834C40.6754 32.0443 40.2427 32.3086 39.8383 32.6263L32.7532 38.194C32.4888 38.4019 32.2437 38.6267 32.0182 38.8665L22.1983 34.6143C22.2577 33.686 22.1918 32.7447 22.0509 31.7733Z" fill={color}/>
      <path d="M14.8319 37.4096C13.7502 38.3413 12.2274 39.3808 9.93756 40.9358L7.35645 42.6892C7.61858 35.2188 10.1128 28.3171 14.1918 22.6318L15.2172 26.5684C15.9266 29.2918 16.3981 31.1179 16.6077 32.5627C16.8076 33.9406 16.7221 34.698 16.4972 35.3076C16.2741 35.9123 15.8572 36.526 14.8319 37.4096Z" fill={color}/>
      <path d="M19.4374 61.9122C21.9842 61.9122 24.1312 61.9122 25.8852 62.1183C26.8103 62.2268 27.6937 62.3988 28.5363 62.6829L33.7272 55.8908C33.5381 55.5241 33.3808 55.1369 33.2591 54.7318L30.4763 45.4683C30.3384 45.0092 30.2511 44.5436 30.212 44.0783L20.2145 39.749C19.6928 40.4043 19.0888 41.0023 18.4221 41.5769C17.0726 42.7396 15.2841 43.954 13.1556 45.3997L7.68701 49.1137C8.32725 53.7073 9.81756 58.0285 11.9937 61.9122H19.4374Z" fill={color}/>
      <path d="M43.2366 36.9508C43.435 36.7954 43.6586 36.7246 43.8768 36.7246C44.095 36.7246 44.3186 36.7954 44.517 36.9508L51.6021 42.5187C51.7909 42.6672 51.9347 42.8776 52.0098 43.1273C52.0824 43.3693 52.0857 43.633 52.0098 43.8856L49.2268 53.1494C49.1506 53.4043 49.0065 53.6067 48.8319 53.7478C48.6391 53.9037 48.4121 53.9843 48.1789 53.9843H39.5747C39.3415 53.9843 39.1145 53.9037 38.9217 53.7478C38.7471 53.6067 38.603 53.4043 38.5264 53.1494L35.7437 43.8856C35.6678 43.633 35.671 43.3693 35.7437 43.1273C35.8188 42.8776 35.9626 42.6672 36.1516 42.5187L43.2366 36.9508Z" fill={color}/>
      <path d="M49.0448 19.7107C50.591 18.8418 52.3433 17.572 54.4267 16.0618L60.8096 11.4365C63.9802 13.0845 66.8798 15.1831 69.4237 17.6476L67.4228 25.3287C66.7614 27.8682 66.2084 29.9907 65.9499 31.7738C65.8098 32.74 65.7439 33.6764 65.8014 34.5999L55.7463 38.8784C55.5179 38.6342 55.2689 38.4054 55.0005 38.1942L47.9154 32.6265C47.511 32.3087 47.0783 32.0444 46.627 31.8342V20.7979C47.4545 20.5318 48.2517 20.1566 49.0448 19.7107Z" fill={color}/>
      <path d="M41.481 14.8613C40.2592 14.1389 38.7863 13.0271 36.5773 11.3516L33.3413 8.89724C36.7015 7.87993 40.2658 7.33301 43.9578 7.33301C47.744 7.33301 51.396 7.90816 54.8313 8.97597L51.326 11.5162C49.082 13.1423 47.5863 14.2209 46.3499 14.9158C45.1748 15.5762 44.4909 15.7368 43.9072 15.7303C43.3235 15.7238 42.6426 15.5479 41.481 14.8613Z" fill={color}/>
      <path d="M69.5785 41.5766C70.9278 42.7393 72.7164 43.9537 74.8449 45.3995L80.236 49.061C79.5998 53.6741 78.1064 58.0132 75.9222 61.9116H69.1088C66.5619 61.9116 64.4151 61.9116 62.6609 62.1177C61.6973 62.2306 60.7788 62.4125 59.9047 62.7186L54.0762 55.7912C54.243 55.4542 54.3834 55.1 54.4942 54.7312L57.2772 45.4677C57.4136 45.0134 57.5005 44.5521 57.5401 44.0916L67.7759 39.7363C68.2999 40.3967 68.9075 40.9984 69.5785 41.5766Z" fill={color}/>
      <path d="M54.2973 68.2973C53.5578 69.9334 52.882 72.0186 52.0742 74.5116L50.2545 80.1271C48.2088 80.482 46.1049 80.6668 43.9577 80.6668C42.043 80.6668 40.1623 80.5198 38.3268 80.236L36.4719 74.5116C35.6641 72.0186 34.9884 69.9334 34.2486 68.2973C33.8708 67.4621 33.4506 66.6825 32.9448 65.9719L38.0426 59.3015C38.5358 59.4214 39.0491 59.4845 39.5746 59.4845H48.1788C48.7423 59.4845 49.2923 59.4115 49.8185 59.2744L55.5341 66.0673C55.0582 66.7518 54.6585 67.4991 54.2973 68.2973Z" fill={color}/>
      <path d="M31.2865 76.3518C30.4196 73.6762 29.8354 71.8862 29.2371 70.5636C28.666 69.3004 28.1955 68.7328 27.7031 68.3676C27.2171 68.0076 26.5638 67.7355 25.2434 67.5804C23.8479 67.4165 22.0259 67.4121 19.2798 67.4121H15.77C20.0159 72.5304 25.6259 76.4732 32.0417 78.6823L31.2865 76.3518Z" fill={color}/>
      <path d="M63.3027 67.5804C64.6982 67.4165 66.5202 67.4121 69.2661 67.4121H72.1456C68.0576 72.3397 62.705 76.1784 56.5864 78.4286L57.2596 76.3518C58.1264 73.6762 58.7105 71.8862 59.3089 70.5636C59.8802 69.3004 60.3506 68.7328 60.8431 68.3676C61.3289 68.0076 61.9823 67.7355 63.3027 67.5804Z" fill={color}/>
      <path d="M71.3925 32.5631C71.6023 31.1183 72.0738 29.2922 72.7833 26.5688L73.7862 22.7188C77.8177 28.3725 80.2857 35.2208 80.5574 42.6306L78.0629 40.9362C75.7731 39.3812 74.2503 38.3417 73.1687 37.41C72.1431 36.5265 71.7262 35.9127 71.5033 35.3081C71.2781 34.6984 71.1927 33.941 71.3925 32.5631Z" fill={color}/>
    </svg>
  );
}

function LossCircleSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M80.6668 43.9997C80.6668 64.2499 64.2504 80.6663 44.0002 80.6663C23.7497 80.6663 7.3335 64.2499 7.3335 43.9997C7.3335 23.7492 23.7497 7.33301 44.0002 7.33301C64.2504 7.33301 80.6668 23.7492 80.6668 43.9997ZM32.8888 32.8884C33.9627 31.8145 35.7039 31.8145 36.7779 32.8884L44.0002 40.1104L51.222 32.8885C52.296 31.8145 54.0373 31.8145 55.1113 32.8885C56.1852 33.9624 56.1852 35.7036 55.1113 36.7774L47.889 43.9997L55.1113 51.2215C56.1852 52.2955 56.1852 54.0368 55.1113 55.1108C54.0373 56.1847 52.296 56.1847 51.222 55.1108L44.0002 47.8889L36.7779 55.1108C35.704 56.1847 33.9628 56.1847 32.8889 55.1108C31.8149 54.0368 31.8149 52.2955 32.8889 51.2219L40.1109 43.9997L32.8888 36.7774C31.8148 35.7035 31.8148 33.9623 32.8888 32.8884Z" fill="#FA9191"/>
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

const FIRE_SPARKS = [
  { id: 0,  x: 8,  delay: 0.10, dur: 1.6, size: 2.5, col: '#FF8C00' },
  { id: 1,  x: 22, delay: 0.50, dur: 1.9, size: 2,   col: '#FF4500' },
  { id: 2,  x: 35, delay: 0.00, dur: 1.4, size: 3,   col: '#FFD700' },
  { id: 3,  x: 48, delay: 0.80, dur: 2.1, size: 2,   col: '#FF6600' },
  { id: 4,  x: 62, delay: 0.30, dur: 1.7, size: 3,   col: '#FF8C00' },
  { id: 5,  x: 75, delay: 0.60, dur: 1.5, size: 2.5, col: '#FF4500' },
  { id: 6,  x: 88, delay: 0.20, dur: 1.8, size: 2,   col: '#FFD700' },
  { id: 7,  x: 15, delay: 1.00, dur: 1.3, size: 2,   col: '#FF6600' },
  { id: 8,  x: 55, delay: 1.20, dur: 1.6, size: 3,   col: '#FF8C00' },
  { id: 9,  x: 30, delay: 1.50, dur: 2.0, size: 2,   col: '#FFD700' },
  { id: 10, x: 70, delay: 0.90, dur: 1.4, size: 2.5, col: '#FF4500' },
  { id: 11, x: 42, delay: 1.70, dur: 1.8, size: 2,   col: '#FF6600' },
  { id: 12, x: 82, delay: 0.40, dur: 1.5, size: 3,   col: '#FF8C00' },
  { id: 13, x: 5,  delay: 1.30, dur: 2.1, size: 2,   col: '#FFD700' },
  { id: 14, x: 93, delay: 0.70, dur: 1.6, size: 2.5, col: '#FF4500' },
  { id: 15, x: 60, delay: 1.90, dur: 1.3, size: 2,   col: '#FF6600' },
  { id: 16, x: 25, delay: 0.15, dur: 1.7, size: 3,   col: '#FF8C00' },
  { id: 17, x: 78, delay: 1.10, dur: 1.9, size: 2,   col: '#FFD700' },
];


function GoalFireOverlay() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 32 }}>
      {/* Dark background — 80% opaque so tracker faintly shows through */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(9,1,0,0.8)', borderRadius: 32 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 60% at 50% 100%, rgba(90,18,0,0.65) 0%, transparent 100%)', borderRadius: 32 }} />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox="0 0 314 175" fill="none">
        <defs>
          <filter id="go-glow" x="-20%" y="-50%" width="140%" height="200%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="25"/>
          </filter>
          <linearGradient id="go-left" x1="71" y1="53" x2="71" y2="175" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FE2D16" stopOpacity="0"/>
            <stop offset="1" stopColor="#FE2D16"/>
          </linearGradient>
          <linearGradient id="go-right" x1="241" y1="95" x2="241" y2="175" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FE2D16" stopOpacity="0"/>
            <stop offset="1" stopColor="#FE2D16"/>
          </linearGradient>
          <linearGradient id="go-rtip" x1="278.5" y1="83" x2="278.5" y2="115" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FE2D16" stopOpacity="0"/>
            <stop offset="1" stopColor="#FE2D16"/>
          </linearGradient>
        </defs>

        {/* Bottom orange glow — blurred ellipse from Figma */}
        <ellipse cx="160.5" cy="206" rx="173.5" ry="73" fill="#FF4800" filter="url(#go-glow)"/>

        {/* Left flame — exact Figma path, animated */}
        <motion.g style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' } as React.CSSProperties}
          animate={{ scaleX: [1, 1.055, 0.945, 1.04, 0.97, 1], y: [0, -2, 1, -3, 1, 0] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}>
          <path d="M122.87 154.809C121.999 161.275 120.462 165.282 116.024 170.013C113.834 172.348 109.539 175 109.539 175H21.0329C21.0329 175 18.4385 165.149 19.1115 158.823C19.7755 152.579 24.2753 143.618 24.2753 143.618C24.2753 143.618 25.7967 173.732 36.4045 170.013C44.4368 167.197 43.6607 158.138 44.5706 149.578C46.1838 134.403 28.4963 128.799 29.5593 113.574C30.6033 98.6216 48.7738 80.4895 48.7738 80.4895C48.7738 80.4895 39 94 41.5683 108.831C42.7757 115.802 46.0579 121.774 52.9769 122.819C61.5452 124.112 65.5 113.574 67.9882 106.276C74.7074 86.5684 63.4248 53 63.4248 53C63.4248 53 95.3478 83.1389 91.1657 106.276C89.5552 115.186 85.409 119.154 81.7986 127.441C78.042 136.063 70.4641 140.341 72.3115 149.578C74.011 158.076 78.7675 165.47 87.3228 165.756C95.6257 166.033 99.9262 159.216 103.295 151.524C107.07 142.906 98.1491 136.192 101.614 127.441C104.947 119.02 118.306 111.506 118.306 111.506C118.306 111.506 114.067 122.435 114.103 129.752C114.154 140.133 124.255 144.522 122.87 154.809Z" fill="url(#go-left)"/>
        </motion.g>

        {/* Right flame — exact Figma path, animated */}
        <motion.g style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' } as React.CSSProperties}
          animate={{ scaleX: [1, 0.935, 1.065, 0.955, 1.03, 1], y: [0, -3, 1, -2, 2, 0] }}
          transition={{ duration: 1.75, delay: 0.28, repeat: Infinity, ease: 'easeInOut' }}>
          <path d="M273.712 163.35C271.753 168.993 263.773 175 263.773 175H204.134C204.134 175 203.832 169.779 204.134 166.456C205.028 156.61 213.099 142.767 213.099 142.767C213.099 142.767 211.125 150.425 213.099 154.612C213.935 156.383 214.195 157.972 216.023 158.689C217.998 159.464 219.534 158.526 221.285 157.33C224.13 155.388 224.272 152.595 224.598 149.175C224.969 145.293 223.182 143.255 222.26 139.466C221.28 135.445 219.584 133.31 219.726 129.175C219.902 124.038 221.137 120.753 224.598 116.942C228.002 113.194 236.097 110.922 236.097 110.922C236.097 110.922 228.574 118.693 229.081 124.709C229.378 128.231 229.449 131.413 232.589 133.058C235.76 134.72 238.674 133.239 241.554 131.117C245.35 128.319 245.054 124.492 245.842 119.854C246.745 114.537 243.173 111.121 245.062 106.068C247.502 99.5423 259.095 95 259.095 95C255.977 98.4951 253.053 104.126 259.095 115.777C265.137 127.427 259.68 134.417 254.028 139.466C248.376 144.515 241.944 148.204 242.529 154.612C242.997 159.738 246.362 162.832 247.986 163.738C247.986 163.738 258.9 167.621 262.018 157.913C263.61 152.959 260.842 149.014 263.773 144.709C267.195 139.681 278 138.301 278 138.301C278 138.301 272.892 142.905 272.543 146.845C271.958 153.447 275.833 157.243 273.712 163.35Z" fill="url(#go-right)"/>
        </motion.g>

        {/* Small right flame tip — faster wobble */}
        <motion.g style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' } as React.CSSProperties}
          animate={{ scaleX: [1, 1.12, 0.88, 1.09, 0.94, 1], scaleY: [1, 0.94, 1.09, 0.92, 1.05, 1] }}
          transition={{ duration: 1.25, delay: 0.55, repeat: Infinity, ease: 'easeInOut' }}>
          <path d="M278.543 93.3784C280.498 89.5885 281.812 83 281.812 83C281.812 83 286.391 89.7776 285.973 94.5315C285.811 96.3816 285.523 97.4311 284.784 99.1441C283.322 102.535 280.436 103.167 278.543 106.351C276.69 109.468 275.273 115 275.273 115C275.273 115 270.188 107.795 271.112 102.892C271.977 98.307 276.392 97.5466 278.543 93.3784Z" fill="url(#go-rtip)"/>
        </motion.g>
      </svg>

      {/* Ember sparks */}
      {FIRE_SPARKS.map(s => (
        <motion.div key={s.id}
          style={{ position: 'absolute', left: `${s.x}%`, bottom: '6%', width: s.size, height: s.size, borderRadius: '50%', background: s.col, zIndex: 8, boxShadow: `0 0 ${s.size * 2}px ${s.col}` }}
          animate={{ y: [0, -(110 + s.id * 3)], opacity: [1, 0.7, 0.3, 0], x: [0, (s.id % 2 === 0 ? 1 : -1) * ((s.id % 6) + 2)] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

function VirtualCard({ card, i, x, vIdx, onCanvasRef, onBet, activeBet, onClearBet, onExpire, isGhost, onExpireInactive, onBetPlaced, onBetWon, onBetResult, onScLock, showTracker, onToggleTracker, matchPhase, matchLabel, matchScore, totalMatchSecs, onGoToPenalty }: {
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
  onScLock?: (locked: boolean) => void;
  showTracker: boolean;
  onToggleTracker: (v: boolean) => void;
  matchPhase: 'first' | 'break' | 'second' | 'ended' | 'penalty';
  matchLabel: string;
  matchScore: { z: number; s: number };
  totalMatchSecs: number;
  onGoToPenalty?: () => void;
}) {
  const isActive = i === vIdx;

  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    setTabVisible(!document.hidden);
    const h = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, []);

  // Penalty series state (used only for (card.type as string) === 'penalty')
  const [penaltyRoundIdx, setPenaltyRoundIdx] = useState(0);
  const [penaltyScore, setPenaltyScore] = useState({ z: 0, s: 0 });
  const [penaltySeriesOver, setPenaltySeriesOver] = useState(false);
  const penaltyRoundInitRef = useRef(true);
  const [roundResultTimer, setRoundResultTimer] = useState(0);

  // Reset per-round state when penalty round advances
  useEffect(() => {
    if ((card.type as string) !== 'penalty') return;
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
  const [trackerOverlayVisible, setTrackerOverlayVisible] = useState(false);
  const [placedBets, setPlacedBets] = useState<Array<{ label: string; betLabel: string; odds: string; amount: number }>>([]);
  const placedBetRef = useRef<{ label: string; betLabel: string; odds: string; amount: number }>({ label: '', betLabel: '', odds: '', amount: 0 });
  const betPlacedRef = useRef(false);
  useEffect(() => { betPlacedRef.current = betPlaced; }, [betPlaced]);
  const betResultRef = useRef(false);
  useEffect(() => { betResultRef.current = betResult; }, [betResult]);
  const BET_LABEL_MAP: Record<string, string> = {
    'Гол или Аут': 'Будет гол или аут',
    'Фол или Угловой': 'Будет фол или угловой',
    'Гол': 'Будет гол',
    'Угловой': 'Будет угловой',
    'Фол': 'Будет фол',
    'Аут': 'Будет аут',
  };

  const pct1Num = parseInt(card.pct1 || '50', 10) || 50;
  const [momentumPct, setMomentumPct] = useState(pct1Num);
  const momentumMV = useMotionValue(pct1Num);
  const momentumRef = useRef(pct1Num);
  const ballPosX = useMotionValue(157);
  const ballPosY = useMotionValue(87.5);
  const [eventFlash, setEventFlash] = useState<string | null>(null);
  const eventFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoreRef = useRef({ z: matchScore.z, s: matchScore.s });
  const prevPhaseRef = useRef(matchPhase);
  const [goalOverlay, setGoalOverlay] = useState(false);
  const goalOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCornerIdx, setActiveCornerIdx] = useState<number | null>(null);
  const activeCornerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeGoalSide, setActiveGoalSide] = useState<'left' | 'right' | null>(null);
  const activeGoalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aoutZone, setAoutZone] = useState<'top' | 'bottom' | null>(null);
  const aoutZoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cornerKickActive, setCornerKickActive] = useState<number | null>(null);
  const [throwInActive, setThrowInActive] = useState<{ side: 'top' | 'bottom'; bx: number } | null>(null);
  const forcedCornerFiredRef = useRef(false);
  const totalMatchSecsRef = useRef(totalMatchSecs);
  useEffect(() => { totalMatchSecsRef.current = totalMatchSecs; }, [totalMatchSecs]);

  useEffect(() => {
    const prev = prevScoreRef.current;
    if (matchScore.z > prev.z || matchScore.s > prev.s) {
      setGoalOverlay(true);
      if (goalOverlayTimerRef.current) clearTimeout(goalOverlayTimerRef.current);
      goalOverlayTimerRef.current = setTimeout(() => setGoalOverlay(false), 3500);
      // If a bet is pending when goal fires → resolve based on bet label
      if (betPlaced && !betResult && (card.type as string) !== 'penalty') {
        const won = placedBetRef.current.label === 'Гол';
        setBetWon(won);
        setBetPlaced(false);
        setBetResult(true);
        if (won) onBetWon();
        else setTimeout(() => setScActive(true), 900);
        onBetResult?.(won, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
      }
      // SC bet pending → resolve: 'Гол' wins on goal, anything else loses
      if (scBetPlacedRef.current && scBetWonRef.current === null) {
        const scWon = scLabelRef.current === 'Гол';
        setScBetWon(scWon);
        if (scWon) onBetWon();
      }
    }
    prevScoreRef.current = { z: matchScore.z, s: matchScore.s };
  }, [matchScore.z, matchScore.s]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (matchPhase === 'break' && prev !== 'break') {
      if (eventFlashTimerRef.current) clearTimeout(eventFlashTimerRef.current);
      setEventFlash('🕐 Перерыв');
      eventFlashTimerRef.current = setTimeout(() => setEventFlash(null), 4000);
      // Main bet pending → lose (event didn't happen before break)
      if (betPlaced && !betResult && (card.type as string) !== 'penalty') {
        setBetWon(false);
        setBetPlaced(false);
        setBetResult(true);
        setLostToBreak(true);
        onBetResult?.(false, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
      }
      // SC bet already placed → lose (event didn't resolve it before break)
      if (scBetPlaced && scBetWon === null) {
        setScBetWon(false);
      }
      // SC open but no bet yet → leave it open, user can still bet during break
    }
    prevPhaseRef.current = matchPhase;
  }, [matchPhase]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [scAmount, setScAmount]     = useState(100);
  const [lostToPenalty, setLostToPenalty] = useState(false);
  const [lostToBreak, setLostToBreak] = useState(false);
  const scBetPlacedRef = useRef(false);
  useEffect(() => { scBetPlacedRef.current = scBetPlaced; }, [scBetPlaced]);
  const scBetWonRef = useRef<boolean | null>(null);
  useEffect(() => { scBetWonRef.current = scBetWon; }, [scBetWon]);
  const scLabelRef = useRef<string | null>(null);
  useEffect(() => { scLabelRef.current = scLabel; }, [scLabel]);

  // Round result countdown (penalty only — shows time pressure on the "next kick" button)
  useEffect(() => {
    if (!betResult || penaltySeriesOver || (card.type as string) !== 'penalty') { setRoundResultTimer(0); return; }
    setRoundResultTimer(card.timer);
  }, [betResult, penaltySeriesOver]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (roundResultTimer <= 0) return;
    const id = setTimeout(() => setRoundResultTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [roundResultTimer]);

  // Penalty: auto-resolve bet based on actual round outcome
  useEffect(() => {
    if (!betPlaced || (card.type as string) !== 'penalty') return;
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
    if (matchPhase !== 'penalty' || (card.type as string) === 'penalty') return;
    if (betPlacedRef.current && !betResultRef.current) {
      setBetWon(false);
      setBetPlaced(false);
      setBetResult(true);
      setLostToPenalty(true);
      onBetResult?.(false, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
    }
  }, [matchPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent when SC panel is open so it can block swipe
  useEffect(() => { onScLock?.(!isGhost && scActive && !scBetPlaced); }, [scActive, scBetPlaced, isGhost]); // eslint-disable-line react-hooks/exhaustive-deps

  // result state stays until user taps "Поставить ещё"

  useEffect(() => {
    if (!scActive || scBetPlaced || scBetWon !== null || !tabVisible || matchPhase === 'break') return;
    if (scTimeLeft <= 0) { return; }
    const t = setTimeout(() => setScTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [scActive, scTimeLeft, scBetPlaced, scBetWon, tabVisible, matchPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (betResult && !isActive && !isGhost && card.type !== 'line' && (card.type as string) !== 'lineevent' && (card.type as string) !== 'penalty' && (card.type as string) !== 'window') onExpireInactive(i);
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
    if ((card.type as string) === 'penalty') {
      // Auto-reveal round result when time runs out
      const t = setTimeout(() => setBetResult(true), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIsExiting(true), 2000);
    return () => clearTimeout(t);
  }, [isExpired, isActive, betPlaced, betResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isExpired || isActive || isGhost || (card.type as string) === 'penalty') return;
    onExpireInactive(i);
  }, [isExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!betResult) { setTrackerOverlayVisible(false); return; }
    setTrackerOverlayVisible(true);
    const t = setTimeout(() => setTrackerOverlayVisible(false), 3000);
    return () => clearTimeout(t);
  }, [betResult]);

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
    if (!showTracker || (card.type as string) === 'penalty' || matchPhase === 'break') return;
    let alive = true;
    let tid: ReturnType<typeof setTimeout>;
    const CORNERS = [{ x: 18, y: 18 }, { x: 296, y: 18 }, { x: 18, y: 157 }, { x: 296, y: 157 }];

    const flash = (text: string) => {
      if (eventFlashTimerRef.current) clearTimeout(eventFlashTimerRef.current);
      setEventFlash(text);
      eventFlashTimerRef.current = setTimeout(() => setEventFlash(null), 2000);
    };

    // Resolves SC bet based on what event happened: 'goal' wins if scLabel==='Гол', 'other' wins if scLabel!=='Гол'
    const resolveScBet = (eventType: 'goal' | 'other') => {
      if (!scBetPlacedRef.current || scBetWonRef.current !== null) return;
      const won = eventType === 'goal' ? scLabelRef.current === 'Гол' : scLabelRef.current !== 'Гол';
      setScBetWon(won);
      if (won) onBetWon();
    };

    const move = () => {
      if (!alive) return;
      const mom = momentumRef.current;
      const isCornerMkt = card.question.includes('угловой');
      const isPossessionMkt = (card.type as string) === 'team';
      let tx: number, ty: number;

      // Pre-goal: bias ball toward goal zone ~17 real seconds before scoring
      const tms = totalMatchSecsRef.current;
      const PRE = 900; // 900 match-sec = ~17 real sec at SPEED=53
      const isPreGoal1 = tms >= 35 * 60 - PRE && tms < 35 * 60;
      const isPreGoal2 = tms >= 80 * 60 - PRE && tms < 80 * 60;
      // Forced corner at 55 min (bottom-right, idx 3) — between both goals
      const FORCED_CORNER_TIME = 55 * 60; // 3300 match-sec
      const FORCED_CORNER_IDX = 3; // bottom-right corner
      const isPreCorner = !forcedCornerFiredRef.current && tms >= FORCED_CORNER_TIME - 300 && tms < FORCED_CORNER_TIME;
      if (isPreGoal1) {
        tx = 258 + Math.random() * 36; // right goal area (Зенит scores)
        ty = 60 + Math.random() * 55;
      } else if (isPreGoal2) {
        tx = 18 + Math.random() * 36;  // left goal area (Спартак scores)
        ty = 60 + Math.random() * 55;
      } else if (isPreCorner) {
        const cp = CORNERS[FORCED_CORNER_IDX];
        tx = cp.x + (Math.random() - 0.5) * 10;
        ty = cp.y + (Math.random() - 0.5) * 10;
      } else if (isCornerMkt) {
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
      } else if (card.type === 'line' || (card.type as string) === 'lineevent') {
        tx = 20 + Math.random() * 274;
        ty = 14 + Math.random() * 147;
        const lineFlashes = ['⚽ Атака', '↗ Прострел', '→ Зенит давит', '← Спартак давит'];
        if (Math.random() < 0.35) flash(lineFlashes[Math.floor(Math.random() * lineFlashes.length)]);
      } else {
        tx = 95 + Math.random() * 124;
        ty = 38 + Math.random() * 99;
      }

      tx = Math.max(14, Math.min(300, tx));
      ty = Math.max(14, Math.min(161, ty));

      // Limit step size — ball can't jump more than 65px per move
      const curX = ballPosX.get();
      const curY = ballPosY.get();
      const dx = tx - curX;
      const dy = ty - curY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const MAX_STEP = 65;
      if (dist > MAX_STEP) {
        const scale = MAX_STEP / dist;
        tx = curX + dx * scale;
        ty = curY + dy * scale;
      }

      // Zone detection
      const nearCi = CORNERS.findIndex(c => Math.abs(tx - c.x) < 32 && Math.abs(ty - c.y) < 32);
      const isAout = ty < 26 || ty > 149;
      const isGoalL = tx < 62 && ty > 51 && ty < 124;
      const isGoalR = tx > 252 && ty > 51 && ty < 124;

      // Forced corner at 55 min — fires as soon as tms reaches the target
      if (!forcedCornerFiredRef.current && tms >= FORCED_CORNER_TIME && tms < FORCED_CORNER_TIME + 600) {
        forcedCornerFiredRef.current = true;
        const cp = CORNERS[FORCED_CORNER_IDX];
        animate(ballPosX, cp.x, { duration: 1.1, ease: 'easeOut' });
        animate(ballPosY, cp.y, { duration: 1.1, ease: 'easeOut' });
        setCornerKickActive(FORCED_CORNER_IDX);
        setActiveCornerIdx(FORCED_CORNER_IDX);
        setAoutZone('bottom');
        flash('🚩 Угловой!');
        if (betPlacedRef.current && !betResultRef.current && (card.type as string) !== 'penalty') {
          const won = placedBetRef.current.label === 'Угловой';
          setBetWon(won); setBetPlaced(false); setBetResult(true);
          if (won) onBetWon(); else setTimeout(() => setScActive(true), 900);
          onBetResult?.(won, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
        }
        resolveScBet('other');
        tid = setTimeout(() => {
          if (!alive) return;
          setCornerKickActive(null);
          setActiveCornerIdx(null);
          setAoutZone(null);
          const fcIsLeft = (FORCED_CORNER_IDX as number) === 0 || (FORCED_CORNER_IDX as number) === 2;
          const kickX = fcIsLeft ? (34 + Math.random() * 52) : (228 + Math.random() * 52);
          const kickY = 58 + Math.random() * 59;
          animate(ballPosX, kickX, { duration: 0.9, ease: 'easeOut' });
          animate(ballPosY, kickY, { duration: 0.9, ease: 'easeOut' });
          tid = setTimeout(move, 1100);
        }, 2600);
        return;
      }

      const willCornerKick = isAout && nearCi >= 0 && Math.random() < 0.70;
      const willThrowIn = isAout && nearCi < 0 && !isGoalL && !isGoalR && Math.random() < 0.60;

      if (nearCi >= 0) {
        if (activeCornerTimerRef.current) clearTimeout(activeCornerTimerRef.current);
        setActiveCornerIdx(nearCi);
        activeCornerTimerRef.current = setTimeout(() => setActiveCornerIdx(null), 2000);
      }
      if (isAout) {
        const side = ty < 26 ? 'top' : 'bottom';
        if (aoutZoneTimerRef.current) clearTimeout(aoutZoneTimerRef.current);
        setAoutZone(side);
        aoutZoneTimerRef.current = setTimeout(() => setAoutZone(null), 2000);
      }
      if (isGoalL || isGoalR) {
        if (activeGoalTimerRef.current) clearTimeout(activeGoalTimerRef.current);
        setActiveGoalSide(isGoalL ? 'left' : 'right');
        activeGoalTimerRef.current = setTimeout(() => setActiveGoalSide(null), 2000);
      }

      if (willCornerKick) {
        const cp = CORNERS[nearCi];
        animate(ballPosX, cp.x, { duration: 0.5, ease: 'easeOut' });
        animate(ballPosY, cp.y, { duration: 0.5, ease: 'easeOut' });
        setCornerKickActive(nearCi);
        flash('🚩 Угловой!');
        if (betPlacedRef.current && !betResultRef.current && (card.type as string) !== 'penalty') {
          const won = placedBetRef.current.label === 'Угловой';
          setBetWon(won); setBetPlaced(false); setBetResult(true);
          if (won) onBetWon(); else setTimeout(() => setScActive(true), 900);
          onBetResult?.(won, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
        }
        resolveScBet('other');
        tid = setTimeout(() => {
          if (!alive) return;
          setCornerKickActive(null);
          const isLeft = nearCi === 0 || nearCi === 2;
          const kickX = isLeft ? (34 + Math.random() * 52) : (228 + Math.random() * 52);
          const kickY = 58 + Math.random() * 59;
          animate(ballPosX, kickX, { duration: 0.9, ease: 'easeOut' });
          animate(ballPosY, kickY, { duration: 0.9, ease: 'easeOut' });
          tid = setTimeout(move, 1100);
        }, 2600);
      } else if (willThrowIn) {
        const side = ty < 26 ? 'top' : 'bottom';
        const sideY = side === 'top' ? 10 : 165;
        const curBX = ballPosX.get();
        animate(ballPosX, curBX, { duration: 0.1 });
        animate(ballPosY, sideY, { duration: 0.35, ease: 'easeOut' });
        setThrowInActive({ side, bx: curBX });
        flash('↔ Аут!');
        if (betPlacedRef.current && !betResultRef.current && (card.type as string) !== 'penalty') {
          const won = placedBetRef.current.label === 'Аут';
          setBetWon(won); setBetPlaced(false); setBetResult(true);
          if (won) onBetWon(); else setTimeout(() => setScActive(true), 900);
          onBetResult?.(won, placedBetRef.current.label, placedBetRef.current.odds, placedBetRef.current.amount, card.question.replace('\n', ' '));
        }
        resolveScBet('other');
        tid = setTimeout(() => {
          if (!alive) return;
          setThrowInActive(null);
          const throwY = side === 'top' ? (38 + Math.random() * 55) : (82 + Math.random() * 55);
          animate(ballPosX, curBX + (Math.random() - 0.5) * 50, { duration: 0.65, ease: 'easeOut' });
          animate(ballPosY, throwY, { duration: 0.65, ease: 'easeOut' });
          tid = setTimeout(move, 850);
        }, 2200);
      } else {
        if (isGoalL || isGoalR) {
          flash('⚽ Мяч у ворот!');
        } else if (nearCi >= 0 && isAout) {
          flash('↗ Риск аута/углового');
        } else if (nearCi >= 0) {
          flash('↗ Риск углового');
        } else if (isAout) {
          flash('↔ Риск аута');
        }
        const isPreGoal = isPreGoal1 || isPreGoal2;
        const dur = isPreGoal ? (2.4 + Math.random() * 1.6) : (1.6 + Math.random() * 1.2);
        animate(ballPosX, tx, { duration: dur, ease: [0.25, 0.1, 0.25, 1] });
        animate(ballPosY, ty, { duration: dur, ease: [0.25, 0.1, 0.25, 1] });
        tid = setTimeout(move, (dur + 0.05 + Math.random() * (isPreGoal ? 1.2 : 0.3)) * 1000);
      }
    };
    move();
    return () => {
      alive = false;
      clearTimeout(tid);
      if (eventFlashTimerRef.current) clearTimeout(eventFlashTimerRef.current);
    };
  }, [showTracker, matchPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = timeLeft / card.timer;
  const [r, g, b] = glowColorAt(pct);
  const timerColor = (card.type as string) === 'penalty' ? timerColorAt(0) : timerColorAt(pct);
  const pulseDuration = pulseDurationAt(pct);

  const progress = useTransform(x, (xVal: number) => {
    const dist = Math.abs(xVal + i * STEP - 23);
    return Math.max(0, 1 - dist / STEP);
  });
  const cardScale   = useTransform(progress, (t: number) => 0.88 + 0.12 * t);
  const cardOpacity = useTransform(progress, (t: number) => 0.72 + 0.28 * t);
  const cardFilter  = useTransform(progress, (t: number) => `grayscale(${(1 - t).toFixed(2)})`);

  const origin = i < vIdx ? 'right center' : 'left center';

  const initColor: [number, number, number] = [59, 130, 246];
  const [initR, initG, initB] = initColor;
  const rMV = useMotionValue(initR);
  const gMV = useMotionValue(initG);
  const bMV = useMotionValue(initB);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { /* static accent colors — no animation */ }, []);

  const pulseDurationRef = useRef(pulseDuration);
  pulseDurationRef.current = pulseDuration;

  const eventActive = goalOverlay || !!(eventFlash && eventFlash.includes('⚡'));
  const zoneRisk = (activeCornerIdx !== null || aoutZone !== null) && activeGoalSide === null && !eventActive;
  useEffect(() => {
    if (eventActive) {
      animate(rMV, 255, { duration: 0.25 });
      animate(gMV, 90, { duration: 0.25 });
      animate(bMV, 0, { duration: 0.25 });
    } else if (activeGoalSide !== null) {
      animate(rMV, 255, { duration: 0.15 });
      animate(gMV, 30, { duration: 0.15 });
      animate(bMV, 30, { duration: 0.15 });
    } else if (zoneRisk) {
      animate(rMV, 255, { duration: 0.15 });
      animate(gMV, 195, { duration: 0.15 });
      animate(bMV, 0, { duration: 0.15 });
    } else {
      animate(rMV, initR, { duration: 0.9 });
      animate(gMV, initG, { duration: 0.9 });
      animate(bMV, initB, { duration: 0.9 });
    }
  }, [eventActive, activeGoalSide, zoneRisk]); // eslint-disable-line react-hooks/exhaustive-deps

  const intensityMV = useMotionValue(0.35);
  const stepCtrlRef = useRef<{ stop: () => void } | null>(null);
  const pulseAlive  = useRef(false);
  useEffect(() => {
    pulseAlive.current = true;
    stepCtrlRef.current?.stop();

    // Both permanent markets: slow calm pulse
    const step = (toMax: boolean) => {
      if (!pulseAlive.current) return;
      const ctrl = animate(intensityMV, toMax ? 0.68 : 0.28, { duration: 1.23, ease: 'easeInOut' });
      stepCtrlRef.current = ctrl;
      ctrl.then(() => step(!toMax));
    };
    step(true);

    return () => { pulseAlive.current = false; stepCtrlRef.current?.stop(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fast red flash when ball is in goal zone
  const goalGlowOpacity = useMotionValue(0);
  const goalGlowAlive = useRef(false);
  useEffect(() => {
    if (activeGoalSide !== null && !goalOverlay) {
      goalGlowAlive.current = true;
      const pulse = (toMax: boolean) => {
        if (!goalGlowAlive.current) return;
        animate(goalGlowOpacity, toMax ? 0.80 : 0.15, { duration: 0.27, ease: 'easeInOut' })
          .then(() => pulse(!toMax));
      };
      pulse(true);
    } else {
      goalGlowAlive.current = false;
      animate(goalGlowOpacity, 0, { duration: 0.35 });
    }
  }, [activeGoalSide, goalOverlay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yellow pulse when corner/aout risk
  const riskGlowOpacity = useMotionValue(0);
  const riskGlowAlive = useRef(false);
  useEffect(() => {
    if (zoneRisk) {
      riskGlowAlive.current = true;
      const pulse = (toMax: boolean) => {
        if (!riskGlowAlive.current) return;
        animate(riskGlowOpacity, toMax ? 0.72 : 0.12, { duration: 0.35, ease: 'easeInOut' })
          .then(() => pulse(!toMax));
      };
      pulse(true);
    } else {
      riskGlowAlive.current = false;
      animate(riskGlowOpacity, 0, { duration: 0.35 });
    }
  }, [zoneRisk]); // eslint-disable-line react-hooks/exhaustive-deps

  const glowBoxShadow = useTransform(
    [rMV, gMV, bMV, intensityMV, goalGlowOpacity, riskGlowOpacity] as MotionValue<number>[],
    ([rv, gv, bv, iv, ggv, rgv]: number[]) => {
      const base = `inset 0px 0px 18px 1px rgba(255,255,255,${iv.toFixed(2)}), inset 0px 1px 34px 3px rgba(${Math.round(rv)},${Math.round(gv)},${Math.round(bv)},${iv.toFixed(2)})`;
      const goal = ggv > 0.01 ? `, inset 0px 0px 55px 12px rgba(255,30,30,${ggv.toFixed(2)}), 0px 0px 30px 6px rgba(255,30,30,${(ggv * 0.55).toFixed(2)})` : '';
      const risk = rgv > 0.01 ? `, inset 0px 0px 48px 10px rgba(255,195,0,${rgv.toFixed(2)}), 0px 0px 25px 5px rgba(255,195,0,${(rgv * 0.5).toFixed(2)})` : '';
      return base + goal + risk;
    }
  );

  const penaltyIntensityMV = useMotionValue(0.35);
  const penaltyPulseAlive  = useRef(false);
  useEffect(() => {
    penaltyPulseAlive.current = true;
    const step = (toMax: boolean) => {
      if (!penaltyPulseAlive.current) return;
      const ctrl = animate(penaltyIntensityMV, toMax ? 0.68 : 0.28, { duration: 0.77, ease: 'easeInOut' });
      ctrl.then(() => step(!toMax));
    };
    step(true);
    return () => { penaltyPulseAlive.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const penaltyGlowBoxShadow = useTransform(
    penaltyIntensityMV,
    (iv: number) => {
      const t = Math.max(0, Math.min(1, (iv - 0.28) / 0.4));
      const wo = (0.25 + t * 0.25).toFixed(2);
      const oo = (0.4 + t * 0.4).toFixed(2);
      return `inset 0px 0px 40px 1px rgba(255,255,255,${wo}), inset 0px 0px 40px 8px rgba(111,44,0,${oo})`;
    }
  );

  const chipEllipseColor = useTransform(
    [rMV, gMV, bMV] as MotionValue<number>[],
    ([rv, gv, bv]: number[]) => `rgba(${Math.round(rv)},${Math.round(gv)},${Math.round(bv)},0.5)`
  );

  const sheetOpen = !!(isActive && activeBet && !betResult);

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

  const BetSheetContent = () => {
    const formH = activeBet && !betResult ? (keyboardOpen ? 356 : 188) : 0;
    return (
    <motion.div
      initial={false}
      animate={{ height: sheetOpen ? formH : 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
      style={{ overflow: 'hidden', pointerEvents: 'auto', background: '#171C1F', borderRadius: '0 0 24px 24px' }}
      data-nodrag="true"
    >
      {activeBet && !betResult && <><div ref={chipsRef} style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', background: '#171C1F', padding: '12px 8px 4px', overflowX: 'auto', scrollbarWidth: 'none', cursor: 'grab', userSelect: 'none', touchAction: 'none' } as React.CSSProperties}
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
        <div onClick={() => {
          if (betAmount > 0 && activeBet) {
            const newBet = { label: activeBet.label, betLabel: BET_LABEL_MAP[activeBet.label] || activeBet.label, odds: activeBet.odds, amount: betAmount };
            placedBetRef.current = newBet;
            setPlacedBets(prev => [...prev, newBet]);
            if (!betPlaced) { setBetPlaced(true); onBetPlaced(); }
            setBetAmount(0); setChipIdx(null); setKeyboardOpen(false);
            onClearBet();
          }
        }} style={{ height: 56, background: betAmount > 0 ? '#00a344' : 'rgba(0,163,68,0.3)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: betAmount > 0 ? 'pointer' : 'default', transition: 'background 0.2s' }}>
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
      </div></>}
    </motion.div>
    );
  };

  const handleNextMarket = () => {
    setPlacedBets([]);
    setBetPlaced(false); setBetResult(false); setBetWon(true);
    setScActive(false); setScTimeLeft(10); setScLabel(null); setScBetPlaced(false); setScBetWon(null); setScAmount(100); setLostToPenalty(false); setLostToBreak(false);
  };

  const BetResultArea = () => {
    const isLoss = betResult && !betWon;

    if (isLoss) return (
      <>
        {scBetWon ? (
          /* ── 2nd chance WIN state ── */
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>
                2-й шанс зашёл!
              </motion.p>
              <div style={{ position: 'relative', width: 80, height: 80, marginTop: 16, flexShrink: 0 }}>
                <motion.div style={{ position: 'absolute', top: -4, left: 0 }} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}>
                  <CheckCircleSVG size={80} />
                </motion.div>
              </div>
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }} style={{ fontSize: 12, fontWeight: 400, color: 'rgba(238,239,243,0.7)', textAlign: 'center', margin: 0 }}>
                +{Math.round(scAmount * parseFloat(scLabel === card.label1 ? (card.odds1 || '1') : (card.odds2 || '1'))).toLocaleString('ru-RU')}₽ к твоему банку
              </motion.p>
            </div>
            <div style={{ paddingTop: 16, width: '100%' }}>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }} onClick={handleNextMarket} onPointerDown={e => e.stopPropagation()} style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Следующий маркет</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.div>
            </div>
          </>
        ) : lostToBreak ? (
          /* ── Lost to break — no SC panel ── */
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>Ставка не зашла</motion.p>
              <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }} style={{ marginTop: 6 }}><LossCircleSVG size={68} /></motion.div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ fontSize: 12, color: '#555F71', margin: 0, textAlign: 'center' }}>Перерыв — событие не успело произойти</motion.p>
            </div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }} onClick={handleNextMarket} onPointerDown={e => e.stopPropagation()} style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Поставить ещё раз</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.div>
          </>
        ) : lostToPenalty ? (
          /* ── Lost to penalty fullscreen ── */
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 0 }}>
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' }}>
                Ставка не зашла
              </motion.p>
              <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }} style={{ marginTop: 6 }}>
                <LossCircleSVG size={68} />
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: '#555F71', margin: 0, textAlign: 'center' }}>Основное время закончилось</p>
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                onClick={() => { onGoToPenalty?.(); }}
                onPointerDown={e => e.stopPropagation()}
                style={{ width: '100%', height: 60, border: '1px solid #FF5F00', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 0 8px', cursor: 'pointer', background: 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SoccerBallSVG w={38} h={38} color="#FF5F00" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Назначена серия пенальти</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            </motion.div>
          </>
        ) : (
          /* ── Loss + second chance state ── */
          <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Icon + title */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <AnimatePresence>
                {betPlaced && <motion.div key="ball" exit={{ scale: 0, opacity: 0, transition: { duration: 0.25 } }}><SoccerBallSVG size={20} /></motion.div>}
                {betResult && <motion.div key="x" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}><LossCircleSVG size={32} /></motion.div>}
              </AnimatePresence>
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 12, fontWeight: 500, color: '#D9DDE5', margin: 0 }}>
                Ставка не зашла
              </motion.p>
            </div>

            {/* Second chance panel */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              style={{ width: '100%', borderRadius: 28, border: '1px solid rgba(255,255,255,0.1)', padding: 8, background: 'transparent' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', paddingTop: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: '18px', textAlign: 'center', whiteSpace: 'pre-line' }}>{card.question2nd || 'Что произойдет следующим?'}</p>
                </div>
                {!scActive && !scBetPlaced && (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Готовим шанс отыграться...</span>
                )}
                {scActive && !scBetPlaced && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onPointerDown={e => e.stopPropagation()}>
                    <div style={{ height: 60, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid #FF5F00', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <div onClick={() => setScAmount(a => Math.max(50, a - 50))} style={{ width: 48, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="15 21 18 18" fill="none"><path d="M18.3448 24.3431C15.2257 27.462 15.2256 32.5377 18.3445 35.6568C21.4635 38.7759 26.5384 38.7753 29.6576 35.6563C32.7767 32.5374 32.7775 27.4625 29.6585 24.3433C26.5395 21.2242 21.4639 21.2241 18.3448 24.3431ZM28.0016 29.2004L28.0016 30.7999L24.8012 30.7998L23.2017 30.7997L20.0007 30.8005L20.0007 29.2009L23.2018 29.2003L24.8014 29.2004L28.0016 29.2004Z" fill="#555F71"/></svg>
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#EEF0F5' }}>{scAmount.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      <div onClick={() => setScAmount(a => a + 50)} style={{ width: 48, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="241 21 18 18" fill="none"><path d="M244.344 24.3431C241.225 27.462 241.225 32.5377 244.344 35.6568C247.463 38.7759 252.537 38.7753 255.657 35.6563C258.776 32.5374 258.777 27.4625 255.658 24.3433C252.539 21.2242 247.463 21.2241 244.344 24.3431ZM254.001 29.2004L254.001 30.7999L250.8 30.7998L250.8 34.0002L249.201 34.0001L249.201 30.7998L246 30.8005L246 29.2009L249.201 29.2003L249.201 25.9999L250.8 26L250.8 29.2003L254.001 29.2004Z" fill="#FF5F00"/></svg>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                      {[{ l: card.label1 || 'Да', o: card.odds1 }, { l: card.label2 || 'Нет', o: card.odds2 }].map((btn, idx) => (
                        <div key={btn.l} onClick={() => { setScLabel(btn.l); setScBetPlaced(true); setScActive(false); }}
                          style={{ flex: 1, height: 80, background: idx === 0 ? 'linear-gradient(135deg, rgba(255,149,87,1) 0%, rgba(170,63,0,1) 100%)' : 'linear-gradient(135deg, rgba(179,87,255,1) 0%, rgba(93,0,170,1) 100%)', border: 'none', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 12px', gap: 4, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                          <span style={{ fontSize: 24, fontWeight: 700, color: '#fff', position: 'relative', textAlign: 'center' }}>{btn.l}</span>
                          <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)', position: 'relative' }}>{btn.o}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {scBetPlaced && scBetWon === null && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <motion.div
                        animate={{ y: [0, -28, 0], rotate: [0, 160, 0], scale: [1, 1.08, 0.92, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <SoccerBallSVG size={48} />
                      </motion.div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Ожидаем результат...</p>
                    </div>
                    <div style={{ width: '100%', borderRadius: 20, height: 52, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{scLabel}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{scLabel === card.label1 ? card.odds1 : card.odds2}</span>
                    </div>
                  </div>
                )}
                {scBetPlaced && scBetWon === false && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 }}>
                    <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}>
                      <LossCircleSVG size={48} />
                    </motion.div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>2-й шанс не зашёл</p>
                    <div style={{ width: '100%', borderRadius: 20, height: 52, border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{scLabel}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>{scLabel === card.label1 ? card.odds1 : card.odds2}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
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
          {betResult && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.3 }} onClick={handleNextMarket} onPointerDown={e => e.stopPropagation()} style={{ marginTop: 8, height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer', pointerEvents: 'auto' }}><span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{(card.type === 'line' || (card.type as string) === 'lineevent') ? 'Поставить ещё раз' : 'Следующий маркет'}</span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></motion.div>}
        </div>
      </>
    );
  };

  const TeamHeader = () => (
    <div style={{ height: 50, borderRadius: '32px 32px 0 0', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 4, position: 'relative', zIndex: 11 }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.logo1} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 400, color: '#eeeff3', textAlign: 'left' }}>Зенит</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
        <span style={{ fontSize: 24, fontWeight: 500, color: '#ffffff', lineHeight: 1 }}>{matchScore.z}:{matchScore.s}</span>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#eeeff3', whiteSpace: 'nowrap', marginTop: 2 }}>{matchLabel}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 400, color: '#eeeff3', lineHeight: '12px', textAlign: 'right' }}>Спартак</span>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.logo2} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>
    </div>
  );

  const MediaSlot = ({ collapse }: { collapse?: boolean }) => {
    const trackerState = betResult ? (betWon ? 'win' : 'loss') : betPlaced ? 'live' : 'setup';
    const isCornerMkt = card.question.includes('угловой');
    const isPossessionMkt = (card.type as string) === 'team';
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
        <svg width="100%" height="100%" viewBox="0 0 314 175" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', position: 'absolute', inset: 0 }}>
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

          {/* Aout zone highlight — full sideline strip, red */}
          {aoutZone !== null && (
            <motion.rect
              x={8} y={aoutZone === 'top' ? 8 : 149} width={298} height={18}
              animate={{ opacity: [0.3, 0.65, 0.3] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              fill="rgba(255,40,40,0.4)" stroke="rgba(255,60,60,0.8)" strokeWidth="1"
            />
          )}

          {/* Corner zone highlight — red glow around corner */}
          {activeCornerIdx !== null && (() => {
            const cpts = [{ x: 8, y: 8 }, { x: 306, y: 8 }, { x: 8, y: 167 }, { x: 306, y: 167 }];
            const cp = cpts[activeCornerIdx];
            return (
              <g>
                <motion.circle cx={cp.x} cy={cp.y} r={40}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 0.65, repeat: Infinity }}
                  fill="rgba(255,40,40,0.3)"
                />
                <motion.circle cx={cp.x} cy={cp.y} r={22}
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 0.65, repeat: Infinity }}
                  fill="rgba(255,40,40,0.2)" stroke="rgba(255,60,60,0.9)" strokeWidth="1.5"
                />
                <text x={cp.x} y={cp.y + 0.5} textAnchor="middle" dominantBaseline="middle"
                  fill="#fff" fontSize="10" fontWeight="900" style={{ pointerEvents: 'none' }}>!</text>
              </g>
            );
          })()}

          {/* Goal zone — full penalty box highlight, red */}
          {activeGoalSide !== null && (
            <motion.rect
              x={activeGoalSide === 'left' ? 8 : 252} y={51} width={54} height={73}
              animate={{ opacity: [0.3, 0.65, 0.3] }}
              transition={{ duration: 0.55, repeat: Infinity }}
              fill="rgba(255,40,40,0.38)" stroke="rgba(255,60,60,0.9)" strokeWidth="1.5"
            />
          )}

          {/* Corner kick player + arrow */}
          {cornerKickActive !== null && (() => {
            const CPTS = [{ x: 18, y: 18 }, { x: 296, y: 18 }, { x: 18, y: 157 }, { x: 296, y: 157 }];
            const cp = CPTS[cornerKickActive];
            const isLeft = cornerKickActive === 0 || cornerKickActive === 2;
            const isTop = cornerKickActive === 0 || cornerKickActive === 1;
            const px = isLeft ? cp.x + 20 : cp.x - 20;
            const py = isTop ? cp.y + 30 : cp.y - 30;
            const aTX = isLeft ? 64 : 250;
            const aTY = 87;
            const qcx = (cp.x + aTX) / 2;
            const qcy = isTop ? cp.y + 50 : cp.y - 50;
            const aDx = aTX - qcx;
            const aDy = aTY - qcy;
            const aAngle = Math.atan2(aDy, aDx) * 180 / Math.PI;
            return (
              <g>
                <circle cx={px} cy={py - 12} r="4" fill="rgba(255,255,255,0.95)" />
                <line x1={px} y1={py - 8} x2={px} y2={py + 2} stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1={px - 7} y1={py - 5} x2={px + 7} y2={py - 5} stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1={px} y1={py + 2} x2={px - 5} y2={py + 12} stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1={px} y1={py + 2} x2={px + 5} y2={py + 12} stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d={`M${cp.x},${cp.y} Q${qcx},${qcy} ${aTX},${aTY}`}
                  fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" strokeDasharray="5,4" />
                <g transform={`translate(${aTX},${aTY}) rotate(${aAngle})`}>
                  <line x1={0} y1={0} x2={-7} y2={-4} stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1={0} y1={0} x2={-7} y2={4} stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round" />
                </g>
              </g>
            );
          })()}

          {/* Throw-in arrow */}
          {throwInActive !== null && (() => {
            const { side, bx } = throwInActive;
            const isTop = side === 'top';
            const startY = isTop ? 12 : 163;
            const endY = isTop ? 55 : 120;
            const aAngle = isTop ? 90 : -90;
            return (
              <g>
                <line x1={bx} y1={startY} x2={bx} y2={endY - (isTop ? 6 : -6)}
                  stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" strokeDasharray="5,4" strokeLinecap="round" />
                <g transform={`translate(${bx},${endY}) rotate(${aAngle})`}>
                  <line x1={0} y1={0} x2={-7} y2={-4} stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1={0} y1={0} x2={-7} y2={4} stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" />
                </g>
              </g>
            );
          })()}

          {/* Fixed defenders in their halves */}
          <circle cx="52" cy="64" r="3.5" fill="rgba(80,220,140,0.55)" />
          <circle cx="52" cy="111" r="3.5" fill="rgba(80,220,140,0.55)" />
          <circle cx="262" cy="64" r="3.5" fill="rgba(220,80,80,0.55)" />
          <circle cx="262" cy="111" r="3.5" fill="rgba(220,80,80,0.55)" />

          {/* Team 1 — 1 player near ball */}
          <motion.g style={{ x: ballPosX, y: ballPosY }}>
            <circle cx="-20" cy="-8" r="4.2" fill="rgba(80,220,140,0.9)" />
          </motion.g>

          {/* Team 2 — 1 player contesting */}
          <motion.g style={{ x: ballPosX, y: ballPosY }}>
            <circle cx="22" cy="8" r="4.2" fill="rgba(220,80,80,0.9)" />
          </motion.g>

          {/* Direction arrow from center toward ball */}
          <line x1="157" y1="87.5" x2="0" y2="0" stroke="none" />

          {/* Ball (hidden during break) */}
          {matchPhase !== 'break' && (
            <>
              <motion.circle cx={0} cy={0} r={22} fill={momentumPct >= 50 ? 'rgba(80,220,140,0.14)' : 'rgba(220,80,80,0.14)'} style={{ x: ballPosX, y: ballPosY }} />
              <motion.ellipse cx={0} cy={0} rx={5} ry={2.5} fill="rgba(0,0,0,0.22)" style={{ x: ballPosX, y: ballShadowY }} />
              <motion.g style={{ x: ballPosX, y: ballPosY }}>
                <text x={0} y={4.5} textAnchor="middle" fontSize="12" style={{ userSelect: 'none', pointerEvents: 'none' } as React.CSSProperties}>⚽</text>
              </motion.g>
            </>
          )}

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

        {/* Goal fullscreen overlay */}
        <AnimatePresence>
          {goalOverlay && (
            <motion.div
              key="goal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              transition={{ duration: 0.15 }}
              style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 32 }}
            >
              <GoalFireOverlay />
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.05 }}
                style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
              >
                <motion.span
                  animate={{ textShadow: ['0 0 24px rgba(255,150,0,0.9)', '0 0 48px rgba(255,200,0,1)', '0 0 24px rgba(255,150,0,0.9)'] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}
                >
                  Гооооол!!!
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(80,220,140,1)' }}>{matchScore.z}</span>
                  <span style={{ fontSize: 20, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>:</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(220,80,80,1)' }}>{matchScore.s}</span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event flash — центр поля */}
        <AnimatePresence>
          {eventFlash && !goalOverlay && (
            <motion.div key={eventFlash + timeLeft} initial={{ opacity: 0, scale: 0.88, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: -4 }} transition={{ duration: 0.22 }}
              style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 25, pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderRadius: 10, padding: '5px 13px', border: '1px solid rgba(255,255,255,0.14)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{eventFlash}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Bet badge — live or win */}
        <AnimatePresence>
          {(trackerState === 'live' || trackerState === 'win') && (
            <motion.div key={trackerState} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}
              style={{ position: 'absolute', top: 10, left: 14, zIndex: 20, background: trackerState === 'win' ? 'rgba(0,110,48,0.75)' : 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 5 }}>
              {trackerState === 'live' ? (
                <>
                  <motion.div animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 0.9, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: 3, background: '#ff3333', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{placedBetRef.current.label}</span>
                </>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#91FABA' }}>
                  {'Выигрыш +' + Math.round(placedBetRef.current.amount * parseFloat(placedBetRef.current.odds)).toLocaleString('ru-RU') + '₽'}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>


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

        {/* Market label (corner only) */}
        {trackerState === 'setup' && isCornerMkt && (
          <div style={{ position: 'absolute', bottom: 10, right: 54, zIndex: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 8, padding: '4px 9px' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>угловой · {momentumPct}%</span>
          </div>
        )}

        {/* Break overlay — static plaque, ball hidden */}
        <AnimatePresence>
          {matchPhase === 'break' && (
            <motion.div key="break-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              style={{ position: 'absolute', inset: 0, zIndex: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderRadius: 32 }}>
              <div style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500, letterSpacing: 0.5 }}>⏸</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Перерыв</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>2-й тайм скоро</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

  if (card.type === 'window') {
    const windowEvents = [
      { label: 'Гол или Аут',     odds: '1.69', hint: '5 атак на ворота за тайм' },
      { label: 'Фол или Угловой', odds: '1.98', hint: 'давление Зенита растёт'   },
    ];
    const betWasPlaced = !!placedBetRef.current.label;
    return (
      <motion.div
        initial={false}
        animate={activeBet
          ? { width: isActive ? 328 : CARD_W, opacity: isActive ? 1 : 0, background: isActive ? '#171C1F' : 'rgba(0,0,0,0)', borderRadius: isActive ? '32px 32px 24px 24px' : 32 }
          : { width: CARD_W, opacity: 1, background: 'rgba(0,0,0,0)', borderRadius: 32 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ flexShrink: 0, overflow: 'hidden' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#171C1F', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            {TeamHeader()}
            {MediaSlot({})}
            <div style={{ height: lostToPenalty ? 246 : undefined, minHeight: (activeBet || betResult) ? 0 : 246, overflow: lostToPenalty ? 'hidden' : undefined, background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: lostToPenalty ? '8px 8px 8px' : '12px 8px 8px' }}>
              <AnimatePresence mode="wait" initial={false}>
                {betPlaced ? (
                  <motion.div key="awaiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <motion.div style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale }}>
                        <SoccerBallSVG size={64} />
                      </motion.div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Ожидаем результат...</p>
                    </div>
                    <div style={{ width: '100%', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', flexShrink: 0 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{placedBetRef.current.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.7 }}>{placedBetRef.current.odds}</span>
                    </div>
                  </motion.div>

                ) : betResult ? (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {BetResultArea()}
                  </motion.div>

                ) : (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, marginTop: 4, textAlign: 'center', lineHeight: '22px' }}>Что произойдет<br />раньше?</p>
                    <div style={{ width: '100%', marginTop: 'auto', paddingTop: 7, position: 'relative', zIndex: 11 }}>
                      <AnimatePresence mode="wait" initial={false}>
                        {activeBet ? (
                          <motion.div key="selected" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }} onPointerDown={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', pointerEvents: 'auto' }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{activeBet.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.8 }}>{activeBet.odds}</span>
                              <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer' }}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: goalOverlay ? 0.35 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: goalOverlay ? 'none' : undefined }}>
                            {windowEvents.map((btn, bi) => (
                              <div key={bi} onClick={() => onBet(btn.label, btn.odds)} onPointerDown={e => e.stopPropagation()}
                                style={{ width: '100%', height: 80, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', gap: 8, position: 'relative', cursor: 'pointer', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'linear-gradient(225deg, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents: 'none' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
                                  <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{btn.label}</span>
                                  {btn.hint && <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(145,250,186,0.55)', lineHeight: '12px' }}>{btn.hint}</span>}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', position: 'relative', flexShrink: 0 }}>{btn.odds}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.div animate={{ borderRadius: 32, opacity: betResult ? 0 : 1 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, boxShadow: glowBoxShadow }} />
            {betResult && betWasPlaced && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: (betWon || scBetWon) ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 40px 1px rgba(255,255,255,0.5), inset 0px 0px 40px 8px rgba(111,44,0,0.8)' }} />}
            {lostToPenalty && <motion.div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12, borderRadius: 32, boxShadow: penaltyGlowBoxShadow }} />}
          </div>
        </motion.div>
        {BetSheetContent()}
        </motion.div>
      </motion.div>
    );
  }

  if (card.type === 'line') {
    const lineEvents = [
      { label: 'Гол',     odds: '14.94', hint: 'гол раз в ~25 мин'    },
      { label: 'Угловой', odds: '8.34',  hint: 'угловой раз в ~8 мин' },
      { label: 'Фол',     odds: '2.21',  hint: 'фол раз в ~3 мин'     },
      { label: 'Аут',     odds: '1.75',  hint: 'аут раз в ~2 мин'     },
    ];
    const betWasPlaced = !!placedBetRef.current.label;
    return (
      <motion.div
        initial={false}
        animate={activeBet
          ? { width: isActive ? 328 : CARD_W, opacity: isActive ? 1 : 0, background: isActive ? '#171C1F' : 'rgba(0,0,0,0)', borderRadius: isActive ? '32px 32px 24px 24px' : 32 }
          : { width: CARD_W, opacity: 1, background: 'rgba(0,0,0,0)', borderRadius: 32 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ flexShrink: 0, overflow: 'hidden' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#171C1F', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            {TeamHeader()}
            {MediaSlot({})}
            <div style={{ height: lostToPenalty ? 246 : undefined, minHeight: (activeBet || betResult) ? 0 : 246, overflow: lostToPenalty ? 'hidden' : undefined, background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: lostToPenalty ? '8px 8px 8px' : '12px 8px 8px' }}>
              <AnimatePresence mode="wait" initial={false}>
                {betPlaced ? (
                  <motion.div key="awaiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <motion.div style={{ x: ballX, y: ballY, rotate: ballRotate, scale: ballScale }}>
                        <SoccerBallSVG size={64} />
                      </motion.div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Ожидаем результат...</p>
                    </div>
                    <div style={{ width: '100%', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', flexShrink: 0 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{placedBetRef.current.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.7 }}>{placedBetRef.current.odds}</span>
                    </div>
                  </motion.div>

                ) : betResult ? (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {BetResultArea()}
                  </motion.div>

                ) : (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, marginTop: 4, textAlign: 'center', lineHeight: '22px' }}>Что произойдет<br />раньше?</p>
                    <div style={{ width: '100%', marginTop: 'auto', paddingTop: 7, position: 'relative', zIndex: 11 }}>
                      <AnimatePresence mode="wait" initial={false}>
                        {activeBet ? (
                          <motion.div key="selected" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }} onPointerDown={e => e.stopPropagation()} style={{ position: 'relative', borderRadius: 24, height: 60, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', overflow: 'hidden', pointerEvents: 'auto' }}>
                            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{activeBet.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', opacity: 0.8 }}>{activeBet.odds}</span>
                              <div onPointerDown={e => e.stopPropagation()} onClick={onClearBet} style={{ cursor: 'pointer' }}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.15)"/><path d="M7 7L13 13M13 7L7 13" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: goalOverlay ? 0.35 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, pointerEvents: goalOverlay ? 'none' : undefined }}>
                            {lineEvents.map((btn, bi) => (
                              <div key={bi} onClick={() => onBet(btn.label, btn.odds)} onPointerDown={e => e.stopPropagation()}
                                style={{ width: 'calc(50% - 4px)', height: 80, background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', backdropFilter: 'blur(27px)', WebkitBackdropFilter: 'blur(27px)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'linear-gradient(225deg, rgba(255,255,255,0.07) 0%, transparent 40%)', pointerEvents: 'none' }} />
                                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', position: 'relative' }}>{btn.label}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', position: 'relative' }}>{btn.odds}</span>
                                {btn.hint && <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(145,250,186,0.55)', lineHeight: '12px', textAlign: 'center', padding: '0 6px', position: 'relative' }}>{btn.hint}</span>}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.div animate={{ borderRadius: 32, opacity: betResult ? 0 : 1 }} transition={{ duration: 0.25 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, boxShadow: glowBoxShadow }} />
            {betResult && betWasPlaced && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: betWon ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 40px 1px rgba(255,255,255,0.5), inset 0px 0px 40px 8px rgba(111,44,0,0.8)' }} />}
            {lostToPenalty && <motion.div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12, borderRadius: 32, boxShadow: penaltyGlowBoxShadow }} />}
          </div>
        </motion.div>
        {BetSheetContent()}
        </motion.div>
      </motion.div>
    );
  }

  if (false as never) { // dead: lineevent removed
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
        style={{ flexShrink: 0, overflow: 'hidden' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 0 0' : 32, background: '#171C1F' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#171C1F', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            {TeamHeader()}
            {MediaSlot({})}
            <div style={{ background: (sheetOpen && !betResult) ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: (sheetOpen && !betResult) ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 8px 8px', minHeight: (sheetOpen && !betResult) ? 0 : 268 }}>
              {betResult ? BetResultArea() : (
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
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, borderRadius: 32, boxShadow: betResult ? (betWon ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 40px 1px rgba(255,255,255,0.5), inset 0px 0px 40px 8px rgba(111,44,0,0.8)') : betPlaced ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : STATIC_GLOW }} />
          </div>
        </motion.div>
        {BetSheetContent()}
        </motion.div>
      </motion.div>
    );
  }

  if ((card.type as string) === 'penalty') {
    const round = PENALTY_SERIES[penaltyRoundIdx];
    const isLastRound = penaltyRoundIdx >= PENALTY_SERIES.length - 1;
    const resultScoreZ = penaltyScore.z + (round.team === 'Зенит' && round.scored ? 1 : 0);
    const resultScoreS = penaltyScore.s + (round.team === 'Спартак' && round.scored ? 1 : 0);
    const betWasPlaced = !!placedBetRef.current.label;

    const PenaltyTracker = ({ isResult }: { isResult?: boolean }) => {
      const zenitKicks   = PENALTY_SERIES.map((r, idx) => ({ ...r, i: idx })).filter(r => r.team === 'Зенит');
      const spartakKicks = PENALTY_SERIES.map((r, idx) => ({ ...r, i: idx })).filter(r => r.team === 'Спартак');
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 72, flexShrink: 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
                {kicks.map(kick => <Dot key={kick.i} kick={kick} />)}
              </div>
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
      placedBetRef.current = { label: '', betLabel: '', odds: '', amount: 0 };
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
        style={{ flexShrink: 0, overflow: 'hidden' }}
      >
        <motion.div
          animate={isExiting ? { y: -600, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={isExiting ? { duration: 0.38, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          onAnimationComplete={() => { if (isExiting) onExpire(); }}
        >
        <motion.div
          animate={{ borderRadius: sheetOpen ? '32px 32px 24px 24px' : 32, background: sheetOpen ? '#171C1F' : '#121214' }}
          transition={{ duration: 0.25 }}
          style={{ width: '100%', borderRadius: 32, background: '#171C1F', position: 'relative', overflow: 'hidden', scale: activeBet ? 1 : cardScale, opacity: activeBet ? 1 : cardOpacity, filter: activeBet ? 'grayscale(0)' : cardFilter, transformOrigin: origin }}
        >
          <div style={{ position: 'relative', isolation: 'isolate' }}>
            {TeamHeader()}
            <VideoBlock collapse />
            <div style={{ background: sheetOpen ? 'linear-gradient(#131214 calc(100% - 8px), #171C1F calc(100% - 8px))' : '#121214', borderRadius: sheetOpen ? 0 : '0 0 32px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px 8px', minHeight: 268 }}>

              {penaltySeriesOver ? (
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <PenaltyTracker isResult />
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
                  <div style={{ width: '100%', paddingTop: 6 }} onPointerDown={e => e.stopPropagation()}>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                      onClick={handleNextRound}
                      style={{ height: 56, background: 'transparent', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', cursor: 'pointer' }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                        {isLastRound ? 'Результат серии' : `Следующий удар · ${penaltyRoundIdx + 2}/${PENALTY_SERIES.length}`}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </motion.div>
                  </div>
                </motion.div>

              ) : (
                <>
                  <PenaltyTracker />
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0, marginTop: 16, textAlign: 'center', lineHeight: '22px' }}>Забьёт пенальти?</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <div style={{ width: 15, height: 15, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={round.team === 'Зенит' ? card.logo1 : card.logo2} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{round.team} бьёт · {round.player}</span>
                  </div>
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
                          {[{ label: 'Да', odds: round.oddsYes, pct: round.pct }, { label: 'Нет', odds: round.oddsNo, pct: (100 - parseInt(round.pct)) + '%' }].map((btn, bi) => (
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
            {!betResult && !penaltySeriesOver && <motion.div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11, borderRadius: 32, boxShadow: penaltyGlowBoxShadow }} />}
            {betResult && betWasPlaced && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12, borderRadius: 32, boxShadow: betWon ? 'inset 0px 0px 18px 0px rgba(255,255,255,0.18), inset 0px 8px 30px 2px rgba(7,113,48,0.38)' : 'inset 0px 0px 40px 1px rgba(255,255,255,0.5), inset 0px 0px 40px 8px rgba(111,44,0,0.8)' }} />}
          </div>
        </motion.div>
        {BetSheetContent()}
        </motion.div>
      </motion.div>
    );
  }

  return null;
}


export default function MicrobetLiveFootball() {
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

  type MatchPhase = 'first' | 'break' | 'second' | 'ended' | 'penalty';
  const [matchPhase, setMatchPhaseState] = useState<MatchPhase>('first');
  const [simSecs, setSimSecs] = useState(0);
  const [breakSecs, setBreakSecs] = useState(0);

  useEffect(() => {
    const HALF = 45 * 60;
    const BREAK = 15;
    const SPEED = 35;
    const id = setInterval(() => {
      setMatchPhaseState(phase => {
        if (phase === 'first') {
          setSimSecs(s => {
            const next = s + SPEED;
            if (next >= HALF) { setMatchPhaseState('break'); setBreakSecs(0); return HALF; }
            return next;
          });
        } else if (phase === 'break') {
          setBreakSecs(b => {
            if (b + 1 >= BREAK) { setMatchPhaseState('second'); setSimSecs(0); return 0; }
            return b + 1;
          });
        } else if (phase === 'second') {
          setSimSecs(s => {
            const next = s + SPEED;
            if (next >= HALF) { setMatchPhaseState('ended'); return HALF; }
            return next;
          });
        }
        return phase;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (matchPhase !== 'ended') return;
    const t = setTimeout(() => {
      setMatchPhaseState('penalty');
      if (!betInPlayRef.current) handleGoToPenalty();
    }, 1000);
    return () => clearTimeout(t);
  }, [matchPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoToPenalty = () => {
    const nc = [PENALTY_CARD] as CardData[];
    liveCardsRef.current = nc;
    setLiveCards(nc);
    vIdxRef.current = 1;
    x.set(getX(1));
    setVIdx(1);
    setSelectedBet(null);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const matchLabel = matchPhase === 'first'   ? `1 тайм ${fmt(simSecs)}`
                   : matchPhase === 'break'   ? 'Перерыв'
                   : matchPhase === 'second'  ? `2 тайм ${fmt(45 * 60 + simSecs)}`
                   : matchPhase === 'penalty' ? 'Серия пенальти'
                   :                           '2 тайм 90:00';

  const totalMatchSecs = matchPhase === 'first'  ? simSecs
                       : matchPhase === 'break'  ? 45 * 60
                       : matchPhase === 'second' ? 45 * 60 + simSecs
                       :                          90 * 60;
  const matchScore = totalMatchSecs >= 80 * 60 ? { z: 1, s: 1 }
                   : totalMatchSecs >= 35 * 60 ? { z: 1, s: 0 }
                   : { z: 0, s: 0 };

  const [selectedBet, setSelectedBet] = useState<{ label: string; odds: string; logo?: string } | null>(null);
  const betInPlayRef = useRef(false);
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

  const [scLocked, setScLocked] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [liveCards, setLiveCards] = useState<CardData[]>(() => [...CARDS]);
  const liveCardsRef = useRef<CardData[]>([...CARDS]);
  const liveN = liveCards.length;
  const liveNRef = useRef(liveN);
  liveNRef.current = liveN;
  const liveVirtual = liveN > 0 ? [liveCards[liveN - 1], ...liveCards, liveCards[0]] : [];

  const [vIdx, setVIdx] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [showTracker, setShowTracker] = useState(true);
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
    if (liveNRef.current <= 1 || selectedBet || scLocked) return;
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
    if (selectedBet || scLocked || liveN <= 1) return;
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

  return (
    <div style={{ minHeight: '100vh', background: '#111214', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", boxSizing: 'border-box' }}>
      <style>{`@keyframes cursor-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} } @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      <video ref={sharedVideoRef} src={`${BASE}/img/microbet-match.mp4`} autoPlay muted loop playsInline style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 0, left: 0 }} />

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
              style={{ display: 'flex', gap: GAP, x, cursor: (selectedBet || scLocked || liveN <= 1) ? 'default' : (dragging ? 'grabbing' : 'grab'), userSelect: 'none' }}
            >
              {liveVirtual.map((card, i) => {
                const isGhost = i === 0 || i === liveN + 1;
                const keyPrefix = i === 0 ? 'gl' : isGhost ? 'gf' : 'r';
                if ((liveN <= 1 || scLocked || selectedBet) && isGhost) return <div key={`${resetKey}-${keyPrefix}-empty`} style={{ width: CARD_W, flexShrink: 0 }} />;
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
                    onBetPlaced={() => { betInPlayRef.current = true; }}
                    onBetWon={() => {}}
                    onBetResult={(won, label, odds, amount, market) => {
                      betInPlayRef.current = false;
                      const pnl = won ? Math.round(amount * (parseFloat(odds) - 1)) : -amount;
                      setBetHistory(h => [{ id: historyIdRef.current++, won, label, odds, amount, market, pnl }, ...h]);
                      setBottomTab('history');
                    }}
                    showTracker={showTracker}
                    onToggleTracker={setShowTracker}
                    matchPhase={matchPhase}
                    matchLabel={matchLabel}
                    matchScore={matchScore}
                    totalMatchSecs={totalMatchSecs}
                    onGoToPenalty={handleGoToPenalty}
                    onScLock={locked => { if (!isGhost) setScLocked(locked); }}
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
            <div style={{ display: 'flex', height: 40, border: '1px solid #1B1A23', borderRadius: 9999, overflow: 'hidden', marginBottom: 10 }}>
              {(['stats', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  style={{ flex: 1, border: 'none', cursor: 'pointer', height: '100%', fontSize: 12, fontWeight: 600, transition: 'background 0.2s ease, color 0.2s ease', background: bottomTab === tab ? '#1B1A23' : 'transparent', color: bottomTab === tab ? '#ffffff' : '#929BAE', borderRadius: 9999 }}
                >
                  {tab === 'stats' ? 'Матч' : 'История'}
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
    </div>
  );
}
