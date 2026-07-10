import React from 'react';
import { WARRIOR_TEXT_COLORS } from '../config';

export function WarriorVisual({
  colorIdx,
  tier = 1,
  className = '',
}: {
  colorIdx: number;
  tier?: number;
  className?: string;
}) {
  const textColor = WARRIOR_TEXT_COLORS[colorIdx] || 'text-gray-500';
  const auraOpacity = tier >= 4 ? 'opacity-100' : tier === 3 ? 'opacity-85' : tier === 2 ? 'opacity-60' : 'opacity-15';
  const auraScale = tier >= 4 ? 'scale-125' : tier === 3 ? 'scale-115' : tier === 2 ? 'scale-105' : 'scale-100';
  const crestFill = tier >= 4 ? '#fde68a' : tier === 3 ? '#fcd34d' : tier === 2 ? '#f59e0b' : '#fef3c7';
  const mantleFill = tier >= 4 ? 'rgba(253,230,138,0.42)' : tier === 3 ? 'rgba(252,211,77,0.26)' : tier === 2 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)';
  const outline = 'rgba(0,0,0,0.6)';
  const bodyShadow = tier >= 4 ? 'drop-shadow-[0_0_16px_rgba(250,204,21,0.55)]' : tier === 3 ? 'drop-shadow-[0_0_12px_rgba(250,204,21,0.35)]' : 'drop-shadow-[0_4px_5px_rgba(0,0,0,0.7)]';

  return (
    <div className={`relative flex items-center justify-center ${textColor} ${className}`}>
      <div className={`absolute inset-2 rounded-full bg-yellow-300/25 blur-md transition-opacity transition-transform ${auraOpacity} ${auraScale}`} />
      <svg viewBox="0 0 100 120" className={`w-full h-full overflow-visible ${bodyShadow}`}>
        <g stroke={outline} strokeWidth="5" strokeLinejoin="round">
          {tier >= 3 && <path d="M 21,56 L 10,75 L 28,79 L 31,60 Z" fill={crestFill} />}
          {tier >= 3 && <path d="M 79,56 L 90,75 L 72,79 L 69,60 Z" fill={crestFill} />}
          {tier >= 4 && <path d="M 18,45 L 8,59 L 20,67 L 28,52 Z" fill="rgba(255,255,255,0.28)" />}
          {tier >= 4 && <path d="M 82,45 L 92,59 L 80,67 L 72,52 Z" fill="rgba(255,255,255,0.28)" />}
          {tier >= 4 && <ellipse cx="50" cy="17" rx="28" ry="8" fill="rgba(253,224,71,0.24)" strokeWidth="3" />}
          <path d="M 24,96 L 35,54 L 65,54 L 76,96 Q 50,113 24,96 Z" fill={mantleFill} />
          <path d="M 28,45 C 28,25 72,25 72,45 L 94,95 A 44 14 0 0 1 8 92 Z" fill="currentColor" />
          {tier >= 3 && <path d="M 22,54 L 36,46 L 42,60 L 26,68 Z" fill="rgba(255,255,255,0.2)" strokeWidth="4" />}
          {tier >= 3 && <path d="M 78,54 L 64,46 L 58,60 L 74,68 Z" fill="rgba(255,255,255,0.2)" strokeWidth="4" />}
          {tier >= 2 && <path d="M 44,56 L 50,61 L 56,56 L 56,82 L 44,82 Z" fill="rgba(255,255,255,0.12)" strokeWidth="4" />}
          {tier >= 3 && <path d="M 35,47 L 50,39 L 65,47 L 59,63 L 41,63 Z" fill={crestFill} strokeWidth="4" />}
          {tier >= 4 && <path d="M 31,41 L 50,30 L 69,41 L 62,59 L 38,59 Z" fill="rgba(255,255,255,0.22)" strokeWidth="4" />}
          <circle cx="50" cy="28" r="20" fill="#fde68a" />
          {tier >= 2 && <path d="M 50,6 L 57,17 L 50,22 L 43,17 Z" fill={crestFill} strokeWidth="3" />}
          {tier >= 3 && <path d="M 38,13 L 44,21 L 38,25 L 32,18 Z" fill={crestFill} strokeWidth="3" />}
          {tier >= 3 && <path d="M 62,13 L 68,18 L 62,25 L 56,21 Z" fill={crestFill} strokeWidth="3" />}
          {tier >= 4 && <path d="M 33,10 L 39,0 L 46,12 L 40,17 Z" fill="#fef3c7" strokeWidth="3" />}
          {tier >= 4 && <path d="M 50,0 L 56,12 L 50,18 L 44,12 Z" fill="#fde68a" strokeWidth="3" />}
          {tier >= 4 && <path d="M 67,10 L 60,17 L 54,12 L 61,0 Z" fill="#fef3c7" strokeWidth="3" />}
        </g>
      </svg>
    </div>
  );
}
