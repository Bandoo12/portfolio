'use client';
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const COLOR = '#FF3F00';

export default function CustomCursor() {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);

  const rx = useSpring(mx, { stiffness: 75, damping: 22, mass: 0.7 });
  const ry = useSpring(my, { stiffness: 75, damping: 22, mass: 0.7 });

  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => { mx.set(e.clientX); my.set(e.clientY); };

    const over = (e: MouseEvent) => {
      if ((e.target as Element).closest('a, button')) setHover(true);
    };
    const out = (e: MouseEvent) => {
      if ((e.target as Element).closest('a, button')) setHover(false);
    };
    const down = () => setPress(true);
    const up = () => setPress(false);

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    window.addEventListener('mouseout', out);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      window.removeEventListener('mouseout', out);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [mx, my]);

  return (
    <>
      {/* Outer ring — spring lag */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          x: rx,
          y: ry,
          translateX: '-50%',
          translateY: '-50%',
          borderRadius: '50%',
          border: `1.5px solid ${COLOR}`,
          pointerEvents: 'none',
          zIndex: 9998,
        }}
        animate={{
          width: hover ? 56 : 36,
          height: hover ? 56 : 36,
          backgroundColor: hover ? 'rgba(255,63,0,0.12)' : 'rgba(0,0,0,0)',
          opacity: press ? 0.6 : 1,
        }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      />

      {/* Inner dot — exact position */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          x: mx,
          y: my,
          translateX: '-50%',
          translateY: '-50%',
          borderRadius: '50%',
          backgroundColor: COLOR,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
        animate={{
          width: press ? 5 : 8,
          height: press ? 5 : 8,
        }}
        transition={{ duration: 0.08 }}
      />
    </>
  );
}
