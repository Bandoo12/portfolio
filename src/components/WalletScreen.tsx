'use client';
import { motion } from 'framer-motion';

interface WalletScreenProps {
  subtitle?: string;
  title?: string;
}

export default function WalletScreen({ subtitle = 'Some Subtitle', title = 'Wallet' }: WalletScreenProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: '#000',
      padding: '72px 24px 32px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.33, 1, 0.68, 1] }}
            style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', letterSpacing: '0.01em' }}
          >
            {subtitle}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.45, ease: [0.33, 1, 0.68, 1] }}
            style={{ fontSize: '28px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}
          >
            {title}
          </motion.h2>
        </div>

        {/* Holographic card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.55, ease: [0.33, 1, 0.68, 1] }}
          style={{
            width: '72px',
            height: '48px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #e8d5f0 0%, #c5d8f5 30%, #b8e8d8 60%, #f5e0c8 100%)',
            boxShadow: '0 4px 16px rgba(180,160,220,0.35)',
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}
