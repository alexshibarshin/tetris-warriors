import React from 'react';
import { WARRIOR_TEXT_COLORS } from '../config';

export function WarriorVisual({ colorIdx, className = '' }: { colorIdx: number, className?: string }) {
  const textColor = WARRIOR_TEXT_COLORS[colorIdx] || 'text-gray-500';
  return (
    <div className={`flex items-center justify-center ${textColor} ${className}`}>
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_4px_5px_rgba(0,0,0,0.7)] overflow-visible">
        <g stroke="rgba(0,0,0,0.6)" strokeWidth="5" strokeLinejoin="round">
          {/* Body */}
          <path d="M 28,45 C 28,25 72,25 72,45 L 94,95 A 44 14 0 0 1 8 92 Z" fill="currentColor" />
          {/* Head */}
          <circle cx="50" cy="28" r="20" fill="#fde68a" />
        </g>
      </svg>
    </div>
  );
}
