import React from 'react';
import { WARRIOR_TEXT_COLORS } from '../config';
import { EnemyThemeId } from '../game/stageTheme';

export function EnemyVisual({ colorIdx, theme = 'horde', signature = false, className = '' }: {
  colorIdx: number | null; theme?: EnemyThemeId; signature?: boolean; className?: string;
}) {
  const textColor = colorIdx === null ? 'text-gray-400' : (WARRIOR_TEXT_COLORS[colorIdx] || 'text-gray-500');
  const eye = signature ? '#fde047' : '#ef4444';
  const scale = signature ? 'scale-110' : '';
  return (
    <div className={`flex items-center justify-center ${textColor} ${scale} ${className}`}>
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_4px_5px_rgba(0,0,0,.7)] overflow-visible">
        <g stroke="rgba(0,0,0,.65)" strokeWidth="4" strokeLinejoin="round">
          <path d={theme === 'rush' ? 'M50 22 91 72 66 108 34 108 9 72Z' : 'M50 28 90 60 75 105 25 105 10 60Z'} fill="currentColor" />
          {theme === 'armor' && <path d="M18 56 31 38h38l13 18-10 44H28Z" fill="#64748b" opacity=".8" />}
          {theme === 'regen' && <path d="M50 46c24 0 27 38 0 55-27-17-24-55 0-55Z" fill="#22c55e" opacity=".5" />}
          {theme === 'backline' && signature && <path d="M72 27v70M72 27Q94 61 72 96" fill="none" stroke="#fca5a5" strokeWidth="6" />}
          {theme === 'elite' && <path d="M18 55 7 35 29 44M82 55l11-20-22 9" fill="#a3a3a3" />}
          {theme === 'horde' && <path d="m22 58-16 7 16 8M78 58l16 7-16 8" fill="#d4d4d4" />}
          <polygon points="50,7 76,27 65,51 35,51 24,27" fill={signature ? '#171717' : '#333'} />
          <circle cx="40" cy="31" r="4" fill={eye} stroke="none" />
          <circle cx="60" cy="31" r="4" fill={eye} stroke="none" />
          {signature && <path d="M31 18 18 3 27 28M69 18 82 3 73 28" fill="none" stroke="#fbbf24" strokeWidth="5" />}
        </g>
      </svg>
    </div>
  );
}
