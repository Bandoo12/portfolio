'use client';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

interface RevealTextProps {
  children: string;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}

export default function RevealText({ children, className, style, delay = 0 }: RevealTextProps) {
  const words = children.split(' ');
  const ease: [number, number, number, number] = [0.33, 1, 0.68, 1];

  return (
    <motion.span
      className={className}
      style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0 0.28em', ...style }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: '-80px' }}
    >
      {words.map((word, i) => (
        <span key={i} style={{ overflow: 'hidden', display: 'inline-block', lineHeight: 'inherit' }}>
          <motion.span
            style={{ display: 'inline-block', lineHeight: 'inherit' }}
            variants={{
              hidden: { y: '105%', opacity: 0 },
              visible: {
                y: '0%',
                opacity: 1,
                transition: {
                  duration: 0.7,
                  delay: delay + i * 0.055,
                  ease,
                },
              },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
