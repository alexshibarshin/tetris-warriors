import { motion } from 'motion/react';
import { BoosterType } from '../game/types';

export function BoosterVisual({ type, className = '' }: { type: BoosterType; className?: string }) {
  const common = `relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border shadow-[0_0_14px_rgba(255,255,255,0.22)] ${className}`;

  if (type === 'cross') {
    return <div className={`${common} border-cyan-100/80 bg-cyan-500/25`} title="Крестовой бустер — активирует строку и столбец">
      <div className="absolute h-[18%] w-[88%] rounded-full bg-cyan-100 shadow-[0_0_10px_rgba(34,211,238,1)]" />
      <div className="absolute h-[88%] w-[18%] rounded-full bg-cyan-100 shadow-[0_0_10px_rgba(34,211,238,1)]" />
      <div className="h-[29%] w-[29%] rounded-full border-2 border-white bg-cyan-300 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
    </div>;
  }

  if (type === 'bomb') {
    return <div className={`${common} border-orange-100/80 bg-orange-500/30`} title="Бомба — активирует объекты в радиусе 2 клеток">
      <motion.div animate={{ scale: [0.84, 1.08, 0.84] }} transition={{ duration: 1.1, repeat: Infinity }} className="h-[62%] w-[62%] rounded-full border-2 border-orange-100 bg-gradient-to-br from-yellow-200 via-orange-500 to-rose-700 shadow-[0_0_16px_rgba(251,146,60,0.9)]" />
      <div className="absolute right-[20%] top-[17%] h-[16%] w-[16%] rounded-full bg-yellow-100 shadow-[0_0_7px_white]" />
      <div className="absolute left-[17%] top-[13%] h-[27%] w-[27%] rotate-[-25deg] border-t-2 border-orange-100/80" />
    </div>;
  }

  return <div className={`${common} border-fuchsia-100/85 bg-violet-500/25`} title="Цветовой бустер — активирует воинов затронутых цветов">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }} className="h-[70%] w-[70%] rounded-full border-[5px] border-transparent [background:linear-gradient(#6d28d9,#6d28d9)_padding-box,conic-gradient(#ef4444,#facc15,#22c55e,#3b82f6,#a855f7,#ef4444)_border-box] shadow-[0_0_15px_rgba(192,38,211,0.9)]" />
    <div className="absolute h-[22%] w-[22%] rounded-full bg-white shadow-[0_0_12px_white]" />
  </div>;
}

export function BoosterActivationEffect({ type, chromaColorIndices }: { type: BoosterType; chromaColorIndices: number[] }) {
  const hue = chromaColorIndices.length ? 'border-fuchsia-100 bg-fuchsia-300/25' : 'border-white bg-white/20';
  if (type === 'cross') return <motion.div initial={{ scale: 0.1, opacity: 1 }} animate={{ scale: 2.8, opacity: 0 }} transition={{ duration: 0.65 }} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"><div className="absolute h-1 w-[260%] bg-cyan-200 shadow-[0_0_18px_5px_rgba(34,211,238,0.85)]" /><div className="absolute h-[260%] w-1 bg-cyan-200 shadow-[0_0_18px_5px_rgba(34,211,238,0.85)]" /></motion.div>;
  if (type === 'bomb') return <motion.div initial={{ scale: 0.25, opacity: 1 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-[17%] z-30 rounded-full border-4 border-orange-100 bg-orange-400/30 shadow-[0_0_24px_9px_rgba(251,146,60,0.8)] pointer-events-none" />;
  return <motion.div initial={{ scale: 0.2, rotate: 0, opacity: 1 }} animate={{ scale: 3, rotate: 220, opacity: 0 }} transition={{ duration: 0.75 }} className={`absolute inset-[12%] z-30 rounded-full border-4 ${hue} shadow-[0_0_24px_9px_rgba(192,38,211,0.85)] pointer-events-none`} />;
}
