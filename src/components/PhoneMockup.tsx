'use client';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PhoneMockupProps {
  children: ReactNode;
  delay?: number;
}

export default function PhoneMockup({ children, delay = 0 }: PhoneMockupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.33, 1, 0.68, 1] }}
      style={{
        position: 'relative',
        width: '320px',
        height: '652px',
        borderRadius: '52px',
        background: '#1a1a1c',
        boxShadow: '0 0 0 1.5px #3a3a3c, 0 0 0 3px #1a1a1c, 0 0 0 4.5px #3a3a3c, inset 0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      {/* Side buttons */}
      <div style={{ position: 'absolute', left: '-4px', top: '116px', width: '4px', height: '36px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', left: '-4px', top: '168px', width: '4px', height: '68px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', left: '-4px', top: '252px', width: '4px', height: '68px', background: '#3a3a3c', borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', right: '-4px', top: '192px', width: '4px', height: '100px', background: '#3a3a3c', borderRadius: '0 2px 2px 0' }} />

      {/* Screen area */}
      <div style={{
        position: 'absolute',
        inset: '10px',
        borderRadius: '44px',
        overflow: 'hidden',
        background: '#000',
      }}>
        {/* Dynamic Island */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '120px',
          height: '34px',
          background: '#000',
          borderRadius: '20px',
          zIndex: 10,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        }} />

        {/* Status bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '54px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          zIndex: 9,
        }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff', letterSpacing: '-0.3px' }}>13:26</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Signal */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill="white">
              <rect x="0" y="7" width="3" height="5" rx="1" opacity="0.4"/>
              <rect x="4.5" y="5" width="3" height="7" rx="1" opacity="0.6"/>
              <rect x="9" y="2.5" width="3" height="9.5" rx="1" opacity="0.8"/>
              <rect x="13.5" y="0" width="3" height="12" rx="1"/>
            </svg>
            {/* LTE */}
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>LTE</span>
            {/* Battery */}
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" strokeOpacity="0.35"/>
              <rect x="2" y="2" width="16" height="8" rx="2" fill="white"/>
              <path d="M23 4v4a2 2 0 0 0 0-4Z" fill="white" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        {children}
      </div>
    </motion.div>
  );
}
